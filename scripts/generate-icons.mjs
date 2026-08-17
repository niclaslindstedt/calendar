#!/usr/bin/env node
// Generate the PWA install icons, the favicon, and the social-preview image
// from the same geometry as public/icons/icon.svg — a stylised calendar page
// (two thin hanger pins, a solid header band, a thin frame around a grid of
// day cells with one marked day) in mint green on a near-black tile, the
// family look the sibling checklist and notes apps wear on a home screen.
// Pure Node (zlib + a minimal PNG encoder), so the pipeline
// needs no native image dependencies. Rerun with `npm run icons` /
// `make icons` after changing the mark.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

// The mark's palette — the near-black tile and the mint green of the glyph.
// Kept in lockstep with the fills in public/icons/icon.svg.
const INK = [27, 32, 39]; // #1b2027
const GREEN = [111, 227, 163]; // #6fe3a3
const MUTED = [122, 134, 148]; // #7a8694 — only the OG card's body bars

// --- minimal PNG encoder ----------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Pack already-encoded PNG blobs into a single ICONDIR (a .ico file).
function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // resource type: icon
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = header.length + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const e = dir.subarray(i * 16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- the mark ----------------------------------------------------------------

// Sub-pixel sample offsets, used on both axes (a 4×4 grid per pixel).
const SAMPLES = [1 / 8, 3 / 8, 5 / 8, 7 / 8];

// The mark in unit space, mirroring the rects in public/icons/icon.svg
// (divided by 100). The page is filled, the panel is punched back out to the
// tile colour, and the day cells sit inside the hole.
const HANGER_L = [0.31, 0.09, 0.37, 0.25, 0.03];
const HANGER_R = [0.63, 0.09, 0.69, 0.25, 0.03];
const BODY = [0.14, 0.21, 0.86, 0.9, 0.1];
const PANEL = [0.19, 0.38, 0.81, 0.85, 0.05];
const DAY = [0.3683, 0.55, 0.4983, 0.68, 0.03];

// The dimmed day cells: a 4×3 grid, minus the slot the marked day occupies.
// Dim factor kept in lockstep with the group's fill-opacity in the SVG.
const CELL_DIM = 0.45;
const CELL_COLS = [0.26, 0.3933, 0.5267, 0.66];
const CELL_ROWS = [0.44, 0.575, 0.71];
const CELLS = CELL_ROWS.flatMap((y, row) =>
  CELL_COLS.filter((_, col) => !(row === 1 && col === 1)).map((x) => [
    x,
    y,
    x + 0.08,
    y + 0.08,
    0.02,
  ]),
);

// Inside a rounded rectangle, from the signed distance at (x, y). Sampling the
// sign 4×4 per pixel is what antialiases the mark's curves down to 16 px.
function inRoundRect(x, y, [x0, y0, x1, y1, r]) {
  const qx = Math.abs(x - (x0 + x1) / 2) - ((x1 - x0) / 2 - r);
  const qy = Math.abs(y - (y0 + y1) / 2) - ((y1 - y0) / 2 - r);
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
      Math.min(Math.max(qx, qy), 0) -
      r <
    0
  );
}

// Green strength at unit-space point (x, y): 1 for the glyph proper (pins,
// header band, frame, marked day), CELL_DIM for the dimmed day cells, 0 for
// the tile.
function markAt(x, y) {
  const onPage =
    inRoundRect(x, y, BODY) ||
    inRoundRect(x, y, HANGER_L) ||
    inRoundRect(x, y, HANGER_R);
  if (!onPage) return 0;
  // Inside the punched-out grid area only the day cells survive.
  if (inRoundRect(x, y, PANEL)) {
    if (inRoundRect(x, y, DAY)) return 1;
    for (const cell of CELLS) if (inRoundRect(x, y, cell)) return CELL_DIM;
    return 0;
  }
  return 1;
}

// Render size×size RGBA: the dark rounded tile carrying the green glyph.
// `pad` insets the mark for the maskable safe zone; `radius` rounds the tile
// corners (0 = square).
function renderIcon(size, { pad = 0, radius = 0.18 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = radius * size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      // Rounded-rect tile coverage from the signed distance at the pixel
      // centre (negative inside).
      const qx = Math.abs(px + 0.5 - size / 2) - (size / 2 - r);
      const qy = Math.abs(py + 0.5 - size / 2) - (size / 2 - r);
      const outside =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        r;
      const bgAlpha = Math.max(0, Math.min(1, 0.5 - outside));
      // Glyph coverage, 4×4 supersampled so the pins' caps, the thin frame
      // and the day cells stay clean down to 16 px.
      let hit = 0;
      const unit = 1 / (SAMPLES.length * SAMPLES.length);
      for (const oy of SAMPLES) {
        for (const ox of SAMPLES) {
          const sx = ((px + ox) / size - pad) / (1 - 2 * pad);
          const sy = ((py + oy) / size - pad) / (1 - 2 * pad);
          hit += markAt(sx, sy) * unit;
        }
      }
      rgba[i] = Math.round(INK[0] + (GREEN[0] - INK[0]) * hit);
      rgba[i + 1] = Math.round(INK[1] + (GREEN[1] - INK[1]) * hit);
      rgba[i + 2] = Math.round(INK[2] + (GREEN[2] - INK[2]) * hit);
      rgba[i + 3] = Math.round(bgAlpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

// The 1200×630 Open Graph card: the calendar mark on the left, title bars on
// the right, on the same near-black ground the tile is cut from.
function renderOg() {
  const w = 1200;
  const h = 630;
  const rgba = Buffer.alloc(w * h * 4);
  const markSize = 420;
  const markX = 130;
  const markY = (h - markSize) / 2;
  const rows = [
    { x: 640, y: 210, w: 400, h: 30, c: GREEN },
    { x: 640, y: 290, w: 330, h: 18, c: MUTED },
    { x: 640, y: 340, w: 370, h: 18, c: MUTED },
    { x: 640, y: 390, w: 290, h: 18, c: MUTED },
  ];
  const unit = 1 / (SAMPLES.length * SAMPLES.length);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      let [cr, cg, cb] = INK;
      if (
        px >= markX &&
        px < markX + markSize &&
        py >= markY &&
        py < markY + markSize
      ) {
        let hit = 0;
        for (const oy of SAMPLES) {
          for (const ox of SAMPLES) {
            const sx = (px + ox - markX) / markSize;
            const sy = (py + oy - markY) / markSize;
            hit += markAt(sx, sy) * unit;
          }
        }
        cr = Math.round(cr + (GREEN[0] - cr) * hit);
        cg = Math.round(cg + (GREEN[1] - cg) * hit);
        cb = Math.round(cb + (GREEN[2] - cb) * hit);
      }
      for (const rrow of rows) {
        if (
          px >= rrow.x &&
          px < rrow.x + rrow.w &&
          py >= rrow.y &&
          py < rrow.y + rrow.h
        ) {
          [cr, cg, cb] = rrow.c;
        }
      }
      rgba[i] = cr;
      rgba[i + 1] = cg;
      rgba[i + 2] = cb;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(w, h, rgba);
}

writeFileSync(join(iconsDir, "pwa-192.png"), renderIcon(192));
writeFileSync(join(iconsDir, "pwa-512.png"), renderIcon(512));
writeFileSync(
  join(iconsDir, "pwa-512-maskable.png"),
  renderIcon(512, { pad: 0.1, radius: 0 }),
);
writeFileSync(
  join(iconsDir, "apple-touch-icon-180.png"),
  renderIcon(180, { radius: 0 }),
);
writeFileSync(join(root, "public", "og.png"), renderOg());

// favicon.ico — the browser-tab fallback for engines that ignore the SVG
// favicon and for the implicit /favicon.ico request.
writeFileSync(
  join(root, "public", "favicon.ico"),
  encodeIco([16, 32, 48].map((size) => ({ size, data: renderIcon(size) }))),
);
console.log(
  "icons: wrote pwa-192/512/512-maskable, apple-touch-180, og.png, favicon.ico",
);

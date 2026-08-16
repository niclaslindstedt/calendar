#!/usr/bin/env node
// Generate the PWA install icons, the favicon, and the social-preview image
// from the same geometry as public/icons/icon.svg — a paper wall-calendar
// card: red month band on top, a light day grid below, one red day. Pure Node
// (zlib + a minimal PNG encoder), so the pipeline needs no native image
// dependencies. Rerun with `npm run icons` / `make icons` after changing the
// mark.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

// The mark's palette — warm calendar paper, the classic red-day red, soft
// grid ink. Kept in lockstep with the fills in public/icons/icon.svg.
const PAPER = [246, 242, 234]; // #f6f2ea
const RED = [193, 44, 38]; // #c12c26
const GRID = [214, 207, 194]; // #d6cfc2

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

// The day grid in unit space: 7 columns × 5 rows of squares under the month
// band, with one red day (Sunday of week 3 — the rightmost column, matching
// the red-Sundays convention the app renders).
const GRID_X0 = 0.1;
const GRID_X1 = 0.9;
const GRID_Y0 = 0.42;
const GRID_Y1 = 0.9;
const COLS = 7;
const ROWS = 5;
const GAP = 0.25; // fraction of a cell left as gutter
const RED_DAY = { col: 6, row: 2 };

// The colour of unit-space point (x, y) on the mark, or null for paper.
function markColor(x, y) {
  // The month band.
  if (y >= 0.1 && y <= 0.3 && x >= GRID_X0 && x <= GRID_X1) return RED;
  // The day grid.
  if (x < GRID_X0 || x > GRID_X1 || y < GRID_Y0 || y > GRID_Y1) return null;
  const cw = (GRID_X1 - GRID_X0) / COLS;
  const ch = (GRID_Y1 - GRID_Y0) / ROWS;
  const col = Math.min(COLS - 1, Math.floor((x - GRID_X0) / cw));
  const row = Math.min(ROWS - 1, Math.floor((y - GRID_Y0) / ch));
  const fx = (x - GRID_X0 - col * cw) / cw;
  const fy = (y - GRID_Y0 - row * ch) / ch;
  if (fx > 1 - GAP || fy > 1 - GAP) return null; // gutter
  return col === RED_DAY.col && row === RED_DAY.row ? RED : GRID;
}

// Render size×size RGBA: a paper rounded square carrying the mark. `pad`
// insets the mark for the maskable safe zone; `radius` rounds the paper
// corners (0 = square).
function renderIcon(size, { pad = 0, radius = 0.18 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = radius * size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      // Rounded-rect background coverage from the signed distance at the
      // pixel centre (negative inside).
      const qx = Math.abs(px + 0.5 - size / 2) - (size / 2 - r);
      const qy = Math.abs(py + 0.5 - size / 2) - (size / 2 - r);
      const outside =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        r;
      const bgAlpha = Math.max(0, Math.min(1, 0.5 - outside));
      // Mark coverage, 4×4 supersampled per colour so the band and grid edges
      // stay crisp down to 16 px.
      let hitRed = 0;
      let hitGrid = 0;
      const unit = 1 / (SAMPLES.length * SAMPLES.length);
      for (const oy of SAMPLES) {
        for (const ox of SAMPLES) {
          const sx = ((px + ox) / size - pad) / (1 - 2 * pad);
          const sy = ((py + oy) / size - pad) / (1 - 2 * pad);
          const c = markColor(sx, sy);
          if (c === RED) hitRed += unit;
          else if (c === GRID) hitGrid += unit;
        }
      }
      let [cr, cg, cb] = PAPER;
      cr += (RED[0] - cr) * hitRed + (GRID[0] - cr) * hitGrid;
      cg += (RED[1] - cg) * hitRed + (GRID[1] - cg) * hitGrid;
      cb += (RED[2] - cb) * hitRed + (GRID[2] - cb) * hitGrid;
      rgba[i] = Math.round(cr);
      rgba[i + 1] = Math.round(cg);
      rgba[i + 2] = Math.round(cb);
      rgba[i + 3] = Math.round(bgAlpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

// The 1200×630 Open Graph card: the calendar mark on the left, title bars on
// the right, on the paper ground.
function renderOg() {
  const w = 1200;
  const h = 630;
  const rgba = Buffer.alloc(w * h * 4);
  const markSize = 420;
  const markX = 130;
  const markY = (h - markSize) / 2;
  const rows = [
    { x: 640, y: 210, w: 400, h: 30, c: RED, a: 1 },
    { x: 640, y: 290, w: 330, h: 18, c: GRID, a: 1 },
    { x: 640, y: 340, w: 370, h: 18, c: GRID, a: 1 },
    { x: 640, y: 390, w: 290, h: 18, c: GRID, a: 1 },
  ];
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      let [cr, cg, cb] = PAPER;
      if (
        px >= markX &&
        px < markX + markSize &&
        py >= markY &&
        py < markY + markSize
      ) {
        const c = markColor((px - markX) / markSize, (py - markY) / markSize);
        if (c) [cr, cg, cb] = c;
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

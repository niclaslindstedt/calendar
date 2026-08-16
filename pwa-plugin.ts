// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { statSync, readdirSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

import type { HtmlTagDescriptor, Plugin, ResolvedConfig } from "vite";

import { cacheIdForBase } from "./src/app/pwa.ts";

// Hand-rolls the app's service worker at build time so the deployed app is an
// installable, self-updating PWA. We deliberately avoid `vite-plugin-pwa` /
// Workbox: the framework's `usePwaUpdate` hook only needs three files and one
// cache-naming convention, which is cheaper to emit by hand than to pull a
// Workbox toolchain in for. Mirrors the sibling contacts app's plugin.
//
// What the hook expects, and what we therefore emit:
//   - `${base}sw.js`                  a "prompt to update" worker (installs,
//                                     parks in `waiting`, never auto-skips)
//   - `${base}version.json`           `{ version }` shown in the toast
//   - `${base}precache-manifest.json` `{ totalBytes, assets }` driving the fill
//   - a Cache Storage entry named `<cacheId>-precache`

type AppPwaOptions = {
  // The bundler base (`/` locally, `/calendar/` on GitHub Pages). Drives the
  // SW scope, the emitted file URLs, and — via `cacheIdForBase` — the
  // precache name.
  base: string;
  // Label shown in the "a new version is ready" toast. Embedding it in the SW
  // also guarantees the worker's bytes differ between deploys even when no
  // asset hash changed.
  version: string;
};

// Public assets we never want in the precache: the SEO files are for
// crawlers, not the app shell.
const PUBLIC_SKIP = new Set([
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "og.png",
]);

// Build the web app manifest for a given deploy base. Emitted per build
// rather than shipped as a static `public/` file so `id`, `start_url`,
// `scope`, and the icon `src`s stay base-correct — some engines resolve them
// relative to the *origin*, not the manifest URL.
export function buildManifest(base: string): string {
  const manifest = {
    name: "Calendar — a wall calendar that doesn't nag",
    short_name: "Calendar",
    description:
      "A local-first wall-calendar PWA: monthly view with week numbers and " +
      "name days (UK & Sweden), a week planner, per-day notes, and storage " +
      "backends you control.",
    id: base,
    start_url: base,
    scope: base,
    display: "standalone",
    orientation: "any",
    background_color: "#f6f2ea",
    theme_color: "#f6f2ea",
    icons: [
      {
        src: `${base}icons/pwa-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}icons/pwa-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}icons/pwa-512-maskable.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

export function buildServiceWorker(
  cacheId: string,
  base: string,
  version: string,
  precache: string[],
): string {
  const cacheName = `${cacheId}-precache`;
  return `// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// GENERATED — do not edit. Emitted by pwa-plugin.ts for the Calendar PWA.
// A minimal "prompt to update" precaching worker: it installs the build's
// assets, parks in \`waiting\` (never auto-skipWaiting — a silent swap would
// discard an in-progress edit), and applies on a SKIP_WAITING message from the
// framework's update toast. Build: ${version}
const CACHE = ${JSON.stringify(cacheName)};
const BASE = ${JSON.stringify(base)};
const INDEX = ${JSON.stringify(`${base}index.html`)};
const PRECACHE = ${JSON.stringify(precache)};
const PRECACHE_PATHS = new Set(
  PRECACHE.map((u) => new URL(u, self.location.href).pathname),
);

self.addEventListener("install", (event) => {
  // Populate the precache one entry at a time so the window-side progress
  // poller (usePwaUpdate) watches the fill advance as bytes land. No
  // skipWaiting: park in \`waiting\` until the user accepts the prompt.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const url of PRECACHE) {
        try {
          await cache.add(new Request(url, { cache: "reload" }));
        } catch {
          // A single asset failing to cache must not abort the whole install.
        }
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Drop precache entries from older builds that are no longer wanted.
      for (const req of await cache.keys()) {
        if (!PRECACHE_PATHS.has(new URL(req.url).pathname)) {
          await cache.delete(req);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// The app-shell navigation handler. Network-first: fetch the freshly-deployed
// shell — bypassing the HTTP cache with \`reload\` — refresh the offline copy
// from it, and fall back to the precached shell only when the network is
// unreachable. The build's assets are content-hashed, so a fresh shell pulls
// its new bundle in on its own; the worker swap (SKIP_WAITING) still gates
// the precache, not this read.
async function navigateFallback(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(new Request(INDEX, { cache: "reload" }));
    if (fresh && fresh.ok) {
      cache.put(INDEX, fresh.clone());
      return fresh;
    }
  } catch {
    // Offline — serve the precached shell below.
  }
  return (await cache.match(INDEX)) || fetch(req).catch(() => cache.match(INDEX));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App-shell navigations: only our own routes get the shell fallback.
  if (req.mode === "navigate") {
    if (!url.pathname.startsWith(BASE)) return;
    event.respondWith(navigateFallback(req));
    return;
  }

  // Precached assets: cache-first (they are content-hashed, so safe to pin).
  if (PRECACHE_PATHS.has(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || fetch(req);
      })(),
    );
  }
});
`;
}

export function appPwa({ base, version }: AppPwaOptions): Plugin {
  const cacheId = cacheIdForBase(base);
  let config: ResolvedConfig;

  return {
    name: "app-pwa",
    apply: "build",
    // Run after Vite's own build plugins so the generated `index.html` is
    // already in the bundle when we collect assets for the precache.
    enforce: "post",

    configResolved(resolved) {
      config = resolved;
    },

    // Wire the manifest, theme color, and apple-touch metadata into the shell.
    // Done here (not in index.html) so the hrefs stay base-correct from one
    // source of truth regardless of the configured `base`.
    transformIndexHtml(): HtmlTagDescriptor[] {
      return [
        {
          tag: "link",
          attrs: { rel: "manifest", href: `${base}manifest.webmanifest` },
          injectTo: "head",
        },
        // The raster fallback first: engines that don't honour the SVG favicon
        // (Safari, crawlers) and the implicit /favicon.ico probe pick this up,
        // while modern browsers prefer the typed SVG below.
        {
          tag: "link",
          attrs: { rel: "icon", href: `${base}favicon.ico`, sizes: "32x32" },
          injectTo: "head",
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/svg+xml",
            href: `${base}icons/icon.svg`,
          },
          injectTo: "head",
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            href: `${base}icons/apple-touch-icon-180.png`,
          },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "theme-color", content: "#f6f2ea" },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "apple-mobile-web-app-capable", content: "yes" },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: {
            name: "apple-mobile-web-app-status-bar-style",
            content: "default",
          },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "apple-mobile-web-app-title", content: "Calendar" },
          injectTo: "head",
        },
      ];
    },

    // After the bundle is built, collect every emitted asset plus the public
    // assets and emit the worker + the two manifests the hook reads.
    generateBundle(_options, bundle) {
      const assets: Record<string, number> = {};

      const add = (urlPath: string, bytes: number) => {
        assets[urlPath] = bytes;
      };

      // Hashed build output (JS, CSS, the HTML shell, any emitted assets).
      for (const [fileName, output] of Object.entries(bundle)) {
        const bytes =
          output.type === "chunk"
            ? Buffer.byteLength(output.code)
            : typeof output.source === "string"
              ? Buffer.byteLength(output.source)
              : output.source.byteLength;
        add(`${base}${fileName}`, bytes);
      }

      // Public assets (icons) — copied verbatim by Vite, so they are not in
      // `bundle`; read their sizes off disk. Skip source maps and the
      // crawler-only files.
      const publicDir = config.publicDir;
      if (publicDir) {
        for (const file of listFiles(publicDir)) {
          const rel = relative(publicDir, file).split(sep).join(posix.sep);
          if (PUBLIC_SKIP.has(rel) || rel.endsWith(".map")) continue;
          add(`${base}${rel}`, statSync(file).size);
        }
      }

      // The web manifest is generated here (not shipped from `public/`) so
      // its identity fields are base-correct; add it to the precache so the
      // installed shell resolves its icons and identity offline.
      const manifestSource = buildManifest(base);
      add(`${base}manifest.webmanifest`, Buffer.byteLength(manifestSource));

      const precache = Object.keys(assets);
      const totalBytes = Object.values(assets).reduce((a, b) => a + b, 0);

      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: manifestSource,
      });
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: buildServiceWorker(cacheId, base, version, precache),
      });
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: `${JSON.stringify({ version }, null, 2)}\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "precache-manifest.json",
        source: `${JSON.stringify({ totalBytes, assets }, null, 2)}\n`,
      });
    },
  };
}

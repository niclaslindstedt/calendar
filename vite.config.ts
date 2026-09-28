// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

import { appPwa } from "./pwa-plugin.ts";
import { resolveAppName } from "./src/app/appName.ts";
import { slotForBase, slotSuffix } from "./src/app/slot.ts";

// The base path is injected by the pages workflow via VITE_BASE — one build
// per deployment slot (`/`, `/preview/`, `/branch/` — OSS_SPEC §11.5), `/`
// for local dev and preview. The slot, and with it the PWA identity and the
// build label, is derived from that one value so the two cannot drift.
const base = process.env.VITE_BASE ?? "/";
const slot = slotForBase(base);

// For the `/branch/` slot the URL is stable and only the parked build changes,
// so the source branch has to travel with the build itself (§11.5.4).
const sourceRef = process.env.VITE_SOURCE_REF ?? "";

// Build identity for the Developer tab's "Build" grid.
const commit =
  process.env.GITHUB_SHA?.slice(0, 7) ??
  (() => {
    try {
      return execSync("git rev-parse --short HEAD", {
        encoding: "utf8",
      }).trim();
    } catch {
      return "unknown";
    }
  })();
const buildNumber = process.env.GITHUB_RUN_NUMBER ?? "dev";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The app's released version, the base of the build label.
const appVersion = (
  JSON.parse(readFileSync(here("./package.json"), "utf8")) as {
    version: string;
  }
).version;

// The build identifier: `<version>[.<run>][+<commit>][-<slot>]`. A local
// production build collapses to just `<version>`; the slot suffix (`pre`,
// `br-<branch>`) is what tells staging and branch builds apart at a glance
// (§11.5.4).
const suffix = slotSuffix(slot, sourceRef);
const buildLabel =
  appVersion +
  (process.env.GITHUB_RUN_NUMBER ? `.${process.env.GITHUB_RUN_NUMBER}` : "") +
  (process.env.GITHUB_SHA ? `+${process.env.GITHUB_SHA.slice(0, 7)}` : "") +
  (suffix ? `-${suffix}` : "");

// The label the PWA update toast shows for the incoming build. It also lands
// in the generated `sw.js`, so the worker's bytes change every deploy and the
// browser reliably discovers the update; a local build appends a timestamp to
// keep that per-build uniqueness.
const version = process.env.GITHUB_SHA
  ? buildLabel
  : `${buildLabel}+${new Date().toISOString()}`;

// Mirror the built `index.html` to `privacy/index.html`, so Pages serves the
// same SPA at the clean URL `/privacy/` — and does it in *every* deployment
// slot, because the alias is emitted by the build rather than configured per
// deploy: `/preview/` and `/branch/` are the same build under another base and
// get `/preview/privacy/` and `/branch/privacy/` for free. `src/main.tsx`
// reads `location.pathname` and mounts the policy there.
//
// The copied HTML loads the same hashed asset URLs — they are origin-absolute
// under the slot's base — so nothing needs rewriting. It runs late
// (`enforce: "post"`) so the PWA plugin's manifest-link and icon injection
// is already baked into the source it copies; the service worker serves this
// path the app shell like any other navigation under the base, which is what
// makes the page work offline too.
function emitPrivacyAlias(): Plugin {
  return {
    name: "emit-privacy-alias",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (index && index.type === "asset") {
        this.emitFile({
          type: "asset",
          fileName: "privacy/index.html",
          source: String(index.source),
        });
      }
    },
  };
}

// A build for the DESKTOP SHELL (tauri/), set by `tauri/scripts/bundle-web.mjs`.
//
// It changes exactly one thing, and it is about the medium rather than the
// audience: the service worker is left out (`serviceWorker: false` below —
// everything else `appPwa` writes into the `<head>` still applies). A desktop
// build has no deployment to discover an update from — a new version arrives
// as a new binary — so a worker here would precache a copy of files already on
// local disk and then serve the page from ITS copy. `__SHELL_BUILD__` carries
// the same fact into the app, where it switches off the update prompt that has
// nothing left to prompt about.
const shellBuild = process.env.VITE_SHELL_BUILD === "on";

// A build for the PHONE WRAPPER (native/), set by `native/scripts/bundle-web.mjs`.
// With `__SHELL_BUILD__` it marks every build that is not the website, and
// what it changes is about the channel rather than the medium: an app from a
// store carries no link back to the source (owner decision D17) — the privacy
// page names no issue tracker, commit history or web-edition address. Both
// are compile-time constants, so those are folded out of the app bundles
// rather than hidden, and `websiteOnly` below drops the rest.
const nativeBuild = process.env.VITE_NATIVE_BUILD === "on";
const appBuild = shellBuild || nativeBuild;

// The name the app calls itself (`src/app/appName.ts`): the store listing's
// name in the phone build, which `native/scripts/bundle-web.mjs` passes as
// `APP_DISPLAY_NAME`; the project's own name everywhere else.
const appName = resolveAppName({
  nativeBuild,
  displayName: process.env.APP_DISPLAY_NAME,
});

// The document title follows it, so nothing in the phone build's page still
// calls the app by the project name.
function titled(name: string): Plugin {
  return {
    name: "app-name-title",
    transformIndexHtml(html) {
      return html.replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`);
    },
  };
}

// What only the website carries, left out of an app build (D17): the Open
// Graph and Twitter tags in `index.html` that point at the web edition's
// address, and the two public files that exist for them and for Pages — the
// share card (`og.png`) and the custom-domain file (`CNAME`). The bundle
// scripts refuse a webroot that still names the site's owner.
function websiteOnly(): Plugin {
  let outDir = "";
  return {
    name: "website-only",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html.replace(
        /[ \t]*<meta\b[^>]*\bcontent="https?:\/\/[^"]*"[^>]*>\n?/g,
        "",
      );
    },
    closeBundle() {
      for (const file of ["CNAME", "og.png"]) {
        rmSync(resolve(outDir, file), { force: true });
      }
    },
  };
}

export default defineConfig({
  base,
  build: {
    // No size budgets, by owner decision — high enough that Vite never warns.
    chunkSizeWarningLimit: 100_000,
  },
  define: {
    __SHELL_BUILD__: JSON.stringify(shellBuild),
    __NATIVE_BUILD__: JSON.stringify(nativeBuild),
    __APP_NAME__: JSON.stringify(appName),
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_LABEL__: JSON.stringify(buildLabel),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_SLOT__: JSON.stringify(slot),
    __BUILD_SOURCE__: JSON.stringify(sourceRef),
  },
  // `appPwa` only applies on build, so dev keeps registering no worker (the
  // app passes `enabled: !import.meta.env.DEV` to `usePwaUpdate`).
  //
  // The runtime is Preact, not React: `@preact/preset-vite` compiles JSX
  // against `preact/jsx-runtime` and aliases `react` / `react-dom` (and the
  // `/jsx-runtime` + `/client` subpaths) onto `preact/compat`, so both this
  // app's `import … from "react"` lines and the pre-built framework chunks —
  // which import `react`, `react-dom`, and `react/jsx-runtime` as externals —
  // resolve to Preact. Nothing from React itself reaches the bundle.
  plugins: [
    preact(),
    tailwindcss(),
    appPwa({ base, version, serviceWorker: !shellBuild }),
    ...(appBuild ? [websiteOnly()] : []),
    titled(appName),
    emitPrivacyAlias(),
  ],
});

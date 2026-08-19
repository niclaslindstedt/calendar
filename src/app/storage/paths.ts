// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Where a namespace's document lives, per backend. One namespace is one whole
// calendar — its own document, saved beside the others through whichever
// backend is active — so every storage location the app names has to be a
// function of the namespace slug rather than a constant.
//
// Pure and dependency-free on purpose: `backends.ts` reads `import.meta.env`
// and the framework's browser-only storage code, which a node test can't
// import, and these names are exactly the part worth pinning down in a test.
//
// The default namespace keeps the un-suffixed names the app shipped with, so
// a calendar written before namespaces existed is still the default
// namespace's calendar after the upgrade — no migration, no copy.

import { DEFAULT_NAMESPACE_SLUG } from "@niclaslindstedt/oss-framework/namespaces";

/** The `localStorage` key the browser backend stores a namespace under. */
export function documentKey(slug: string): string {
  return isDefault(slug) ? "calendar:document" : `calendar:document:${slug}`;
}

/** The file name a namespace's document takes in a folder / cloud backend. */
export function documentFileName(slug: string): string {
  return isDefault(slug) ? "calendar.json" : `calendar.${slug}.json`;
}

/** The scope a namespace's offline mirror is cached under (fed to the
 *  framework's `localCacheKey`, which prefixes the backend id). */
export function cacheScope(slug: string): string {
  return isDefault(slug) ? "calendar" : `calendar:${slug}`;
}

function isDefault(slug: string): boolean {
  return slug === DEFAULT_NAMESPACE_SLUG || slug === "";
}

// --- Dropbox ----------------------------------------------------------------
//
// Dropbox is the one backend that gets a tree rather than a flat run of files:
// every namespace is its own folder at the app folder's root, and that
// namespace's calendar is the one document inside it. So a Dropbox user
// browsing `Apps/<app folder>/` sees their calendars as folders — the same
// list the namespace switcher shows — instead of a pile of similarly-named
// JSON files. The folder is named for the *slug*, which is fixed at creation:
// renaming a namespace changes what the switcher says, never where its notes
// live. The default namespace is a folder like any other, so nothing sits
// loose at the app folder's root.

/** The file a namespace's calendar takes inside its own Dropbox folder. */
export const DROPBOX_DOCUMENT_FILE = "calendar.json";

/** The folder a namespace occupies at the Dropbox app folder's root. */
export function dropboxNamespaceFolder(slug: string): string {
  return isDefault(slug) ? DEFAULT_NAMESPACE_SLUG : slug;
}

/** The path the Dropbox file store is scoped to for a namespace — an
 *  app-folder-relative path, which is what the Dropbox API takes. */
export function dropboxRootPath(slug: string): string {
  return `/${dropboxNamespaceFolder(slug)}`;
}

/** Where a namespace's calendar sits, spelled the way Dropbox shows it to the
 *  user (`Apps/<app folder>/<namespace>/calendar.json`). Display only — the
 *  API never sees the `Apps/` prefix. */
export function dropboxDisplayPath(appFolder: string, slug: string): string {
  return `Apps/${appFolder}/${dropboxNamespaceFolder(slug)}/${DROPBOX_DOCUMENT_FILE}`;
}

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

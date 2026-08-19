// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Where a calendar's document lives, per backend. The app keeps several
// calendars — each its own document, saved beside the others through
// whichever backend is active — so every storage location the app names has
// to be a function of the calendar's slug rather than a constant.
//
// Pure and dependency-free on purpose: `backends.ts` reads `import.meta.env`
// and the framework's browser-only storage code, which a node test can't
// import, and these names are exactly the part worth pinning down in a test.
//
// The default calendar keeps the un-suffixed names the app shipped with, so
// a calendar written before there were several is still the default one after
// the upgrade — no migration, no copy.

import { DEFAULT_NAMESPACE_SLUG } from "@niclaslindstedt/oss-framework/namespaces";

/** The slug the app's first calendar occupies. The framework calls a slot
 *  like this a "namespace"; the app has one kind of document, so a slot and
 *  the thing in it are the same thing here — this is the one place the two
 *  words are tied together, and app code reads the calendar spelling. */
export const DEFAULT_CALENDAR_SLUG = DEFAULT_NAMESPACE_SLUG;

/** The `localStorage` key the browser backend stores a calendar under. */
export function documentKey(slug: string): string {
  return isDefault(slug) ? "calendar:document" : `calendar:document:${slug}`;
}

/** The file name a calendar's document takes in a folder / cloud backend. */
export function documentFileName(slug: string): string {
  return isDefault(slug) ? "calendar.json" : `calendar.${slug}.json`;
}

/** The scope a calendar's offline mirror is cached under (fed to the
 *  framework's `localCacheKey`, which prefixes the backend id). */
export function cacheScope(slug: string): string {
  return isDefault(slug) ? "calendar" : `calendar:${slug}`;
}

function isDefault(slug: string): boolean {
  return slug === DEFAULT_CALENDAR_SLUG || slug === "";
}

// --- Dropbox ----------------------------------------------------------------
//
// Dropbox is the one backend that gets a tree rather than a flat run of files:
// every calendar is its own folder at the app folder's root, and that
// calendar's notes are the one document inside it. So a Dropbox user browsing
// `Apps/<app folder>/` sees their calendars as folders — the same list the
// switcher shows — instead of a pile of similarly-named JSON files. The
// folder is named for the *slug*, which is fixed at creation: renaming a
// calendar changes what the switcher says, never where its notes live. The
// default calendar is a folder like any other, so nothing sits loose at the
// app folder's root.

/** The file a calendar's notes take inside its own Dropbox folder. */
export const DROPBOX_DOCUMENT_FILE = "calendar.json";

/** The folder a calendar occupies at the Dropbox app folder's root. */
export function dropboxCalendarFolder(slug: string): string {
  return isDefault(slug) ? DEFAULT_CALENDAR_SLUG : slug;
}

/** The path the Dropbox file store is scoped to for a calendar — an
 *  app-folder-relative path, which is what the Dropbox API takes. */
export function dropboxRootPath(slug: string): string {
  return `/${dropboxCalendarFolder(slug)}`;
}

/** Where a calendar's notes sit, spelled the way Dropbox shows it to the user
 *  (`Apps/<app folder>/<calendar>/calendar.json`). Display only — the API
 *  never sees the `Apps/` prefix. */
export function dropboxDisplayPath(appFolder: string, slug: string): string {
  return `Apps/${appFolder}/${dropboxCalendarFolder(slug)}/${DROPBOX_DOCUMENT_FILE}`;
}

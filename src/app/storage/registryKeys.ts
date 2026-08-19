// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The two `localStorage` keys the calendar registry lives under, and the
// one-time move off the names it first shipped with.
//
// The registry (which calendars exist, and which one is on screen) is
// device-local — it is the one part of the feature that does not sync — so
// renaming its keys is a data migration, not a refactor. The feature was
// released as "namespaces"; the keys it wrote are `calendar:namespaces` and
// `calendar:namespace:active`, and a device that already has them must come
// back with its calendars intact rather than reseeded.
//
// Pure and dependency-free on purpose (it takes the storage it works on),
// which is what lets a node test exercise the migration without a DOM —
// `storage/paths.ts` is split out for the same reason.

/** The calendar list: names, icons, colours (the framework's serial format). */
export const CALENDAR_LIST_KEY = "calendar:calendars";

/** The slug of the calendar on screen. */
export const CALENDAR_ACTIVE_KEY = "calendar:calendar:active";

/** What each key was called while the feature was named "namespaces". */
export const LEGACY_KEYS: ReadonlyArray<readonly [string, string]> = [
  ["calendar:namespaces", CALENDAR_LIST_KEY],
  ["calendar:namespace:active", CALENDAR_ACTIVE_KEY],
];

/** The subset of `Storage` the migration needs — `localStorage` satisfies it,
 *  and so does a plain object a test hands in. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Carry a pre-rename registry over to the new keys. Runs once per device in
 * practice: the old key is dropped as it is copied, so the second call has
 * nothing left to find. A value already sitting under the new key wins — the
 * app has been used since the rename, and a stale legacy key must not undo
 * it. Best-effort: a storage that throws (Safari's private mode, a full
 * quota) leaves the app to fall back on its seeds rather than failing to
 * start.
 */
export function migrateLegacyRegistryKeys(store: KeyValueStore): void {
  for (const [legacy, current] of LEGACY_KEYS) {
    try {
      const carried = store.getItem(legacy);
      if (carried === null) continue;
      if (store.getItem(current) === null) store.setItem(current, carried);
      store.removeItem(legacy);
    } catch {
      // Nothing to do — the registry re-seeds, which is survivable.
    }
  }
}

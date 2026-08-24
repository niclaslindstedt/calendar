// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which contacts the reader has let into their calendar — the opt-in list,
// and the only thing about a contact this app ever writes down.
//
// It is a list of the HOST'S OWN IDS and nothing else: no name, no birthday,
// no number. Those are read into memory at launch and dropped when the app
// closes (`usePeople.ts`), which is what lets the privacy policy say that
// nothing about a contact is stored — and what keeps a synced calendar, a
// backup file, and the widgets' shared container free of them too. An id
// means nothing outside the device's own contact store; that is the point.
//
// Device-local, deliberately. The ids are that device's contact store's, so
// syncing this list to another device would name people it does not have.
// It is therefore NOT part of the settings blob and NOT part of a backup.

/** The `localStorage` key the opt-in list lives under.
 *
 *  Under `calendar:` like everything else the app stores — and, unlike
 *  everything else under that prefix, deliberately excluded from the native
 *  wrapper's storage bridge (`native/src/injected.ts`), so the ids never
 *  reach the App Group container the widgets read. */
export const CONTACTS_SELECTION_KEY = "calendar:contacts:selected";

/** The persisted shape: a plain array of ids. */
export type ContactSelection = readonly string[];

export const NO_SELECTION: ContactSelection = [];

/** Read a stored selection back, tolerating anything. Settings on this device
 *  are a hand-editable JSON blob and the host's ids are opaque strings, so
 *  the only real assertions are "array" and "non-empty string". Sorted and
 *  de-duplicated so the stored value is canonical — two devices that ticked
 *  the same people write the same bytes, and a re-render comparing by value
 *  is not defeated by ordering. */
export function parseSelection(value: unknown): ContactSelection {
  if (!Array.isArray(value)) return NO_SELECTION;
  const ids = value.filter(
    (id): id is string => typeof id === "string" && id !== "",
  );
  return [...new Set(ids)].sort();
}

/** Whether this contact is in the calendar. */
export function isSelected(selection: ContactSelection, id: string): boolean {
  return selection.includes(id);
}

/** Tick or untick one contact, canonically. */
export function toggleSelected(
  selection: ContactSelection,
  id: string,
): ContactSelection {
  return isSelected(selection, id)
    ? selection.filter((each) => each !== id)
    : parseSelection([...selection, id]);
}

/**
 * Tick everybody in a list.
 *
 * Takes the list rather than replacing the selection wholesale, because "all"
 * means the contacts on screen: a reader who pressed it can be looking at a
 * search that narrowed the list, and the people it did not show are not
 * people they just said yes to. Anyone already ticked stays ticked, so
 * selecting all of a filtered list adds to the calendar rather than
 * redefining it.
 */
export function selectAll(
  selection: ContactSelection,
  ids: readonly string[],
): ContactSelection {
  return parseSelection([...selection, ...ids]);
}

/** Untick everybody in a list, with the same reading of "all" as
 *  {@link selectAll}: the contacts on screen, not every contact ever ticked. */
export function deselectAll(
  selection: ContactSelection,
  ids: readonly string[],
): ContactSelection {
  const drop = new Set(ids);
  return selection.filter((id) => !drop.has(id));
}

/** How many of these contacts are in the calendar — what the Select all /
 *  Deselect all pair reads to decide which of them is the useful press. */
export function countSelected(
  selection: ContactSelection,
  ids: readonly string[],
): number {
  const chosen = new Set(selection);
  return ids.reduce((n, id) => (chosen.has(id) ? n + 1 : n), 0);
}

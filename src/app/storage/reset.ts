// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Emptying a calendar: which documents a reset touches, and what it leaves
// behind. The *rules* only, for the same reason `backup.ts` is pure — this is
// the part worth pinning down in a test, and the round-trip through the
// adapters is `backupIo.ts`'s job either way (a reset is an import of nothing:
// the same write, over every calendar it names).
//
// A reset removes notes, never calendars: a calendar it empties is still in
// the registry afterwards, with its name, its icon and its storage location
// untouched. That is the whole difference between this and deleting a
// calendar (`useCalendars`' `remove`), and it is why the emptied document is
// written rather than the file being dropped.

import { emptyDoc, type CalendarDoc } from "../types.ts";

/** How much a reset empties: the calendar on screen, or all of them. */
export type ResetScope = "active" | "all";

/** The calendars a reset at `scope` empties, in registry order.
 *
 *  The active calendar is always one of them — it is the one the reader is
 *  looking at, and a registry that has lost track of it (a stale pointer, a
 *  calendar removed on another device) must not turn "empty this calendar"
 *  into "empty nothing". */
export function resetTargets(
  calendars: readonly { slug: string }[],
  activeSlug: string,
  scope: ResetScope,
): string[] {
  if (scope === "active") return [activeSlug];
  const slugs = calendars.map((cal) => cal.slug);
  if (!slugs.includes(activeSlug)) slugs.push(activeSlug);
  return [...new Set(slugs)];
}

/** The documents those calendars are left with — one empty document each, at
 *  the current version, ready to be written like any other. */
export function clearedDocuments(
  slugs: readonly string[],
): Record<string, CalendarDoc> {
  const documents: Record<string, CalendarDoc> = {};
  for (const slug of slugs) documents[slug] = emptyDoc();
  return documents;
}

/** How many days a document is holding — what a reset would remove, and what
 *  the confirmation names before it does. */
export function noteCount(doc: CalendarDoc): number {
  return Object.keys(doc.entries).length;
}

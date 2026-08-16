// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The document model. Deliberately tiny: a calendar is a map from a day
// (`"YYYY-MM-DD"` — the framework's `DayKey`) to the plain text the user
// typed into that day. No recurring events, no times, no reminders — the
// text is meant to be READ by the user, not acted on by the app.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

/** The persisted document shape (see `migrations.ts` for the version chain). */
export type CalendarDoc = {
  version: number;
  /** Day → the user's note for that day. Empty notes are removed, not stored. */
  entries: Record<DayKey, string>;
};

/** The version freshly-written documents carry. */
export const DOC_VERSION = 1;

export function emptyDoc(): CalendarDoc {
  return { version: DOC_VERSION, entries: {} };
}

/** Parse a stored document defensively: unknown JSON in, a well-formed doc
 *  out. Non-string / empty entries are dropped rather than crashing the app
 *  on a hand-edited or foreign file. */
export function coerceDoc(raw: unknown): CalendarDoc {
  if (typeof raw !== "object" || raw === null) return emptyDoc();
  const doc = raw as Partial<CalendarDoc>;
  const entries: Record<DayKey, string> = {};
  if (typeof doc.entries === "object" && doc.entries !== null) {
    for (const [key, value] of Object.entries(doc.entries)) {
      if (typeof value === "string" && value.trim() !== "") {
        entries[key] = value;
      }
    }
  }
  return { version: DOC_VERSION, entries };
}

export function serializeDoc(doc: CalendarDoc): string {
  return JSON.stringify(doc, null, 2);
}

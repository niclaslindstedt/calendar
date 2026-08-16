// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The developer-mode "Demo data" backend: a `StorageAdapter` whose document
// is built from static sample entries, held in memory. While the toggle is on
// it takes over storage completely — nothing is written to disk, and turning
// it off (or reloading) returns to the real backend with the user's document
// untouched. A fresh adapter is created each time the toggle turns on, so
// every demo session starts from the pristine sample.

import type {
  StorageAdapter,
  StorageBackendId,
  StoredSnapshot,
} from "@niclaslindstedt/oss-framework/storage";
import {
  addDays,
  dayKeyOf,
  toDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import { DOC_VERSION, serializeDoc, type CalendarDoc } from "../types.ts";

/** The app-level backend id union: the framework's four plus our demo. */
export type BackendId = StorageBackendId | "demo";

// Static sample notes, placed relative to a month anchor so the demo always
// has content on the screen the user lands on. Day numbers are 1-based days
// of the anchor month (clamped by toDayKey's Gregorian rollover, so a "31" in
// a 30-day month simply lands on the 1st — harmless for demo data).
const THIS_MONTH: ReadonlyArray<readonly [number, string]> = [
  [3, "Dentist 09:30"],
  [5, "Dinner Ada 18:00"],
  [8, "Football practice 17:00"],
  [11, "Parents' evening"],
  [12, "Bake for Saturday"],
  [13, "Grandma's birthday 🎂"],
  [17, "Recycling run"],
  [19, "Movie night — pick early"],
  [22, "Car service 07:45"],
  [24, "Swim class 16:15"],
  [26, "Pay club fee"],
  [28, "Pizza Friday"],
];

const NEXT_MONTH: ReadonlyArray<readonly [number, string]> = [
  [2, "Vet appointment 10:00"],
  [6, "Theatre w/ Lisa 19:30"],
  [14, "Half-term starts"],
  [20, "Book summer cabin"],
];

/** Build the demo document around a month. Exported (with an injectable
 *  anchor) so tests can pin it to a fixed month. */
export function buildDemoDoc(anchor: Date = new Date()): CalendarDoc {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const entries: CalendarDoc["entries"] = {};
  for (const [day, text] of THIS_MONTH) {
    entries[toDayKey({ year, month, day })] = text;
  }
  for (const [day, text] of NEXT_MONTH) {
    entries[
      toDayKey({
        year: month === 12 ? year + 1 : year,
        month: (month % 12) + 1,
        day,
      })
    ] = text;
  }
  // A long entry near today shows the shrink-to-fit behaviour off.
  entries[addDays(dayKeyOf(anchor), 1)] =
    "Pack for the weekend: tent, sleeping bags, coffee, the good pancake pan, charger, rain gear for the kids";
  return { version: DOC_VERSION, entries };
}

/** In-memory demo backend. `id` is our app-level `"demo"`; the cast is the
 *  one place the app widens the framework's backend-id union. */
export function createDemoAdapter(anchor: Date = new Date()): StorageAdapter {
  let text = serializeDoc(buildDemoDoc(anchor));

  const snapshot = (): StoredSnapshot => ({ text });

  return {
    id: "demo" as StorageBackendId,
    label: "Demo data",
    capabilities: new Set(["loadSync"] as const),
    loadSync: () => snapshot(),
    load: () => Promise.resolve(snapshot()),
    save: (next: string) => {
      // Edits round-trip in memory so the demo behaves like real storage,
      // but nothing ever reaches disk.
      text = next;
      return Promise.resolve(snapshot());
    },
  };
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which row the day list opens a month on. The rule is small; the arithmetic
// under it is the kind that reads as right and is wrong at the edges — a week
// that began in the month before, a country whose week opens on Sunday, a
// month the reader is only paging past.
import { describe, expect, it } from "vitest";

import { listHomeDay } from "../src/app/listHome.ts";

/** Both packs the app ships are Monday-first; Sunday-first is what a pack
 *  added later brings, and it moves the answer by a day. */
const MONDAY = 1;
const SUNDAY = 0;

describe("the row the day list opens on", () => {
  it("is the Monday of today's week", () => {
    // Thursday 20 August 2026 — the week opened on the 17th.
    expect(listHomeDay(2026, 8, "2026-08-20", MONDAY)).toBe(17);
  });

  it("is today itself when today opens the week", () => {
    // Monday 17 August 2026.
    expect(listHomeDay(2026, 8, "2026-08-17", MONDAY)).toBe(17);
  });

  it("counts the week from the country's own first day", () => {
    // Sunday 23 August closes a Monday-first week (opened the 17th) and opens
    // a Sunday-first one.
    expect(listHomeDay(2026, 8, "2026-08-23", MONDAY)).toBe(17);
    expect(listHomeDay(2026, 8, "2026-08-23", SUNDAY)).toBe(23);
  });

  it("opens every other month at its top", () => {
    // The two the deck keeps parked either side, and anything paged to.
    expect(listHomeDay(2026, 7, "2026-08-20", MONDAY)).toBeNull();
    expect(listHomeDay(2026, 9, "2026-08-20", MONDAY)).toBeNull();
    expect(listHomeDay(2025, 8, "2026-08-20", MONDAY)).toBeNull();
  });

  it("opens at the top when today's week began in the month before", () => {
    // Tuesday 1 September 2026: the week opened on 31 August, which is not a
    // row this month has. The month's own first row is already the answer, and
    // saying "the top" keeps the month image above it on screen.
    expect(listHomeDay(2026, 9, "2026-09-01", MONDAY)).toBeNull();
    // …including the case where the week opens exactly on the 1st, which is
    // the top by another name.
    expect(listHomeDay(2026, 6, "2026-06-01", MONDAY)).toBeNull();
  });

  it("reads the day key at midday, not at midnight", () => {
    // A `DayKey` parsed at midnight UTC is the day before in any negative
    // offset, which would hand back the week before roughly one day in seven.
    const previous = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(listHomeDay(2026, 8, "2026-08-17", MONDAY)).toBe(17);
    } finally {
      process.env.TZ = previous;
    }
  });

  it("refuses a day key it cannot read", () => {
    expect(listHomeDay(2026, 8, "not-a-day" as never, MONDAY)).toBeNull();
  });
});

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week planner's arithmetic: the year-day number the strip prints, where
// a week opens, and the row mode a stored setting resolves to.
import { describe, expect, it } from "vitest";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import {
  DEFAULT_WEEK_DATE_SIZE,
  DEFAULT_WEEK_FORMAT,
  WEEK_DATE_SIZE_REM,
  WEEK_FORMATS,
  WEEK_ROW_MODES,
  dayOfYear,
  startsWeek,
  weekDateBase,
  weekDateSizeOf,
  weekFormatOf,
  weekNumberLabel,
  weekRowModeOf,
} from "../src/app/weekPlanner.ts";

describe("the day's ordinal in its year", () => {
  it("counts from 1 on the first of January", () => {
    expect(dayOfYear("2026-01-01" as DayKey)).toBe(1);
    expect(dayOfYear("2026-01-31" as DayKey)).toBe(31);
    expect(dayOfYear("2026-02-01" as DayKey)).toBe(32);
  });

  it("agrees with the printed almanac", () => {
    // The August 2026 column calendar prints 213 beside the 1st and 243
    // beside the 31st.
    expect(dayOfYear("2026-08-01" as DayKey)).toBe(213);
    expect(dayOfYear("2026-08-31" as DayKey)).toBe(243);
  });

  it("ends the year on 365, or 366 in a leap year", () => {
    expect(dayOfYear("2026-12-31" as DayKey)).toBe(365);
    expect(dayOfYear("2024-12-31" as DayKey)).toBe(366);
    // …and counts the leap day itself.
    expect(dayOfYear("2024-02-29" as DayKey)).toBe(60);
    expect(dayOfYear("2024-03-01" as DayKey)).toBe(61);
  });

  it("is not moved by a daylight-saving boundary", () => {
    // The arithmetic is on UTC midnights precisely so a 23- or 25-hour local
    // day between January and the day being counted cannot round it either
    // way. Both European transitions in 2026 (29 March, 25 October) and the
    // days that follow them:
    expect(dayOfYear("2026-03-29" as DayKey)).toBe(88);
    expect(dayOfYear("2026-03-30" as DayKey)).toBe(89);
    expect(dayOfYear("2026-10-25" as DayKey)).toBe(298);
    expect(dayOfYear("2026-10-26" as DayKey)).toBe(299);
  });

  it("prints nothing for a key that is not a date", () => {
    expect(dayOfYear("" as DayKey)).toBe(0);
    expect(dayOfYear("nonsense" as DayKey)).toBe(0);
  });
});

describe("where a week opens", () => {
  it("is the pack's own start of week", () => {
    // Monday in both shipped packs…
    expect(startsWeek(1, 1)).toBe(true);
    expect(startsWeek(0, 1)).toBe(false);
    // …and Sunday in a pack that follows the US convention.
    expect(startsWeek(0, 0)).toBe(true);
    expect(startsWeek(1, 0)).toBe(false);
  });
});

describe("the row mode", () => {
  it("ships fixed — the whole week on one screen", () => {
    expect(weekRowModeOf(undefined)).toBe("fixed");
  });

  it("keeps a known mode", () => {
    for (const mode of WEEK_ROW_MODES) {
      expect(weekRowModeOf(mode)).toBe(mode);
    }
  });

  it("refuses anything a hand-edited setting might carry", () => {
    expect(weekRowModeOf("grown")).toBe("fixed");
    expect(weekRowModeOf(7)).toBe("fixed");
    expect(weekRowModeOf(null)).toBe("fixed");
  });
});

describe("the week number's format", () => {
  const phrases = { long: "Vecka 34", mark: "v 34" };

  it("ships the week spelled out", () => {
    expect(DEFAULT_WEEK_FORMAT).toBe("long");
    expect(weekNumberLabel(undefined, 34, phrases)).toBe("Vecka 34");
  });

  it("prints each of the three ways of saying it", () => {
    expect(weekNumberLabel("long", 34, phrases)).toBe("Vecka 34");
    expect(weekNumberLabel("mark", 34, phrases)).toBe("v 34");
    expect(weekNumberLabel("bare", 34, phrases)).toBe("34");
  });

  it("refuses anything a hand-edited setting might carry", () => {
    for (const format of WEEK_FORMATS) {
      expect(weekFormatOf(format)).toBe(format);
    }
    expect(weekFormatOf("Vecka {n}")).toBe(DEFAULT_WEEK_FORMAT);
    expect(weekNumberLabel(null, 7, phrases)).toBe("Vecka 34");
  });
});

describe("the date's size", () => {
  it("ships the measured step", () => {
    expect(DEFAULT_WEEK_DATE_SIZE).toBe("medium");
    expect(weekDateBase(undefined)).toBe("1.5rem");
  });

  it("reaches twice the measured size", () => {
    // The point of the step: a wall-planner date, read across a room. The
    // week row is the one view with the height for it.
    expect(WEEK_DATE_SIZE_REM.huge).toBe(2 * WEEK_DATE_SIZE_REM.medium);
    expect(weekDateBase("huge")).toBe("3rem");
  });

  it("climbs", () => {
    const { small, medium, large, huge } = WEEK_DATE_SIZE_REM;
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
    expect(large).toBeLessThan(huge);
  });

  it("refuses anything a hand-edited setting might carry", () => {
    expect(weekDateSizeOf("enormous")).toBe(DEFAULT_WEEK_DATE_SIZE);
    expect(weekDateBase(3)).toBe("1.5rem");
  });
});

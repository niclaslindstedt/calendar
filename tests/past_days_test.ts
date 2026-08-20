// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Crossing off the days that have gone: which days count as passed, which
// box carries the stroke, and what a stroke is made of.
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAST_MARK,
  PAST_MARK_SCOPES,
  PAST_MARK_STYLES,
  isPastDay,
  markLines,
  pastMarkScope,
  pastMarkSlot,
  pastMarkStyle,
} from "../src/app/pastDays.ts";
import {
  DEFAULT_LOOK,
  DEFAULT_SETTINGS,
  LOOK_KEYS,
  pastMarkOf,
  updateLook,
} from "../src/app/useAppSettings.ts";

const TODAY = "2026-08-18";

describe("which days have passed", () => {
  it("counts the days before today, and not today itself", () => {
    expect(isPastDay("2026-08-17", TODAY)).toBe(true);
    expect(isPastDay("2026-08-18", TODAY)).toBe(false);
    expect(isPastDay("2026-08-19", TODAY)).toBe(false);
  });

  it("crosses year and month boundaries", () => {
    expect(isPastDay("2025-12-31", TODAY)).toBe(true);
    expect(isPastDay("2026-07-31", TODAY)).toBe(true);
    expect(isPastDay("2026-09-01", TODAY)).toBe(false);
    expect(isPastDay("2027-01-01", TODAY)).toBe(false);
  });

  it("marks nothing for a key that isn't a day", () => {
    // The views hand it whatever their grid built; a malformed key must not
    // be compared as text and quietly cross a day off.
    expect(isPastDay("not-a-day", TODAY)).toBe(false);
    expect(isPastDay("2026-08-17", "nope")).toBe(false);
  });
});

describe("which box carries the stroke", () => {
  it("draws nothing while the mark is off — the default", () => {
    expect(DEFAULT_PAST_MARK.style).toBe("none");
    expect(pastMarkSlot(DEFAULT_PAST_MARK, "2020-01-01", TODAY)).toBeNull();
  });

  it("names the chosen scope for a passed day and nothing for the rest", () => {
    const cell = { style: "cross", scope: "cell" } as const;
    expect(pastMarkSlot(cell, "2026-08-17", TODAY)).toBe("cell");
    expect(pastMarkSlot(cell, "2026-08-18", TODAY)).toBeNull();

    const date = { style: "slash", scope: "date" } as const;
    expect(pastMarkSlot(date, "2026-08-17", TODAY)).toBe("date");
    expect(pastMarkSlot(date, "2026-08-19", TODAY)).toBeNull();
  });
});

describe("the stroke itself", () => {
  it("is two lines for a cross and one for a slash", () => {
    expect(markLines("cross")).toHaveLength(2);
    expect(markLines("slash")).toHaveLength(1);
    expect(markLines("none")).toHaveLength(0);
  });

  it("keeps every stroke inside the box it is drawn in", () => {
    for (const style of PAST_MARK_STYLES) {
      for (const line of markLines(style)) {
        for (const n of [line.x1, line.y1, line.x2, line.y2]) {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("draws the slash bottom-left to top-right, as its label reads", () => {
    const [line] = markLines("slash");
    expect(line).toBeDefined();
    expect(line!.x1).toBeLessThan(line!.x2);
    expect(line!.y1).toBeGreaterThan(line!.y2);
  });

  it("puts the slash on one of the cross's two diagonals", () => {
    // The two settings are the same pen, drawn once or twice — a slash that
    // didn't lie on a cross's diagonal would read as a third mark.
    expect(markLines("cross")).toContainEqual(markLines("slash")[0]);
  });
});

describe("reading the setting back", () => {
  it("snaps an unknown style to no mark at all", () => {
    // A stored document can be hand-edited, and "I don't know what this is"
    // must not become a stroke across someone's calendar.
    expect(pastMarkStyle("cross")).toBe("cross");
    expect(pastMarkStyle("scribble")).toBe("none");
    expect(pastMarkStyle(undefined)).toBe("none");
  });

  it("snaps an unknown scope to the default", () => {
    expect(pastMarkScope("date")).toBe("date");
    expect(pastMarkScope(7)).toBe(DEFAULT_PAST_MARK.scope);
    for (const scope of PAST_MARK_SCOPES) {
      expect(pastMarkScope(scope)).toBe(scope);
    }
  });

  it("covers the date rather than the day, once it is turned on", () => {
    // The narrower of the two marks is the default: a crossed-off date says
    // where in the month you are without a stroke over what you wrote. It is
    // also the first of the two buttons, so the order and the default agree.
    expect(DEFAULT_PAST_MARK.scope).toBe("date");
    expect(PAST_MARK_SCOPES[0]).toBe("date");
    expect(PAST_MARK_SCOPES[1]).toBe("cell");
    expect(
      pastMarkSlot({ style: "cross", scope: "date" }, "2026-08-17", TODAY),
    ).toBe("date");
  });

  it("ships off, and travels in the previewed look", () => {
    expect(DEFAULT_SETTINGS.pastMark).toBe("none");
    expect(pastMarkOf(DEFAULT_LOOK)).toEqual(DEFAULT_PAST_MARK);
    // Both keys are judged against the calendar behind the dialog, so both
    // have to be part of the draft rather than written on Save alone.
    expect(LOOK_KEYS).toContain("pastMark");
    expect(LOOK_KEYS).toContain("pastMarkScope");
  });

  it("gathers an edited look", () => {
    const look = updateLook(
      updateLook(DEFAULT_LOOK, "pastMark", "slash"),
      "pastMarkScope",
      "date",
    );
    expect(pastMarkOf(look)).toEqual({ style: "slash", scope: "date" });
  });
});

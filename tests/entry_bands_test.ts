// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The framework's `fit` module owns the arithmetic and tests it there. What is
// tested here is that arithmetic *against this app's bands* — the ladder a
// month cell's note is binary-searched over has to be short enough to measure
// thirty of them in one layout pass, and its rungs have to be the half-points
// the shrink is supposed to read as. Those are facts about the measurements in
// `entryFont.ts`, so they belong to the calendar; the band shapes themselves
// are covered in `entry_font_test.ts`.
import {
  DEFAULT_LINE_HEIGHT,
  sizeLadder,
  textLineLimit,
} from "@niclaslindstedt/oss-framework/fit";
import { describe, expect, it } from "vitest";

import {
  LIST_ROW_FONT,
  MONTH_CELL_FONT,
  WEEK_ROW_FONT,
} from "../src/app/entryFont.ts";

describe("the ladder each band is searched over", () => {
  it("runs from the floor up to the size asked for", () => {
    const ladder = sizeLadder(MONTH_CELL_FONT.maxPx, MONTH_CELL_FONT.minPx);
    expect(ladder[0]).toBe(MONTH_CELL_FONT.minPx);
    expect(ladder[ladder.length - 1]).toBe(MONTH_CELL_FONT.maxPx);
  });

  it("ascends in half-point rungs", () => {
    const ladder = sizeLadder(WEEK_ROW_FONT.maxPx, WEEK_ROW_FONT.minPx);
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i]! - ladder[i - 1]!).toBeCloseTo(0.5, 5);
    }
  });

  it("stays short enough for a handful of measurements", () => {
    // The binary search costs ceil(log2(n)) layout reads per note, and a month
    // grid measures thirty-odd of them in one pass.
    for (const band of [MONTH_CELL_FONT, WEEK_ROW_FONT, LIST_ROW_FONT]) {
      const ladder = sizeLadder(band.maxPx, band.minPx);
      expect(Math.ceil(Math.log2(ladder.length))).toBeLessThanOrEqual(4);
    }
  });
});

describe("how many lines a slot holds", () => {
  it("fits more lines as the note gets smaller", () => {
    const available = 60;
    expect(textLineLimit(available, MONTH_CELL_FONT.minPx)).toBeGreaterThan(
      textLineLimit(available, MONTH_CELL_FONT.maxPx),
    );
  });

  it("gives a month cell's floor a line in the room one line needs", () => {
    // A band whose floor could not set a single line in its own line height
    // would be a band that clamps every note in the grid.
    const oneLine = MONTH_CELL_FONT.minPx * DEFAULT_LINE_HEIGHT;
    expect(textLineLimit(oneLine, MONTH_CELL_FONT.minPx)).toBe(1);
  });
});

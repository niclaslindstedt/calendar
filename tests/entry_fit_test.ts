// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  ENTRY_LINE_HEIGHT,
  entryLineLimit,
  entrySizeLadder,
} from "../src/app/entryFit.ts";
import { MONTH_CELL_FONT, WEEK_ROW_FONT } from "../src/app/entryFont.ts";

describe("entryLineLimit", () => {
  it("counts the whole lines a slot holds", () => {
    expect(entryLineLimit(10 * ENTRY_LINE_HEIGHT * 3, 10)).toBe(3);
    expect(entryLineLimit(10 * ENTRY_LINE_HEIGHT * 3.9, 10)).toBe(3);
  });

  it("keeps a line even in a slot too short for one", () => {
    expect(entryLineLimit(4, 10)).toBe(1);
    expect(entryLineLimit(0, 10)).toBe(1);
  });

  it("absorbs a sub-pixel slot height rather than dropping a line", () => {
    // A slot measured at 41.99 px holds the three 11.2 px lines a 42 px one
    // does — floor() alone would round the last one away.
    expect(entryLineLimit(11.2 * ENTRY_LINE_HEIGHT * 3 - 0.01, 11.2)).toBe(3);
  });

  it("fits more lines as the text gets smaller", () => {
    const available = 60;
    expect(entryLineLimit(available, 8)).toBeGreaterThan(
      entryLineLimit(available, 13),
    );
  });
});

describe("entrySizeLadder", () => {
  it("runs from the floor up to the size asked for", () => {
    const ladder = entrySizeLadder(
      MONTH_CELL_FONT.maxPx,
      MONTH_CELL_FONT.minPx,
    );
    expect(ladder[0]).toBe(MONTH_CELL_FONT.minPx);
    expect(ladder[ladder.length - 1]).toBe(MONTH_CELL_FONT.maxPx);
  });

  it("ascends in half-point rungs", () => {
    const ladder = entrySizeLadder(WEEK_ROW_FONT.maxPx, WEEK_ROW_FONT.minPx);
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i] - ladder[i - 1]).toBeCloseTo(0.5, 5);
    }
  });

  it("stays short enough for a handful of measurements", () => {
    // The binary search costs ceil(log2(n)) layout reads per note.
    for (const font of [MONTH_CELL_FONT, WEEK_ROW_FONT]) {
      const ladder = entrySizeLadder(font.maxPx, font.minPx);
      expect(Math.ceil(Math.log2(ladder.length))).toBeLessThanOrEqual(4);
    }
  });

  it("is a single rung when the size is pinned", () => {
    expect(entrySizeLadder(11, 11)).toEqual([11]);
  });
});

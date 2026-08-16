// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  LIST_ROW_FONT,
  MONTH_CELL_FONT,
  WEEK_ROW_FONT,
  entryFontPx,
} from "../src/app/entryFont.ts";

describe("entryFontPx", () => {
  it("holds the comfortable size for short notes", () => {
    expect(entryFontPx(0, MONTH_CELL_FONT)).toBe(MONTH_CELL_FONT.maxPx);
    expect(entryFontPx(MONTH_CELL_FONT.startAt, MONTH_CELL_FONT)).toBe(
      MONTH_CELL_FONT.maxPx,
    );
  });

  it("shrinks monotonically as the text grows", () => {
    let prev = Infinity;
    for (let len = 0; len <= 300; len += 10) {
      const px = entryFontPx(len, MONTH_CELL_FONT);
      expect(px).toBeLessThanOrEqual(prev);
      prev = px;
    }
  });

  it("never goes below the floor", () => {
    expect(entryFontPx(10_000, MONTH_CELL_FONT)).toBe(MONTH_CELL_FONT.minPx);
    expect(entryFontPx(10_000, WEEK_ROW_FONT)).toBe(WEEK_ROW_FONT.minPx);
    expect(entryFontPx(10_000, LIST_ROW_FONT)).toBe(LIST_ROW_FONT.minPx);
  });

  it("the roomier views hold their size longer than the month cell", () => {
    const len = 80;
    expect(entryFontPx(len, WEEK_ROW_FONT)).toBeGreaterThan(
      entryFontPx(len, MONTH_CELL_FONT),
    );
  });
});

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  ENTRY_TEXT_SIZES,
  LIST_ROW_FONT,
  MONTH_CELL_FONT,
  WEEK_ROW_FONT,
  ZOOM_NOTE_FONT,
  entryFontPx,
  fixedEntryFontPx,
  resolveEntryFontPx,
  type FixedEntryTextSize,
} from "../src/app/entryFont.ts";

const FONTS = [MONTH_CELL_FONT, WEEK_ROW_FONT, LIST_ROW_FONT];
const FIXED: FixedEntryTextSize[] = ["small", "medium", "large"];

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

describe("the fixed text-size steps", () => {
  it("offers dynamic plus exactly three fixed steps", () => {
    expect([...ENTRY_TEXT_SIZES]).toEqual([
      "dynamic",
      "small",
      "medium",
      "large",
    ]);
  });

  it("grows small → medium → large inside every view's band", () => {
    for (const font of FONTS) {
      const [small, medium, large] = FIXED.map((size) =>
        fixedEntryFontPx(size, font),
      );
      expect(small).toBeGreaterThanOrEqual(font.minPx);
      expect(small).toBeLessThan(medium);
      expect(medium).toBeLessThan(large);
      expect(large).toBeLessThan(font.maxPx);
    }
  });

  it("spends most of the band on the three steps", () => {
    // The ladder used to be bunched into the bottom of the band (0.2 / 0.6),
    // which in a month cell is 8, 9 and 11 px: a Small nobody can read and a
    // Large two points above it. Large now reaches most of the way to the
    // size a near-empty note is drawn at, and the three steps are spread over
    // more than half of what the view has to give.
    for (const font of FONTS) {
      const band = font.maxPx - font.minPx;
      const [small, medium, large] = FIXED.map((size) =>
        fixedEntryFontPx(size, font),
      );
      expect(large).toBeGreaterThanOrEqual(font.minPx + band * 0.8);
      expect(medium).toBeGreaterThan(font.minPx + band * 0.4);
      expect(large - small).toBeGreaterThan(band * 0.5);
    }
  });

  it("puts small the same share of the band under medium in every view", () => {
    // A share rather than the flat point it used to be: a point is a fifth of
    // a month cell's band and a sixteenth of the week planner's, so the one
    // number made the smallest step nearly invisible in the view with the
    // most room to show it in.
    const drops = FONTS.map((font) => {
      const band = font.maxPx - font.minPx;
      return (
        (fixedEntryFontPx("medium", font) - fixedEntryFontPx("small", font)) /
        band
      );
    });
    // Within the half-point the px sizes are rounded to.
    for (const drop of drops) expect(drop).toBeCloseTo(0.25, 1);
  });

  it("never puts a step below the view's floor", () => {
    for (const font of FONTS) {
      for (const size of FIXED) {
        expect(fixedEntryFontPx(size, font)).toBeGreaterThanOrEqual(font.minPx);
      }
    }
  });

  it("keeps a step's size the same however much is written", () => {
    for (const size of FIXED) {
      const short = resolveEntryFontPx(3, LIST_ROW_FONT, size);
      const long = resolveEntryFontPx(400, LIST_ROW_FONT, size);
      expect(long).toBe(short);
    }
  });

  it("keeps the shrink-to-fit curve on dynamic", () => {
    for (const len of [0, 40, 400]) {
      expect(resolveEntryFontPx(len, LIST_ROW_FONT, "dynamic")).toBe(
        entryFontPx(len, LIST_ROW_FONT),
      );
    }
  });

  it("scales each step to the view it renders in", () => {
    for (const size of FIXED) {
      expect(fixedEntryFontPx(size, WEEK_ROW_FONT)).toBeGreaterThan(
        fixedEntryFontPx(size, MONTH_CELL_FONT),
      );
    }
  });
});

describe("the zoom's page", () => {
  // A long press opens the day up close precisely because the cell had to
  // shrink the note to fit 47 px (`DayZoom`), so the band it is set in there
  // has to undo that rather than repeat it.
  it("sets a note about four times the size a month cell can", () => {
    const ratio = ZOOM_NOTE_FONT.maxPx / MONTH_CELL_FONT.maxPx;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ZOOM_NOTE_FONT.minPx).toBeGreaterThan(MONTH_CELL_FONT.maxPx);
  });

  it("holds that size past anything a cell would have held whole", () => {
    // The cell is at its floor by 90 characters; the page has not started
    // shrinking yet, which is the point of having opened it.
    expect(ZOOM_NOTE_FONT.startAt).toBeGreaterThan(MONTH_CELL_FONT.floorAt);
    expect(entryFontPx(MONTH_CELL_FONT.floorAt, ZOOM_NOTE_FONT)).toBe(
      ZOOM_NOTE_FONT.maxPx,
    );
  });

  it("keeps the reader's own steps inside that band", () => {
    for (const size of FIXED) {
      const px = fixedEntryFontPx(size, ZOOM_NOTE_FONT);
      expect(px).toBeGreaterThanOrEqual(ZOOM_NOTE_FONT.minPx);
      expect(px).toBeLessThanOrEqual(ZOOM_NOTE_FONT.maxPx);
      // …and every one of them is still bigger than the cell's largest.
      expect(px).toBeGreaterThan(fixedEntryFontPx(size, MONTH_CELL_FONT));
    }
  });
});

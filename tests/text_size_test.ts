// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The sizes each part of a day is set at: the ladder the sliders step
// through, what a stored value off it resolves to, and the hyphenation the
// month cell's caption band needs once the reader has grown it.
import { describe, expect, it } from "vitest";

import { MIN_HYPHENATED_LETTERS } from "../src/app/locale/hyphenate.ts";
import {
  DEFAULT_TEXT_SCALE,
  DEFAULT_TEXT_SCALES,
  SCALED_PIECES,
  TEXT_SCALES,
  TEXT_SCALE_VAR,
  clampTextScale,
  minHyphenatedLetters,
  textScaleAt,
  textScaleIndex,
  textScaleLabel,
  textScaleVars,
} from "../src/app/textSize.ts";
import {
  DEFAULT_LOOK,
  LOOK_KEYS,
  TEXT_SCALE_KEY,
  textScales,
  updateLook,
} from "../src/app/useAppSettings.ts";

describe("the size ladder", () => {
  it("climbs, and has the measured size as a stop", () => {
    let prev = 0;
    for (const step of TEXT_SCALES) {
      expect(step).toBeGreaterThan(prev);
      prev = step;
    }
    expect(TEXT_SCALES).toContain(DEFAULT_TEXT_SCALE);
  });

  it("ships every piece at the measured size", () => {
    for (const piece of SCALED_PIECES) {
      expect(DEFAULT_TEXT_SCALES[piece]).toBe(DEFAULT_TEXT_SCALE);
      expect(DEFAULT_LOOK[TEXT_SCALE_KEY[piece]]).toBe(DEFAULT_TEXT_SCALE);
    }
  });

  it("previews a size rather than saving it straight away", () => {
    // The sliders are judged against the calendar behind the dialog, so every
    // one of their keys has to travel in the draft.
    for (const piece of SCALED_PIECES) {
      expect(LOOK_KEYS).toContain(TEXT_SCALE_KEY[piece]);
    }
    const bigger = updateLook(DEFAULT_LOOK, "sizeNameDays", 1.25);
    expect(textScales(bigger).nameDays).toBe(1.25);
    expect(textScales(bigger).day).toBe(DEFAULT_TEXT_SCALE);
  });
});

describe("clampTextScale", () => {
  it("leaves a value already on the ladder alone", () => {
    for (const step of TEXT_SCALES) expect(clampTextScale(step)).toBe(step);
  });

  it("snaps a value between two stops to the nearer one", () => {
    expect(clampTextScale(0.81)).toBe(0.8);
    expect(clampTextScale(1.02)).toBe(1);
    expect(clampTextScale(1.2)).toBe(1.25);
  });

  it("holds a hand-edited document to the ladder's ends", () => {
    expect(clampTextScale(0)).toBe(TEXT_SCALES[0]);
    expect(clampTextScale(99)).toBe(TEXT_SCALES[TEXT_SCALES.length - 1]);
  });

  it("falls back to the measured size for a value that is not one", () => {
    expect(clampTextScale(undefined)).toBe(DEFAULT_TEXT_SCALE);
    expect(clampTextScale("large")).toBe(DEFAULT_TEXT_SCALE);
    expect(clampTextScale(NaN)).toBe(DEFAULT_TEXT_SCALE);
  });
});

describe("the slider's positions", () => {
  it("round-trips every stop", () => {
    TEXT_SCALES.forEach((step, i) => {
      expect(textScaleIndex(step)).toBe(i);
      expect(textScaleAt(i)).toBe(step);
    });
  });

  it("never lands between two stops", () => {
    expect(textScaleAt(-3)).toBe(TEXT_SCALES[0]);
    expect(textScaleAt(99)).toBe(TEXT_SCALES[TEXT_SCALES.length - 1]);
    expect(TEXT_SCALES).toContain(textScaleAt(2.4));
  });

  it("labels the measured size as 100%", () => {
    expect(textScaleLabel(DEFAULT_TEXT_SCALE)).toBe("100%");
    expect(textScaleLabel(0.8)).toBe("80%");
    expect(textScaleLabel(1.4)).toBe("140%");
  });
});

describe("textScaleVars", () => {
  it("publishes one variable per piece", () => {
    const vars = textScaleVars(DEFAULT_TEXT_SCALES);
    expect(Object.keys(vars).sort()).toEqual(
      SCALED_PIECES.map((piece) => TEXT_SCALE_VAR[piece]).sort(),
    );
    for (const value of Object.values(vars)) expect(value).toBe("1");
  });

  it("snaps a stored value onto the ladder on the way out", () => {
    const vars = textScaleVars({ ...DEFAULT_TEXT_SCALES, day: 7 });
    expect(vars[TEXT_SCALE_VAR.day]).toBe(
      String(TEXT_SCALES[TEXT_SCALES.length - 1]),
    );
  });

  it("names four distinct variables", () => {
    expect(new Set(Object.values(TEXT_SCALE_VAR)).size).toBe(
      SCALED_PIECES.length,
    );
  });
});

describe("minHyphenatedLetters", () => {
  it("is the measured constant at the measured size", () => {
    expect(minHyphenatedLetters(DEFAULT_TEXT_SCALE)).toBe(
      MIN_HYPHENATED_LETTERS,
    );
  });

  it("offers hyphens to shorter words as the caption grows", () => {
    // The caption band does not grow with the setting, so fewer letters fit
    // it: at 140% a nine-letter name needs the break points only a
    // twelve-letter one needed at 100%.
    let prev = Infinity;
    for (const step of TEXT_SCALES) {
      const letters = minHyphenatedLetters(step);
      expect(letters).toBeLessThanOrEqual(prev);
      prev = letters;
    }
    expect(minHyphenatedLetters(1.4)).toBeLessThan(MIN_HYPHENATED_LETTERS);
    expect(minHyphenatedLetters(0.8)).toBeGreaterThan(MIN_HYPHENATED_LETTERS);
  });

  it("keeps the shortest words whole at any size", () => {
    for (const step of TEXT_SCALES) {
      expect(minHyphenatedLetters(step)).toBeGreaterThanOrEqual(4);
    }
  });
});

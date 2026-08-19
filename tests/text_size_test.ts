// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The ladder the almanac's pieces are sized on: the three steps the buttons
// offer, what a stored value off them resolves to, and the hyphenation the
// month cell's caption band needs once the reader has grown it. Which piece of
// which view sits on which step is `view_style_test.ts`.
import { describe, expect, it } from "vitest";

import { MIN_HYPHENATED_LETTERS } from "../src/app/locale/hyphenate.ts";
import {
  DEFAULT_TEXT_SCALE,
  DEFAULT_TEXT_STEP,
  TEXT_SCALES,
  TEXT_STEPS,
  TEXT_STEP_SCALE,
  clampTextScale,
  minHyphenatedLetters,
  textStepOf,
  textStepScale,
} from "../src/app/textSize.ts";

describe("the size ladder", () => {
  it("climbs, and has the measured size as a step", () => {
    let prev = 0;
    for (const step of TEXT_SCALES) {
      expect(step).toBeGreaterThan(prev);
      prev = step;
    }
    expect(TEXT_SCALES).toContain(DEFAULT_TEXT_SCALE);
  });

  it("offers three named steps with the measured size in the middle", () => {
    expect(TEXT_STEPS).toEqual(["small", "medium", "large"]);
    expect(TEXT_SCALES).toHaveLength(TEXT_STEPS.length);
    expect(TEXT_STEP_SCALE[DEFAULT_TEXT_STEP]).toBe(DEFAULT_TEXT_SCALE);
    expect(TEXT_STEP_SCALE.small).toBeLessThan(DEFAULT_TEXT_SCALE);
    expect(TEXT_STEP_SCALE.large).toBeGreaterThan(DEFAULT_TEXT_SCALE);
  });
});

describe("clampTextScale", () => {
  it("leaves a value already on the ladder alone", () => {
    for (const step of TEXT_SCALES) expect(clampTextScale(step)).toBe(step);
  });

  it("snaps a value between two steps to the nearer one", () => {
    expect(clampTextScale(0.81)).toBe(0.8);
    expect(clampTextScale(1.02)).toBe(1);
    expect(clampTextScale(1.2)).toBe(1.25);
  });

  it("carries a document off the older six-stop ladder onto a step", () => {
    // 0.9, 1.1 and 1.4 were stops before the sliders became buttons; a
    // document written then still names them.
    for (const stored of [0.9, 1.1, 1.4]) {
      expect(TEXT_SCALES).toContain(clampTextScale(stored));
    }
    expect(clampTextScale(1.1)).toBe(1);
    expect(clampTextScale(1.4)).toBe(TEXT_STEP_SCALE.large);
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

describe("the buttons", () => {
  it("round-trips every step", () => {
    for (const step of TEXT_STEPS) {
      expect(textStepOf(textStepScale(step))).toBe(step);
      expect(textStepScale(step)).toBe(TEXT_STEP_SCALE[step]);
    }
  });

  it("presses the step a stored value is nearest", () => {
    expect(textStepOf(DEFAULT_TEXT_SCALE)).toBe(DEFAULT_TEXT_STEP);
    expect(textStepOf(0.79)).toBe("small");
    expect(textStepOf(1.1)).toBe("medium");
    expect(textStepOf(99)).toBe("large");
  });

  it("presses the middle step for a value that is not a size", () => {
    expect(textStepOf(undefined)).toBe(DEFAULT_TEXT_STEP);
    expect(textStepOf("large")).toBe(DEFAULT_TEXT_STEP);
    expect(textStepOf(NaN)).toBe(DEFAULT_TEXT_STEP);
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
    // it: on Large a nine-letter name needs the break points only a
    // twelve-letter one needed on Medium.
    let prev = Infinity;
    for (const step of TEXT_SCALES) {
      const letters = minHyphenatedLetters(step);
      expect(letters).toBeLessThanOrEqual(prev);
      prev = letters;
    }
    expect(minHyphenatedLetters(TEXT_STEP_SCALE.large)).toBeLessThan(
      MIN_HYPHENATED_LETTERS,
    );
    expect(minHyphenatedLetters(TEXT_STEP_SCALE.small)).toBeGreaterThan(
      MIN_HYPHENATED_LETTERS,
    );
  });

  it("keeps the shortest words whole at any size", () => {
    for (const step of TEXT_SCALES) {
      expect(minHyphenatedLetters(step)).toBeGreaterThanOrEqual(4);
    }
  });
});

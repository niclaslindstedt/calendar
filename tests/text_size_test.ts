// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The ladder the almanac's pieces are sized on: the three steps the buttons
// offer, what a stored value off them resolves to, and the hyphenation the
// month cell's caption band needs once the reader has grown it. Which piece of
// which view sits on which step is `view_style_test.ts`.
import { describe, expect, it } from "vitest";

import { MIN_HYPHENATED_LETTERS } from "../src/app/locale/hyphenate.ts";
import { BIRTHDAY_GLYPH_LETTERS } from "../src/app/people/PeopleMarks.tsx";
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
  it("climbs, and stands on the measured size", () => {
    let prev = 0;
    for (const step of TEXT_SCALES) {
      expect(step).toBeGreaterThan(prev);
      prev = step;
    }
    expect(TEXT_SCALES).toContain(DEFAULT_TEXT_SCALE);
    // The measurement is the bottom rung, not the middle one: it is what a
    // 47 px cell *can* set, which is the floor of what is worth printing.
    expect(TEXT_SCALES[0]).toBe(1);
  });

  it("spreads the steps far enough apart to be worth pressing", () => {
    // An older ladder was 0.8 / 1 / 1.25 — a sixth either side of the middle,
    // which is not a difference a reader can see without switching back and
    // forth. Large has to be at least half again the size of Small.
    expect(TEXT_STEP_SCALE.large / TEXT_STEP_SCALE.small).toBeGreaterThan(1.5);
    expect(
      TEXT_STEP_SCALE.large / TEXT_STEP_SCALE.medium,
    ).toBeGreaterThanOrEqual(1.3);
  });

  it("offers three named steps, shipping a rung above the measurement", () => {
    expect(TEXT_STEPS).toEqual(["small", "medium", "large"]);
    expect(TEXT_SCALES).toHaveLength(TEXT_STEPS.length);
    expect(TEXT_STEP_SCALE[DEFAULT_TEXT_STEP]).toBe(DEFAULT_TEXT_SCALE);
    // The measurement is Small now, so what ships is bigger than it — and
    // Large is bigger again, past what a 47 px month cell can hold whole.
    expect(TEXT_STEP_SCALE.small).toBeLessThan(DEFAULT_TEXT_SCALE);
    expect(TEXT_STEP_SCALE.large).toBeGreaterThan(DEFAULT_TEXT_SCALE);
    expect(DEFAULT_TEXT_SCALE).toBeGreaterThan(TEXT_STEP_SCALE.small);
  });
});

describe("clampTextScale", () => {
  it("leaves a value already on the ladder alone", () => {
    for (const step of TEXT_SCALES) expect(clampTextScale(step)).toBe(step);
  });

  it("snaps a value between two steps to the nearer one", () => {
    expect(clampTextScale(1.02)).toBe(TEXT_STEP_SCALE.small);
    expect(clampTextScale(1.4)).toBe(TEXT_STEP_SCALE.medium);
    expect(clampTextScale(1.9)).toBe(TEXT_STEP_SCALE.large);
  });

  it("reads a tie as the larger of the two steps", () => {
    // 1.25 was an older ladder's Large, and it sits exactly halfway between
    // the 1 and the 1.5 that outlived it. A reader who had pressed the
    // biggest button there was must not be shrunk by a build that shipped a
    // bigger one.
    expect(clampTextScale(1.25)).toBe(TEXT_STEP_SCALE.medium);
    expect(clampTextScale(1.75)).toBe(TEXT_STEP_SCALE.large);
  });

  it("carries a document off an older ladder onto a step", () => {
    // 0.9, 1.1 and 1.4 were stops before the sliders became buttons; 0.8 and
    // 1.25 were the buttons' own scales two ladders ago, and 0.85 the Small
    // this ladder itself shipped before the steps moved up a rung.
    for (const stored of [0.8, 0.85, 0.9, 1.1, 1.25, 1.4]) {
      expect(TEXT_SCALES).toContain(clampTextScale(stored));
    }
    // Everything at or under the measurement lands on it — the ladder has no
    // rung below 1 any more, and the sizes those documents carry were all
    // within a sixth of it.
    expect(clampTextScale(0.8)).toBe(TEXT_STEP_SCALE.small);
    expect(clampTextScale(0.85)).toBe(TEXT_STEP_SCALE.small);
    expect(clampTextScale(1.1)).toBe(TEXT_STEP_SCALE.small);
    // …and a reader who had pressed the old Large keeps the size it gave
    // them, under its new name.
    expect(clampTextScale(1.5)).toBe(TEXT_STEP_SCALE.medium);
  });

  it("holds a hand-edited document to the ladder's ends", () => {
    expect(clampTextScale(0)).toBe(TEXT_SCALES[0]);
    expect(clampTextScale(99)).toBe(TEXT_SCALES[TEXT_SCALES.length - 1]);
  });

  it("falls back to the shipped size for a value that is not one", () => {
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
    expect(textStepOf(1.6)).toBe("medium");
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
    // Which is the ladder's Small: the constant was measured in the band the
    // caption holds a whole name in, and that band is the measurement's.
    expect(minHyphenatedLetters(TEXT_STEP_SCALE.small)).toBe(
      MIN_HYPHENATED_LETTERS,
    );
  });

  it("already reseeds the break points at the size that ships", () => {
    // The calendar arrives a rung above the measurement, so the month cell
    // is hyphenating out of the box rather than only once a reader has asked
    // for bigger type.
    expect(minHyphenatedLetters(DEFAULT_TEXT_SCALE)).toBeLessThan(
      MIN_HYPHENATED_LETTERS,
    );
  });

  it("offers hyphens to shorter words as the caption grows", () => {
    // The caption band does not grow with the setting, so fewer letters fit
    // it: on Medium an eight-letter name needs the break points only a
    // twelve-letter one needed on Small, and on Large a six-letter one does.
    let prev = Infinity;
    for (const step of TEXT_SCALES) {
      const letters = minHyphenatedLetters(step);
      expect(letters).toBeLessThanOrEqual(prev);
      prev = letters;
    }
    expect(minHyphenatedLetters(TEXT_STEP_SCALE.large)).toBeLessThan(
      minHyphenatedLetters(TEXT_STEP_SCALE.medium),
    );
    expect(minHyphenatedLetters(TEXT_STEP_SCALE.small)).toBe(
      MIN_HYPHENATED_LETTERS,
    );
  });

  it("keeps the shortest words whole at any size", () => {
    for (const step of TEXT_SCALES) {
      expect(minHyphenatedLetters(step)).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("minHyphenatedLetters — a lead at the head of the line", () => {
  it("costs the same letters at every step of the ladder", () => {
    // The lead is the cake glyph a birthday is printed with, and it is set in
    // the caption's own font — so it grows with the scale exactly as the
    // letters beside it do. Subtracting it AFTER the division is what makes
    // its cost constant; taking it off the measured constant instead would
    // charge more letters as the reader made the caption bigger.
    for (const scale of TEXT_SCALES) {
      expect(minHyphenatedLetters(scale, 2)).toBe(
        Math.max(4, minHyphenatedLetters(scale) - 2),
      );
    }
  });

  it("matches what was measured in a real month cell at the measured size", () => {
    // 44.8 px band, caption font, 393 px viewport: "Bartolomeus" (11) is the
    // longest name that holds a whole line, and "Margareta" (9) the longest
    // that still holds one after the glyph. So a name of 10 letters or more
    // needs break points in a birthday run, where 12 is the plain caption's
    // threshold. See `BIRTHDAY_GLYPH_LETTERS`.
    expect(minHyphenatedLetters(1)).toBe(12);
    expect(minHyphenatedLetters(1, BIRTHDAY_GLYPH_LETTERS)).toBe(10);
  });

  it("hyphenates a name the plain caption would have left whole", () => {
    const threshold = minHyphenatedLetters(1, BIRTHDAY_GLYPH_LETTERS);
    // The case this was built for: stranded alone above its name before.
    expect("Bartolomeus".length).toBeGreaterThanOrEqual(threshold);
    // …and one the glyph still leaves room for, which must stay whole.
    expect("Margareta".length).toBeLessThan(threshold);
  });

  it("keeps the floor of 4, so a short name is never split", () => {
    expect(minHyphenatedLetters(1.5, 99)).toBe(4);
  });

  it("is unchanged with no lead", () => {
    for (const scale of TEXT_SCALES) {
      expect(minHyphenatedLetters(scale, 0)).toBe(minHyphenatedLetters(scale));
    }
  });
});

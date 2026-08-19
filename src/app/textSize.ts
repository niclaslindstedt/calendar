// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How big each part of a day is set — what Settings → Calendar → Text size
// edits.
//
// The almanac's own pieces (the date, a holiday's name, the day's names, the
// week number) each render at a *measured* default: the month cell's caption
// size is what lets the widest name hold a 47 px line, and the week lane is
// sized to its digits (AGENTS.md — those are measurements, not taste calls).
// So a setting here moves a **scale** of the measured size rather than a px
// value: one ladder of steps that means the same thing wherever the piece is
// drawn, with 1 — the measured size — as its middle and its default.
//
// The scales reach the views as CSS variables on `<html>` (`App.tsx` writes
// them, `src/styles.css` multiplies each site's base size by them), so a view
// paints at the chosen size without threading a number through every cell.
// The one place the number is needed in JS is the month cell's hyphenation:
// fewer letters fit a caption line as the caption grows, and the break points
// have to be seeded before layout (see `minHyphenatedLetters`).
//
// Your own text is deliberately *not* one of these. It is sized by the
// shrink-to-fit curve in `entryFont.ts` against the room a view actually
// leaves it, so its setting picks a mode on that curve, not a multiplier.

import { MIN_HYPHENATED_LETTERS } from "./locale/hyphenate.ts";

/** The pieces of a day whose size is a scale of a measured default. */
export const SCALED_PIECES = ["day", "holidays", "nameDays", "week"] as const;

export type ScaledPiece = (typeof SCALED_PIECES)[number];

/** The steps a piece is set at, and the buttons that set them. Three, named
 *  rather than numbered, because "which of these is too small for me" is
 *  answered by looking at the three sizes side by side — not by finding a
 *  percentage on a track. The same three words the entry text has used since
 *  it grew fixed steps (`entryFont.ts`), so one vocabulary covers the whole
 *  section. */
export const TEXT_STEPS = ["small", "medium", "large"] as const;

export type TextStep = (typeof TEXT_STEPS)[number];

/** What each step scales the measured size by.
 *
 *  `medium` is the measurement itself — the month cell's caption size is what
 *  lets the widest name hold a 47 px line — so it is the middle button and
 *  the default. `small` is a denser almanac; `large` stops at 1.25 rather
 *  than reaching for more, because past it the month cell's caption band
 *  stops being able to hold two names and the week lane's two digits start
 *  crowding the first day column. */
export const TEXT_STEP_SCALE: Record<TextStep, number> = {
  small: 0.8,
  medium: 1,
  large: 1.25,
};

/** The step every piece ships at. */
export const DEFAULT_TEXT_STEP: TextStep = "medium";

/** The scales the steps set, smallest first — the ladder a stored value is
 *  held to. */
export const TEXT_SCALES: readonly number[] = TEXT_STEPS.map(
  (step) => TEXT_STEP_SCALE[step],
);

/** The measured size — the middle step, and what every piece ships at. */
export const DEFAULT_TEXT_SCALE = TEXT_STEP_SCALE[DEFAULT_TEXT_STEP];

/** The scale each piece is set at. */
export type TextScales = Record<ScaledPiece, number>;

export const DEFAULT_TEXT_SCALES: TextScales = {
  day: DEFAULT_TEXT_SCALE,
  holidays: DEFAULT_TEXT_SCALE,
  nameDays: DEFAULT_TEXT_SCALE,
  week: DEFAULT_TEXT_SCALE,
};

/** The CSS variable each piece's scale is published as, and `src/styles.css`
 *  multiplies the piece's base size by. */
export const TEXT_SCALE_VAR: Record<ScaledPiece, string> = {
  day: "--cal-size-day",
  holidays: "--cal-size-holiday",
  nameDays: "--cal-size-nameday",
  week: "--cal-size-week",
};

/** The scale a stored value resolves to: the nearest step on the ladder, and
 *  the measured size for anything a hand-edited document might carry. Every
 *  read goes through here, so a scale off the ladder can never reach the CSS
 *  — including the in-between stops a document written against the older
 *  six-stop ladder still carries. */
export function clampTextScale(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TEXT_SCALE;
  let best = TEXT_SCALES[0] ?? DEFAULT_TEXT_SCALE;
  for (const step of TEXT_SCALES) {
    if (Math.abs(step - n) < Math.abs(best - n)) best = step;
  }
  return best;
}

/** Which of the three buttons a stored value has pressed. */
export function textStepOf(value: unknown): TextStep {
  const scale = clampTextScale(value);
  return (
    TEXT_STEPS.find((step) => TEXT_STEP_SCALE[step] === scale) ??
    DEFAULT_TEXT_STEP
  );
}

/** The scale a button sets. */
export function textStepScale(step: TextStep): number {
  return TEXT_STEP_SCALE[step] ?? DEFAULT_TEXT_SCALE;
}

/** The `<html>` variables for a set of scales — what `App.tsx` writes. */
export function textScaleVars(scales: TextScales): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const piece of SCALED_PIECES) {
    vars[TEXT_SCALE_VAR[piece]] = String(clampTextScale(scales[piece]));
  }
  return vars;
}

/** The letter count above which a month-cell caption word is offered soft
 *  hyphens, at a given caption scale.
 *
 *  {@link MIN_HYPHENATED_LETTERS} is measured at the caption's own size: the
 *  longest name that holds the 45.8 px band whole is 11 letters, so 12 is
 *  where a word starts needing break points. The band does not grow with the
 *  setting, so what fits it is that measured 11 letters divided by the scale
 *  — at 1.25 only eight fit, and a nine-letter "Alexander" needs the hyphens
 *  a twelve-letter word needed before. The floor of 4 keeps the shortest
 *  words whole even at the ladder's top: a hyphen inside "Elsa" would be
 *  worse than the overflow it avoids.
 *
 *  An approximation — letters are not all one width — but the same one the
 *  measured constant is: it is the widest name that sets the threshold, and
 *  a word that happens to fit is unharmed, because the breaker still prefers
 *  the space after it over any hyphen inside it. */
export function minHyphenatedLetters(scale: number): number {
  const n = clampTextScale(scale);
  const fits = Math.floor((MIN_HYPHENATED_LETTERS - 1) / n);
  return Math.max(4, fits + 1);
}

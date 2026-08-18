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
// leaves it, so its slider picks a mode on that curve, not a multiplier.

import { MIN_HYPHENATED_LETTERS } from "./locale/hyphenate.ts";

/** The pieces of a day whose size is a scale of a measured default. */
export const SCALED_PIECES = ["day", "holidays", "nameDays", "week"] as const;

export type ScaledPiece = (typeof SCALED_PIECES)[number];

/** The scales, in the order the slider steps through them. Six stops with
 *  the measured size third: two steps down for a denser almanac, three up
 *  for eyes that want the print bigger. 1.4 is the ceiling because it is
 *  where the month cell's caption band stops being able to hold two names
 *  and the week lane's two digits start crowding the first day column. */
export const TEXT_SCALES: readonly number[] = [0.8, 0.9, 1, 1.1, 1.25, 1.4];

/** The measured size — the middle stop, and what every piece ships at. */
export const DEFAULT_TEXT_SCALE = 1;

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

/** The step a stored value sits on: the nearest one on the ladder, and the
 *  measured size for anything a hand-edited document might carry. Every read
 *  goes through here, so a scale off the ladder can never reach the CSS. */
export function clampTextScale(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TEXT_SCALE;
  let best = TEXT_SCALES[0] ?? DEFAULT_TEXT_SCALE;
  for (const step of TEXT_SCALES) {
    if (Math.abs(step - n) < Math.abs(best - n)) best = step;
  }
  return best;
}

/** Where a scale sits on the ladder — the slider's position. */
export function textScaleIndex(value: unknown): number {
  return TEXT_SCALES.indexOf(clampTextScale(value));
}

/** The scale at a slider position, clamped to the ladder's ends. */
export function textScaleAt(index: number): number {
  const i = Math.round(index);
  if (!Number.isFinite(i)) return DEFAULT_TEXT_SCALE;
  const at = TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, i))];
  return at ?? DEFAULT_TEXT_SCALE;
}

/** How a scale is labelled on its slider: the measured size is 100%. */
export function textScaleLabel(value: unknown): string {
  return `${Math.round(clampTextScale(value) * 100)}%`;
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
 *  — at 1.4 only seven fit, and an eight-letter "Signhild" needs the hyphens
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

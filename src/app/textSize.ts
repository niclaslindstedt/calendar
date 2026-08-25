// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The ladder the almanac's pieces are sized on — the three steps the buttons
// in Settings → Calendar → View offer, and what a stored value off them
// resolves to. *Which* piece of *which* view is on which step is
// `viewStyle.ts`'s question; this is only the rungs.
//
// The almanac's own pieces (the date, a holiday's name, the day's names, the
// week number) each render at a *measured* default: the month cell's caption
// size is what lets the widest name hold a 47 px line, and the week lane is
// sized to its digits (AGENTS.md — those are measurements, not taste calls).
// So a setting here moves a **scale** of the measured size rather than a px
// value: one ladder of steps that means the same thing wherever the piece is
// drawn, standing on the measurement — 1 is the ladder's bottom rung, and the
// step above it is the default.
//
// The scales reach the views as CSS variables on `<html>` (`viewStyle.ts`
// publishes them per view, `src/styles.css` multiplies each site's base size
// by them), so a view paints at the chosen size without threading a number
// through every cell.
// The one place the number is needed in JS is the month cell's hyphenation:
// fewer letters fit a caption line as the caption grows, and the break points
// have to be seeded before layout (see `minHyphenatedLetters`).
//
// Your own text is deliberately *not* one of these. It is sized by the
// shrink-to-fit curve in `entryFont.ts` against the room a view actually
// leaves it, so its setting picks a mode on that curve, not a multiplier.

import { MIN_HYPHENATED_LETTERS } from "./locale/hyphenate.ts";

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
 *  `small` is the measurement itself — the month cell's caption size is what
 *  lets the widest name hold a 47 px line — and it sits at the **bottom** of
 *  the ladder rather than in its middle. That is the point of this ladder: a
 *  measurement is what a 47 px cell *can* set, which is the floor of what is
 *  worth printing rather than the middle of what anybody wants to read. The
 *  step that used to sit under it (0.85) was a denser almanac nobody had
 *  asked for — the complaint has only ever run the other way — so the ladder
 *  drops it, moves the two useful steps down a rung, and spends the room at
 *  the top instead.
 *
 *  `medium` is half again the measurement: the middle button, and the
 *  default, so a fresh install prints the almanac at what the ladder before
 *  this one called Large. A *stored* size is untouched by that — the setting
 *  is persisted as a scale rather than as a button, so a document carrying 1
 *  keeps printing at 1 and simply reads as Small from here on.
 *
 *  `large` is twice the measurement, and is deliberately past what a phone
 *  can hold: at 2 a 47 px month cell no longer sets two names whole even
 *  hyphenated (`minHyphenatedLetters` reseeds the break points from this
 *  same number, and reseeds them deepest here) and the week lane takes a good
 *  half of a portrait strip row. It is the step for an iPad mini and up,
 *  where the cell is wide enough to take it — and where the *other* factor in
 *  every printed size, the room the screen has (`roomScale.ts`), has usually
 *  added some of its own already. The two multiply, so a desk monitor on
 *  Large prints four times the measurement. */
export const TEXT_STEP_SCALE: Record<TextStep, number> = {
  small: 1,
  medium: 1.5,
  large: 2,
};

/** The step every piece ships at — the middle button, not the bottom one:
 *  the measured size is the smallest the almanac is worth printing at, not
 *  the size it should arrive at. */
export const DEFAULT_TEXT_STEP: TextStep = "medium";

/** The scales the steps set, smallest first — the ladder a stored value is
 *  held to. */
export const TEXT_SCALES: readonly number[] = TEXT_STEPS.map(
  (step) => TEXT_STEP_SCALE[step],
);

/** The scale every piece ships at: the middle step, half again the measured
 *  size. (The measurement itself is {@link TEXT_STEP_SCALE}`.small`.) */
export const DEFAULT_TEXT_SCALE = TEXT_STEP_SCALE[DEFAULT_TEXT_STEP];

/** The scale a stored value resolves to: the nearest step on the ladder, and
 *  the default step for anything a hand-edited document might carry. Every
 *  read goes through here, so a scale off the ladder can never reach the CSS
 *  — including the 0.85 that was this ladder's own Small until the steps
 *  shifted up, the 0.8 / 1.25 of the three-stop ladder before that, and the
 *  in-between stops of the six-stop one before that.
 *
 *  A value equidistant from two steps resolves to the **larger** of them, and
 *  that tie is not hypothetical: 1.25 was an older ladder's Large and sits
 *  exactly halfway between the 1 and the 1.5 that outlived it, so reading the
 *  tie downwards would quietly shrink a reader who had pressed the biggest
 *  button there was. Reading it upwards is the right way round in general
 *  too: a stored size above the measurement was somebody asking for more. */
export function clampTextScale(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TEXT_SCALE;
  let best = TEXT_SCALES[0] ?? DEFAULT_TEXT_SCALE;
  for (const step of TEXT_SCALES) {
    // `<=` over the ascending ladder is what resolves a tie upwards.
    if (Math.abs(step - n) <= Math.abs(best - n)) best = step;
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

/** The letter count above which a month-cell caption word is offered soft
 *  hyphens, at a given caption scale — and, optionally, with something
 *  already printed at the head of the line.
 *
 *  {@link MIN_HYPHENATED_LETTERS} is measured at the caption's own size — the
 *  ladder's Small, which is where the measurement sits: the longest name that
 *  holds the band whole is 11 letters, so 12 is where a word starts needing
 *  break points. The band does not grow with the setting, so what fits it is
 *  that measured 11 letters divided by the scale — on Medium only seven fit,
 *  and an eight-letter "Fredrika" needs the hyphens a twelve-letter word
 *  needed before; on Large five fit, and a six-letter "Bertil" does. The
 *  floor of 4 keeps the shortest words whole even at the ladder's top: a
 *  hyphen inside "Elsa" would be worse than the overflow it avoids.
 *
 *  `lead` is how many of those letters something else has already taken —
 *  today, the cake glyph a birthday is printed with
 *  ({@link import("./people/PeopleMarks.tsx").BIRTHDAY_GLYPH_LETTERS}). It is
 *  subtracted **after** the division rather than before, and that is the
 *  whole of the arithmetic: the glyph is set in the caption's own font, so it
 *  grows with the scale exactly as the letters beside it do, and therefore
 *  costs the same *number of letters* at every step of the ladder. A lead
 *  taken off the measured constant instead would cost more letters as the
 *  reader made the caption bigger, which is the wrong way round.
 *
 *  An approximation — letters are not all one width — but the same one the
 *  measured constant is: it is the widest name that sets the threshold, and
 *  a word that happens to fit is unharmed, because the breaker still prefers
 *  the space after it over any hyphen inside it. */
export function minHyphenatedLetters(scale: number, lead = 0): number {
  const n = clampTextScale(scale);
  const fits = Math.floor((MIN_HYPHENATED_LETTERS - 1) / n - lead);
  return Math.max(4, fits + 1);
}

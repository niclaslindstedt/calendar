// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The calendar's faces. A printed wall calendar sets its parts in different
// type — the date big in a bookish serif, the almanac's captions small and
// plain, and whatever you write on it in your own hand — so each of those
// parts picks its face here rather than inheriting one app-wide font.
//
// This module is the *faces* — which typefaces exist, what they cost a
// caption, and how they are fetched. Which piece of which view is set in
// which of them is `viewStyle.ts`'s question, because that answer is per
// view. Nothing outside a day moves either way: the month title and the
// weekday headers keep the display face, and the app's own chrome keeps the
// UI font.
//
// The four webfont families come from the framework (it owns the `@font-face`
// payloads and their lazy loading); the fifth face, `print`, is the app's own
// `--cal-serif` stack — system serifs, no webfont to fetch.

import {
  FONT_FAMILIES,
  loadFontFamily,
  type FontFamilyId,
} from "@niclaslindstedt/oss-framework/theme";

/** A face a calendar piece can be set in: the app's printed-almanac serif, or
 *  one of the framework's bundled families. */
export type CalFontId = "print" | FontFamilyId;

/** The faces, in the order the picker lists them: the printed look first,
 *  since it is what the calendar is imitating. */
export const CAL_FONTS: readonly { id: CalFontId; stack: string }[] = [
  // Resolved at paint time from `--cal-serif` (src/styles.css) rather than
  // inlined, so the display face has one definition.
  { id: "print", stack: "var(--cal-serif)" },
  ...FONT_FAMILIES.map((f) => ({ id: f.id as CalFontId, stack: f.stack })),
];

const STACKS = new Map(CAL_FONTS.map((f) => [f.id, f.stack]));

export function isCalFont(v: unknown): v is CalFontId {
  return typeof v === "string" && STACKS.has(v as CalFontId);
}

/** The font stack a face resolves to; the printed serif for anything a
 *  hand-edited document might carry that we don't recognise. */
export function calFontStack(id: CalFontId): string {
  return STACKS.get(id) ?? "var(--cal-serif)";
}

/** How much a face has to give back in the month cell's caption bands, where
 *  the line is 47 px wide and a name that doesn't fit is clipped rather than
 *  shrunk (AGENTS.md: the caption size is measured, not chosen).
 *
 *  Measured with `canvas.measureText` over every single-word name in the
 *  shipped packs at 7.5 px — the widest is "Bartolomeus" — against the mono
 *  default's 49.5 px, which is the line the cell actually affords:
 *
 *      print 38.3px · sans 44.6px · serif 45.6px · mono 49.5px · dyslexic 63.2px
 *
 *  Only OpenDyslexic overruns; 0.78 brings its widest name back to 49.3 px.
 *  Re-measure when a pack gains a longer name or a face is added. */
export const CAPTION_SCALE: Record<CalFontId, number> = {
  print: 1,
  mono: 1,
  sans: 1,
  serif: 1,
  dyslexic: 0.78,
};

/** How much room two digits need in each face, as a multiple of the size the
 *  date is set at — what the strip row's date column is billed for
 *  (published per view as `--cal-<scope>-date-em` by `viewStyle.ts`, and read
 *  as `--cal-date-em` by `.cal-strip-lane` in `src/styles.css`).
 *
 *  The column has to be a *width* rather than a shrink-wrap: the weekday and
 *  the day's names line up beside it down a whole month, so a column that
 *  narrowed on the 1st and widened on the 10th would give every second row a
 *  different left edge. Which means the width is the widest day the face has
 *  to hold — measured, not assumed. One em was assumed, and it is only true
 *  of the printed serif: every other face overran it and pushed its digits
 *  into the weekday beside them.
 *
 *  Measured with `canvas.measureText` over the days 10–31 in the computed
 *  font, as a multiple of the font size (widest day in brackets):
 *
 *      print 1.00 ["10"] · serif 1.06 ["10"] · mono 1.20 ["10"] ·
 *      sans 1.25 ["30"] · dyslexic 1.32 ["28"]
 *
 *  `print` is the app's own system-serif stack, whose members all set tabular
 *  half-em figures (Iowan Old Style, Palatino, Georgia, Times) — but its tail
 *  is the generic `serif`, which is whatever the device has. That is what the
 *  `2ch` floor in `.cal-strip-date` is for: the box measures the face that
 *  actually resolved, so a wider system serif widens the column even though
 *  the number billed here stayed the same. Re-measure when a face is added. */
export const DATE_COLUMN_EM: Record<CalFontId, number> = {
  print: 1,
  serif: 1.06,
  mono: 1.2,
  sans: 1.25,
  dyslexic: 1.32,
};

/** The room a face's two digits need; the widest shipped face for anything a
 *  hand-edited document might carry that we don't recognise — an unknown face
 *  is better billed generously than sent into the weekday. */
export function dateColumnEm(id: CalFontId): number {
  return DATE_COLUMN_EM[id] ?? 1.35;
}

/** The caption shrink a face needs in the month cell; 1 for anything a
 *  hand-edited document might carry that we don't recognise. */
export function captionScale(id: CalFontId): number {
  return CAPTION_SCALE[id] ?? 1;
}

/** Fetch the `@font-face` payload for every face in use. The stack is applied
 *  regardless, so the fallback paints immediately and the webfont swaps in
 *  when it lands; `print` and the statically-bundled default are no-ops. */
export function loadCalFonts(ids: Iterable<CalFontId>): void {
  for (const id of new Set(ids)) {
    if (id !== "print") void loadFontFamily(id);
  }
}

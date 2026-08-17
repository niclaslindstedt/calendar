// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The calendar's faces. A printed wall calendar sets its parts in different
// type — the date big in a bookish serif, the almanac's captions small and
// plain, and whatever you write on it in your own hand — so each of those
// parts picks its face here rather than inheriting one app-wide font.
//
// The four pieces are exactly what a day cell shows: the day number, the
// holiday, the day's names, and your own text. Settings → Calendar edits
// them; `App.tsx` projects the choice onto `<html>` as one CSS variable per
// piece, and `src/styles.css` has the matching `.cal-font-*` classes the
// views paint with. Nothing else moves: the month title and the weekday
// headers keep the display face, and the app's own chrome keeps the UI font.
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

/** The pieces of a day that carry their own face. */
export const CAL_FONT_PIECES = [
  "day",
  "holidays",
  "nameDays",
  "entry",
] as const;

export type CalFontPiece = (typeof CAL_FONT_PIECES)[number];

/** The CSS variable each piece reads, and `src/styles.css` paints with. */
export const CAL_FONT_VAR: Record<CalFontPiece, string> = {
  day: "--cal-font-day",
  holidays: "--cal-font-holiday",
  nameDays: "--cal-font-nameday",
  entry: "--cal-font-entry",
};

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

/** The faces each piece is set in. */
export type CalFonts = Record<CalFontPiece, CalFontId>;

/** The printed-almanac defaults, and what the app looked like before the
 *  faces were settable: the date in the display serif, everything else in the
 *  UI font. */
export const DEFAULT_CAL_FONTS: CalFonts = {
  day: "print",
  holidays: "mono",
  nameDays: "mono",
  entry: "mono",
};

/** The `<html>` variables for a set of faces — what `App.tsx` writes: a stack
 *  per piece, plus the month cell's caption scales. */
export function calFontVars(fonts: CalFonts): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const piece of CAL_FONT_PIECES) {
    vars[CAL_FONT_VAR[piece]] = calFontStack(fonts[piece]);
  }
  vars["--cal-nameday-scale"] = String(captionScale(fonts.nameDays));
  vars["--cal-holiday-scale"] = String(captionScale(fonts.holidays));
  return vars;
}

/** The caption shrink a face needs in the month cell; 1 for anything a
 *  hand-edited document might carry that we don't recognise. */
export function captionScale(id: CalFontId): number {
  return CAPTION_SCALE[id] ?? 1;
}

/** Fetch the `@font-face` payload for every face in use. The stack is applied
 *  regardless, so the fallback paints immediately and the webfont swaps in
 *  when it lands; `print` and the statically-bundled default are no-ops. */
export function loadCalFonts(fonts: CalFonts): void {
  for (const id of new Set(Object.values(fonts))) {
    if (id !== "print") void loadFontFamily(id);
  }
}

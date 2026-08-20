// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The period heading's optional colour band — the printed almanac's masthead.
//
// A wall calendar prints the month over a coloured bar and then re-uses that
// one colour for the marginalia it wants read as *the calendar's* rather than
// as the day's: the week numbers down the edge, the month's tab. This module
// is that colour, and it is deliberately a short named list rather than a free
// picker: the band sets white text on it and the week numbers set it as ink on
// the page, so every value has to clear both, in both themes. A hex field
// cannot promise that; five measured inks can.
//
// Red is the default — the masthead colour a printed wall calendar reaches
// for. Off is still a swatch, and an uncoloured heading prints its week
// numbers in the page's own ink.

/** The colours a heading can be banded with. `none` is off. */
export const HEADER_COLORS = [
  "none",
  "red",
  "blue",
  "green",
  "plum",
  "ochre",
] as const;

export type HeaderColor = (typeof HEADER_COLORS)[number];

/** What each colour is, as one hex per name.
 *
 *  All five sit in the same narrow luminance band as `--cal-red` (the red is
 *  that same value), which is what lets one hex serve both themes: dark enough
 *  that white text on the band holds AA at the heading's size, light enough
 *  that a week number printed in it is still legible against a dark page. */
export const HEADER_COLOR_HEX: Record<Exclude<HeaderColor, "none">, string> = {
  red: "#c12c26",
  blue: "#1f5f9e",
  green: "#2f7d4f",
  plum: "#7a3f70",
  ochre: "#a8641b",
};

/** What a fresh install bands its heading with. Red is the masthead colour a
 *  printed wall calendar uses, and it is spent twice: the band over the month,
 *  and the week numbers in the strip views' margins, printed in the same ink.
 *  The reader can take it back off — "off" is still one of the swatches. */
export const DEFAULT_HEADER_COLOR: HeaderColor = "red";

/** Where a value we don't recognise lands: off. Not the default above — a
 *  hand-edited setting that means nothing should leave the heading alone
 *  rather than pick a colour for it. */
const UNKNOWN_HEADER_COLOR: HeaderColor = "none";

/** The colour a stored value resolves to. Settings are a plain JSON blob in
 *  localStorage and can be hand-edited, so every read goes through here and an
 *  unknown name lands on "off" rather than painting the heading with a string
 *  that means nothing. */
export function headerColorOf(value: unknown): HeaderColor {
  return HEADER_COLORS.find((c) => c === value) ?? UNKNOWN_HEADER_COLOR;
}

/** The ink a heading band paints in, or `null` when it is off — which the
 *  views read as "the page's own ink", so a week number falls back to the
 *  black it is printed in on an uncoloured almanac. */
export function headerInk(value: unknown): string | null {
  const color = headerColorOf(value);
  return color === "none" ? null : HEADER_COLOR_HEX[color];
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// "Every word counts": the sizing curve for day-entry text. A short note
// renders comfortably large; as the text grows the font shrinks, so the note
// always fits its cell instead of clipping. Pure function so the curve is
// testable and shared by all three views (which pass their own bounds).
//
// The shrink-to-fit curve is the *dynamic* setting. Settings → Entries can
// pin the text instead, at one of three steps (small / medium / large) that
// are resolved inside each view's own [minPx, maxPx] band — so a month cell's
// "large" is still a month cell's size, never the week planner's.

export type EntryFontOptions = {
  /** Font size for a near-empty entry, in px. */
  maxPx: number;
  /** Hard floor — below this the text would be unreadable, in px. */
  minPx: number;
  /** Character count at which the shrink starts. */
  startAt: number;
  /** Character count at which the floor is reached. */
  floorAt: number;
};

/** Month-grid cells are small; start shrinking almost immediately. */
export const MONTH_CELL_FONT: EntryFontOptions = {
  maxPx: 13,
  minPx: 8,
  startAt: 12,
  floorAt: 90,
};

/** Week-planner rows have real room; hold the comfortable size longer. */
export const WEEK_ROW_FONT: EntryFontOptions = {
  maxPx: 16,
  minPx: 10,
  startAt: 60,
  floorAt: 260,
};

/** Day-list rows sit between the two. */
export const LIST_ROW_FONT: EntryFontOptions = {
  maxPx: 15,
  minPx: 9,
  startAt: 30,
  floorAt: 160,
};

/** The zoom's page (`DayZoom`), which is the one surface here that is not a
 *  day of a calendar but a day on its own.
 *
 *  Roughly four times what a month cell can set the same note at, which is the
 *  whole errand: the zoom is opened *because* the note was shrunk to fit a
 *  47 px column, so it has to undo that rather than repeat it. The counts are
 *  pushed out for the same reason — a note only starts shrinking here once it
 *  is longer than anything a cell would have held whole, and the floor is
 *  still comfortably above the cell's ceiling. */
export const ZOOM_NOTE_FONT: EntryFontOptions = {
  maxPx: 26,
  minPx: 16,
  startAt: 200,
  floorAt: 900,
};

/** The font size (px) for an entry of `length` characters: `maxPx` up to
 *  `startAt`, then a linear ramp down to `minPx` at `floorAt`, clamped. */
export function entryFontPx(length: number, opts: EntryFontOptions): number {
  if (length <= opts.startAt) return opts.maxPx;
  if (length >= opts.floorAt) return opts.minPx;
  const t = (length - opts.startAt) / (opts.floorAt - opts.startAt);
  return round1(opts.maxPx - (opts.maxPx - opts.minPx) * t);
}

/** How the entry text is sized: shrink-to-fit, or pinned at one of three
 *  steps. */
export type EntryTextSize = "dynamic" | "small" | "medium" | "large";

export const ENTRY_TEXT_SIZES: readonly EntryTextSize[] = [
  "dynamic",
  "small",
  "medium",
  "large",
];

export type FixedEntryTextSize = Exclude<EntryTextSize, "dynamic">;

/** Where the two upper steps sit in a view's own [minPx, maxPx] band.
 *
 *  The ladder used to be bunched into the bottom of the band — 0.2 and 0.6,
 *  on the reasoning that a day cell is not a page and the sizes people
 *  actually keep are the small ones. In a month cell that put the three
 *  steps at 8, 9 and 11 px: a Small a reader could not read and a Large that
 *  was two points above it. Whatever the ceiling is for, it is not there to
 *  keep the *reader's own* top step three points below it, so the steps take
 *  most of the band now — `large` all but reaching the size a near-empty
 *  note is drawn at on the shrink-to-fit curve, and `medium` sitting between
 *  it and the floor rather than beside the floor.
 *
 *  Nothing here overflows a cell: a pinned size is still measured against the
 *  box the view left it (`entryFit.ts`), and a note too long for its day is
 *  clamped to an ellipsis exactly as it was. What the reader has moved is how
 *  much *fits*, which is the trade the ladder is asking about. */
const FIXED_STEPS: Record<Exclude<FixedEntryTextSize, "small">, number> = {
  medium: 0.45,
  large: 0.85,
};

/** The gap between `small` and `medium`, as a share of the band. A share
 *  rather than the flat point it used to be: a point is a fifth of a month
 *  cell's five-point band and a sixteenth of the week planner's, so the one
 *  number made the smallest step nearly invisible in the view with the most
 *  room to show it in. */
const SMALL_DROP = 0.25;

/** The pinned font size (px) for `size` within the view's band. */
export function fixedEntryFontPx(
  size: FixedEntryTextSize,
  opts: EntryFontOptions,
): number {
  const band = (fraction: number) =>
    opts.minPx + (opts.maxPx - opts.minPx) * fraction;
  if (size === "small") {
    return round1(Math.max(opts.minPx, band(FIXED_STEPS.medium - SMALL_DROP)));
  }
  return round1(band(FIXED_STEPS[size]));
}

/** The font size (px) an entry renders at: the shrink-to-fit curve on
 *  `dynamic`, the pinned step otherwise. This is what the views call. */
export function resolveEntryFontPx(
  length: number,
  opts: EntryFontOptions,
  size: EntryTextSize,
): number {
  return size === "dynamic"
    ? entryFontPx(length, opts)
    : fixedEntryFontPx(size, opts);
}

function round1(px: number): number {
  return Math.round(px * 10) / 10;
}

/** The same band, on a screen with more room than the one it was measured on.
 *
 *  Every number above is a measurement taken on a 393 × 852 portrait phone —
 *  a month cell's note tops out at 13 px because a month cell is 47 px wide —
 *  and a desktop was drawing the identical 13 px in a 356 px cell. The views
 *  hand their band through here with the room factor their scope is printed
 *  at (`roomScale.ts`), which is the same factor `src/styles.css` multiplies
 *  into every other size on the page, so the note grows with the almanac
 *  around it instead of shrinking against it.
 *
 *  The character counts are deliberately left alone: they say when a note is
 *  long enough to want shrinking, which is a fact about the note rather than
 *  about the screen — and the measured fit pass (`entryFit.ts`) is what has
 *  the last word either way. */
export function scaleEntryFont(
  opts: EntryFontOptions,
  room: number,
): EntryFontOptions {
  const factor = Number.isFinite(room) && room > 0 ? room : 1;
  if (factor === 1) return opts;
  return {
    ...opts,
    maxPx: round1(opts.maxPx * factor),
    minPx: round1(opts.minPx * factor),
  };
}

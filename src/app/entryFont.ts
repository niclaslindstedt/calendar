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

/** Where the two upper steps sit in a view's own [minPx, maxPx] band. The
 *  ladder deliberately stops short of the band's ceiling: a day cell is not a
 *  page, and the sizes people actually keep are the small ones — so `large`
 *  is what the band's middle used to be and `medium` what its `small` was.
 *  `small` is then one point under `medium` (see {@link fixedEntryFontPx}),
 *  which is as small as the text goes before the view's own floor takes
 *  over. */
const FIXED_STEPS: Record<Exclude<FixedEntryTextSize, "small">, number> = {
  medium: 0.2,
  large: 0.6,
};

/** One point: the gap between `small` and `medium`. A point rather than a
 *  fraction of the band, so the smallest step reads the same distance below
 *  the middle one in every view. */
const SMALL_DROP_PX = 1;

/** The pinned font size (px) for `size` within the view's band. */
export function fixedEntryFontPx(
  size: FixedEntryTextSize,
  opts: EntryFontOptions,
): number {
  const band = (fraction: number) =>
    opts.minPx + (opts.maxPx - opts.minPx) * fraction;
  if (size === "small") {
    return round1(
      Math.max(opts.minPx, band(FIXED_STEPS.medium) - SMALL_DROP_PX),
    );
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

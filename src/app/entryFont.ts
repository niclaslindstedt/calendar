// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// "Every word counts": the sizing curve for day-entry text. A short note
// renders comfortably large; as the text grows the font shrinks, so the note
// always fits its cell instead of clipping. Pure function so the curve is
// testable and shared by all three views (which pass their own bounds).

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
  return Math.round((opts.maxPx - (opts.maxPx - opts.minPx) * t) * 10) / 10;
}

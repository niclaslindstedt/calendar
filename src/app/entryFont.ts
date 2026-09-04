// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// "Every word counts": the room each view leaves a day's note, and the word
// this app persists for how that room is spent.
//
// The *machinery* is the framework's (`@niclaslindstedt/oss-framework/fit`) —
// the shrink curve, the three fixed steps within a band, and the measured pass
// that has the last word. What is the calendar's, and stays here, is the set
// of **bands**: four measurements, one per surface, taken on a 393 × 852
// portrait phone. A month cell's note tops out at 13 px because a month cell
// is 47 px wide; that is not a number the framework can know.
//
// The other app-owned thing is the vocabulary. The framework calls the
// shrink-to-fit mode `"auto"`; this app has persisted it as `"dynamic"` since
// before there was a framework, and a stored setting is not worth renaming —
// so the word is translated at the one call below rather than migrated in
// every document.

import {
  bandFontPx,
  fixedFontPx,
  resolveFontPx,
  type SizeBand,
} from "@niclaslindstedt/oss-framework/fit";

/** The band a surface sizes its note in. The framework's shape, re-exported
 *  under the name the views have always called it. */
export type EntryFontOptions = SizeBand;

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

/** How the entry text is sized: shrink-to-fit, or pinned at one of three
 *  steps. `"dynamic"` is this app's word for the framework's `"auto"`. */
export type EntryTextSize = "dynamic" | "small" | "medium" | "large";

export const ENTRY_TEXT_SIZES: readonly EntryTextSize[] = [
  "dynamic",
  "small",
  "medium",
  "large",
];

export type FixedEntryTextSize = Exclude<EntryTextSize, "dynamic">;

/** The font size (px) for an entry of `length` characters on the shrink-to-fit
 *  curve. */
export function entryFontPx(length: number, opts: EntryFontOptions): number {
  return bandFontPx(length, opts);
}

/** The pinned font size (px) for `size` within the view's band. */
export function fixedEntryFontPx(
  size: FixedEntryTextSize,
  opts: EntryFontOptions,
): number {
  return fixedFontPx(size, opts);
}

/** The font size (px) an entry renders at: the shrink-to-fit curve on
 *  `dynamic`, the pinned step otherwise. This is what the views call. */
export function resolveEntryFontPx(
  length: number,
  opts: EntryFontOptions,
  size: EntryTextSize,
): number {
  return resolveFontPx(length, opts, size === "dynamic" ? "auto" : size);
}

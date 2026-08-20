// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Crossing off the days that have gone — the pencil stroke people draw on a
// paper calendar to see at a glance where in the month they are.
//
// This is the pure half: which days count as passed, which of the two marks
// is drawn, and where the stroke runs inside the box that carries it. The
// stroke itself is drawn by `PastMark.tsx`, which reads the geometry from
// here so the settings preview, the three views and the tests all agree on
// what a "cross" is.
//
// Not everyone wants their calendar written on, so the whole thing is off
// until it is turned on in Settings → Calendar → Passed days.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { parseDayKey } from "@niclaslindstedt/oss-framework/calendar";

/** The strokes a passed day can be marked with. `cross` is the two-line ✕,
 *  `slash` the single stroke a thicker pen leaves. */
export const PAST_MARK_STYLES = ["none", "cross", "slash"] as const;

export type PastMarkStyle = (typeof PAST_MARK_STYLES)[number];

/** How much of the day the stroke covers: the date alone, which leaves the
 *  day's captions and anything you wrote there unobstructed, or the whole
 *  cell (a month cell, a week-planner row, a day-list row).
 *
 *  In that order, because it is the order the buttons are printed in and the
 *  narrower mark is the default — the wider one is the deliberate step out to
 *  a stroke across everything you wrote. */
export const PAST_MARK_SCOPES = ["date", "cell"] as const;

export type PastMarkScope = (typeof PAST_MARK_SCOPES)[number];

/** The setting as the views read it. */
export type PastMark = { style: PastMarkStyle; scope: PastMarkScope };

/** Off, and — once it is turned on — over the number alone: crossing a day
 *  off is about seeing where in the month you are, which the date says by
 *  itself, so the mark starts where it obscures the least. */
export const DEFAULT_PAST_MARK: PastMark = { style: "none", scope: "date" };

/** The stored style, snapped back onto the known set — a hand-edited
 *  document (or one written by an older build) can carry anything, and an
 *  unknown value means "don't draw on my calendar". */
export function pastMarkStyle(value: unknown): PastMarkStyle {
  return PAST_MARK_STYLES.includes(value as PastMarkStyle)
    ? (value as PastMarkStyle)
    : "none";
}

/** The stored scope, snapped the same way. */
export function pastMarkScope(value: unknown): PastMarkScope {
  return PAST_MARK_SCOPES.includes(value as PastMarkScope)
    ? (value as PastMarkScope)
    : DEFAULT_PAST_MARK.scope;
}

/** Whether a day is behind us. Today is *not* passed — it is the day you are
 *  living in, and the whole point of the mark is that the run of crosses
 *  stops at it. Day keys are `YYYY-MM-DD`, so they sort as strings; anything
 *  that isn't one is not marked rather than compared as text. */
export function isPastDay(day: DayKey, today: DayKey): boolean {
  if (!parseDayKey(day) || !parseDayKey(today)) return false;
  return day < today;
}

/** Which slot draws the mark for this day, or `null` for none. One call at
 *  the top of a day so a view asks the question once and hands the answer to
 *  whichever of its two boxes — the cell or the date — is meant to carry the
 *  stroke. */
export function pastMarkSlot(
  mark: PastMark,
  day: DayKey,
  today: DayKey,
): PastMarkScope | null {
  if (mark.style === "none") return null;
  return isPastDay(day, today) ? mark.scope : null;
}

/** One stroke, in the 0–100 box `PastMark` draws into. */
export type MarkLine = { x1: number; y1: number; x2: number; y2: number };

/** How far the stroke stops short of the box's corners. A hand-drawn cross
 *  overshoots rather than stopping short, but a cell's corners hold the date
 *  and the captions, so the stroke gives them the last few percent. */
const INSET = 6;

const A = INSET;
const B = 100 - INSET;

/** The strokes a style is drawn with, corner to corner in a 0–100 box. The
 *  slash runs bottom-left to top-right — the "/" of the setting's own label,
 *  and the direction a right-handed pen leaves. */
export function markLines(style: PastMarkStyle): readonly MarkLine[] {
  if (style === "cross") {
    return [
      { x1: A, y1: A, x2: B, y2: B },
      { x1: A, y1: B, x2: B, y2: A },
    ];
  }
  if (style === "slash") return [{ x1: A, y1: B, x2: B, y2: A }];
  return [];
}

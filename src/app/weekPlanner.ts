// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week planner's own arithmetic — the pieces of the printed week strip
// that are a number rather than a layout, kept out of the view so they can be
// tested without a DOM.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { parseDayKey } from "@niclaslindstedt/oss-framework/calendar";

/** The day's ordinal in its year — 1 on 1 January, 365 (366 in a leap year)
 *  on 31 December. The small number a Swedish column calendar prints beside
 *  the weekday; off by default, on from Settings → Calendar → Week planner.
 *
 *  Computed from UTC midnights so it can never be moved by a DST boundary
 *  falling between the year's start and the day being counted: local-midnight
 *  arithmetic is 23 or 25 hours out across a transition, which rounds a day
 *  either side of the change to the wrong ordinal. Returns 0 for a key that
 *  isn't a date, the same "nothing to print" answer the views' other lookups
 *  give. */
export function dayOfYear(key: DayKey): number {
  const parts = parseDayKey(key);
  if (!parts) return 0;
  const day = Date.UTC(parts.year, parts.month - 1, parts.day);
  const start = Date.UTC(parts.year, 0, 1);
  return Math.round((day - start) / 86_400_000) + 1;
}

/** Whether a weekday opens its week in this country — where the almanac
 *  prints the week number, and where the strip draws its heavier rule. Takes
 *  the pack's own start of week (Monday in both shipped packs, Sunday in a
 *  pack that follows the US convention). */
export function startsWeek(weekday: number, weekStartsOn: number): boolean {
  return weekday === weekStartsOn;
}

/** Week-planner rows: every row the same height, or grown by its text.
 *
 *  The same two words the day list's rows use, and the same meaning — but a
 *  separate setting, because the two views are not making the same trade. A
 *  fixed day-list row is one line of a ninety-row scroll; a fixed week row is
 *  a seventh of the screen, and letting it grow turns the one view that fits
 *  a week on a screen into another scroller. Someone can reasonably want that
 *  in one view and not the other. */
export type WeekRowMode = "fixed" | "dynamic";

export const WEEK_ROW_MODES: readonly WeekRowMode[] = ["fixed", "dynamic"];

export function weekRowModeOf(value: unknown): WeekRowMode {
  return WEEK_ROW_MODES.find((m) => m === value) ?? "fixed";
}

/** How the week number is printed in the strip's margin.
 *
 *  Three ways of saying the same thing, and which one is right is a question
 *  about the reader rather than about the layout: `long` spells it out
 *  ("Vecka 34"), `mark` is the printed almanac's abbreviation ("v 34" in
 *  Swedish, "w 34" in English) and `bare` is the number alone, the way the
 *  month grid's gutter prints it once the column has said "week" by itself.
 *  `mark` is the default — it is what the Swedish column calendar this strip
 *  is drawn from prints, and it reads as a week number without spending the
 *  margin's width on the word. */
export type WeekFormat = "long" | "mark" | "bare";

export const WEEK_FORMATS: readonly WeekFormat[] = ["long", "mark", "bare"];

export const DEFAULT_WEEK_FORMAT: WeekFormat = "mark";

export function weekFormatOf(value: unknown): WeekFormat {
  return WEEK_FORMATS.find((f) => f === value) ?? DEFAULT_WEEK_FORMAT;
}

/** The margin's week label. The two phrasings are handed in already
 *  translated — the wording is the i18n catalog's business, which of them is
 *  printed is this module's — so the choice stays a pure function and the
 *  number standing alone needs no catalog entry at all. */
export function weekNumberLabel(
  format: unknown,
  n: number,
  phrases: { long: string; mark: string },
): string {
  switch (weekFormatOf(format)) {
    case "long":
      return phrases.long;
    case "mark":
      return phrases.mark;
    default:
      return String(n);
  }
}

/** How big the date is set at the head of a week row.
 *
 *  A setting of its own rather than a step on the shared ladder
 *  (`textSize.ts`): that ladder is a *scale* of each piece's measured size and
 *  it stops at 1.25 because the month cell's caption band stops holding two
 *  names past it — a ceiling that has nothing to say about a week row, which
 *  is four times as tall as a month cell and whose date is the one thing read
 *  from across a room. So the week strip picks its own base and the shared
 *  scale still multiplies it: someone who has set day numbers Large gets a
 *  large version of whichever base they chose here.
 *
 *  `medium` is the measured default — the largest date that still leaves a
 *  portrait row its weekday and a line of names at the top of the shared
 *  ladder. `huge` is deliberately twice that: a wall-planner date, for a week
 *  read at a glance rather than up close. */
export type WeekDateSize = "small" | "medium" | "large" | "huge";

export const WEEK_DATE_SIZES: readonly WeekDateSize[] = [
  "small",
  "medium",
  "large",
  "huge",
];

export const DEFAULT_WEEK_DATE_SIZE: WeekDateSize = "medium";

/** What each step sets the date at, as the `--cal-base` the row hands the
 *  `.cal-size-day` rule. In rem so it follows the browser's own text size. */
export const WEEK_DATE_SIZE_REM: Record<WeekDateSize, number> = {
  small: 1.25,
  medium: 1.5,
  large: 2.25,
  huge: 3,
};

export function weekDateSizeOf(value: unknown): WeekDateSize {
  return WEEK_DATE_SIZES.find((s) => s === value) ?? DEFAULT_WEEK_DATE_SIZE;
}

/** The CSS length a step sets — what the view publishes as `--cal-date`, and
 *  what `src/styles.css` bills the lane's date column for. */
export function weekDateBase(value: unknown): string {
  return `${WEEK_DATE_SIZE_REM[weekDateSizeOf(value)]}rem`;
}

/** The floor a grown row keeps.
 *
 *  A seventh of a 393×852 portrait phone, minus the app's chrome, is about
 *  98 px — so a dynamic week whose days are all empty has to look like the
 *  fixed one rather than collapsing to seven captions. 6rem is that height at
 *  the default type scale; a row with more text than fits grows past it. */
export const WEEK_ROW_MIN_HEIGHT = "6rem";

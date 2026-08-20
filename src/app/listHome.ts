// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which row the day list opens on. The other two views fill a screen, so
// "today" is simply the period they are showing; the list is a ninety-row
// scroll, and a month whose 1st is at the top can have today three thumb
// flicks below the fold. So the month you are living in opens at the week you
// are in — the week rather than the day, because a date with the days around
// it is a place in the month, and a date alone at the top of the screen is
// not.
//
// Pure, and separate from the view, for the same reason `paths.ts` is: the
// month boundaries and the country's start of week are exactly the arithmetic
// that goes wrong quietly (a Sunday in a Monday-first pack belongs to the week
// that began six days ago, in the month before, half the time).

import {
  parseDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";

/** The day of the month the list should put at the top of its scroll, or
 *  `null` for "the top of the month", which is where every period that is not
 *  today's opens.
 *
 *  `weekStartsOn` is the country pack's own (0 = Sunday), so a Sunday opens
 *  the week in the UK and closes it in Sweden. A week that began in the month
 *  before is not a row this month has, and its answer is `null` rather than a
 *  clamp to the 1st: opening at the 1st *is* opening at the top, and saying so
 *  lets the list keep whatever it prints above its first row — a month image —
 *  on screen instead of scrolling it away for nothing. */
export function listHomeDay(
  year: number,
  month: number,
  today: DayKey,
  weekStartsOn: number,
): number | null {
  const on = parseDayKey(today);
  if (!on || on.year !== year || on.month !== month) return null;
  // Midday UTC, the same reading of a `DayKey` the views take: a date parsed
  // at midnight is the day before in any negative offset.
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const into = (weekday - weekStartsOn + 7) % 7;
  const first = on.day - into;
  return first > 1 ? first : null;
}

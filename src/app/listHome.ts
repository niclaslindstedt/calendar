// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Where the day list opens a month. The other two views fill a screen, so
// "today" is simply the period they are showing; the list is a ninety-row
// scroll, and a month whose 1st is at the top can have today three thumb
// flicks below the fold.
//
// Two answers, and which one applies is *how you got here*:
//
//   - You **opened** on the month — booted, pressed the way home, switched
//     view, picked a date. Then the month you are living in opens at the week
//     you are in — the week rather than the day, because a date with the days
//     around it is a place in the month, and a date alone at the top of the
//     screen is not. Every other month opens at its top.
//   - You **paged** to it. Then the month opens at the end you came in
//     through: forward at its 1st, back at its last day — today's month
//     included. That is what a paper calendar does when you turn its page,
//     and in the day list it is not even a metaphor: with up/down navigation
//     the page turn *is* the scroll running off the end of the month, so
//     landing anywhere but the edge you arrived at leaves a gap in a gesture
//     that reads as one continuous scroll. Turning back a page and finding
//     the month's 1st — or worse, the middle of it — is the same jump the
//     other way.
//
// Pure, and separate from the view, for the same reason `paths.ts` is: the
// month boundaries and the country's start of week are exactly the arithmetic
// that goes wrong quietly (a Sunday in a Monday-first pack belongs to the week
// that began six days ago, in the month before, half the time).

import {
  parseDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";

/** How the list came to be showing the month it is showing: `"open"` for
 *  landing on it from outside (boot, the way home, a view switch, a picked
 *  name day), or the direction a page turn travelled to reach it. */
export type ListArrival = "open" | "forward" | "back";

/** Where the list opens a month's scroll: a day of the month to bring to the
 *  top, `"end"` for the bottom of the list, or `null` for its top. */
export type ListHome = number | "end" | null;

/** The day of the month the list should put at the top of its scroll, or
 *  `null` for "the top of the month".
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

/** Where the list opens the month, given how you arrived at it.
 *
 *  A paged-to month answers by the direction alone — the 1st going forward,
 *  the last day going back — and does so for *every* month, today's included:
 *  the point of the rule is that the page you turn to begins where the page
 *  you left ended, and a month that jumped to the middle of itself because
 *  today happens to be in it breaks exactly that. Today's week is the answer
 *  to a different question ("put me where I am"), and pressing the way home is
 *  how it is asked. */
export function listOpensAt(
  year: number,
  month: number,
  today: DayKey,
  weekStartsOn: number,
  arrival: ListArrival,
): ListHome {
  if (arrival === "forward") return null;
  if (arrival === "back") return "end";
  return listHomeDay(year, month, today, weekStartsOn);
}

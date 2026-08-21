// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The handful of layout measurements the views share. They live here rather
// than as literals in three view files because portrait mobile is the primary
// target (see AGENTS.md) and these are exactly the numbers that go wrong when
// only one of the three views is checked.

/** The gap under a view's last row.
 *
 *  The number itself is resolved at runtime by `src/app/safeArea.ts`, which
 *  reads the device's safe-area insets and publishes this custom property on
 *  `<html>`; `src/styles.css` carries the fallback that holds until it does.
 *  It is computed there rather than written here — or in the stylesheet,
 *  where it used to live — because the value needs a *comparison*: the home
 *  indicator's band has to be floored at the 34 px it actually occupies
 *  rather than taken on the inset's word, and `env()` inside a CSS `max()`
 *  is precisely the expression the installed iOS app refused to compute,
 *  leaving `padding-bottom` at its initial 0 and the last row hanging off the
 *  bottom of the screen. Either way the last row keeps a visible margin —
 *  `GUTTER_MARGIN` — under whatever band the device reserved. */
export const CONTENT_BOTTOM_PAD = "var(--cal-bottom-gutter)";

/** The bottom gutter for a view whose last row has to be *scrolled* into view
 *  rather than laid out on screen — the day list, the week planner on its
 *  growing rows, and the holidays screen. That costs such a view twice: the
 *  row arrives flush against the bottom edge with nothing under it to read as
 *  an end, and a scroll container's trailing padding is not reliably counted
 *  into the scrollable overflow by every engine — so on a phone the last day
 *  could not be brought fully into view at all. Hence the shared gutter plus
 *  another 20 px (`--cal-list-gutter`), and a real spacer element rather than
 *  padding (see `DayListView`). A scrolling view reaches for this one;
 *  `CONTENT_BOTTOM_PAD` is for the views that lay their last row out. */
export const LIST_BOTTOM_PAD = "var(--cal-list-gutter)";

/** The month grid's week-number gutter, as the grid column it occupies.
 *
 *  20 px is a measurement, like the cell's caption size: at the gutter's own
 *  10 px the widest of the 53 possible labels is 11.12 px, and a week number
 *  is never three digits, so the lane is that number plus the ~9 px of air
 *  that becomes the gap before the first day column. (The number's *left*
 *  edge is the section's 12 px padding, which matches the 12 px the grid
 *  leaves on the right — that symmetry is the padding's, not the lane's.)
 *
 *  Being a measurement, it carries the same two factors the number printed in
 *  it does — the reader's step for the week number, and the room the screen
 *  has (`roomScale.ts`). Left as a flat 20 px it was the one width the room
 *  work missed: on a desk monitor at the ladder's top step the number is
 *  30 px in a 20 px lane, so it ran ten pixels past its own column and drew
 *  straight through the first day column's rule. Both factors, because they
 *  both size the digits, and a lane that grew by only one of them would be
 *  back to crowding the grid at the other's top step. */
export const WEEK_GUTTER_COLUMN =
  "calc(1.25rem * var(--cal-size-week, 1) * var(--cal-room, 1))";

/** The month grid's `grid-template-columns`: seven equal day columns, with the
 *  week gutter ahead of them when the country prints one. Both the weekday
 *  header row and every week row are laid out with it, so a gutter that
 *  changed width would have to change in both — which is why the two read it
 *  from here rather than each carrying the literal. */
export function monthGridColumns(showWeekNumbers: boolean): string {
  const days = "repeat(7, minmax(0, 1fr))";
  return showWeekNumbers
    ? `grid-template-columns: ${WEEK_GUTTER_COLUMN} ${days}`
    : `grid-template-columns: ${days}`;
}

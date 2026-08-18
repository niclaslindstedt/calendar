// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The handful of layout measurements the views share. They live here rather
// than as literals in three view files because portrait mobile is the primary
// target (see AGENTS.md) and these are exactly the numbers that go wrong when
// only one of the three views is checked.

/** The gap under a view's last row.
 *
 *  The number itself lives in `src/styles.css` (`--cal-bottom-gutter`) rather
 *  than here, because an installed iOS PWA needs a different value and only a
 *  media query knows it is one: the shell is pinned to `100vh` there so the
 *  page reaches under the home indicator, and
 *  `env(safe-area-inset-bottom)` — the thing that is supposed to describe
 *  that band — cannot be trusted to report it. A gutter derived from the
 *  inset shipped once already and the bottom week still came out under the
 *  swipe bar. So the iOS value takes the larger of the inset and the 34 px an
 *  iPhone's home indicator actually occupies, and adds the clear margin on
 *  top; everywhere else the gutter is a plain floor plus whatever the device
 *  reserves. Either way the last row keeps 16 px of visible breathing room. */
export const CONTENT_BOTTOM_PAD = "var(--cal-bottom-gutter)";

/** The day list's own bottom gutter. It is the one view whose last row has to
 *  be *scrolled* into view rather than laid out on screen, which costs it
 *  twice: the row arrives flush against the bottom edge with nothing under it
 *  to read as an end, and a scroll container's trailing padding is not
 *  reliably counted into the scrollable overflow by every engine — so on a
 *  phone the last day could not be brought fully into view at all. Hence the
 *  shared gutter plus another 20 px (`--cal-list-gutter`), and a real spacer
 *  element rather than padding (see `DayListView`). */
export const LIST_BOTTOM_PAD = "var(--cal-list-gutter)";

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
 *  bottom of the screen. Either way the last row keeps 16 px of visible
 *  breathing room. */
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

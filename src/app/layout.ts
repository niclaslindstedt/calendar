// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The handful of layout measurements the views share. They live here rather
// than as literals in three view files because portrait mobile is the primary
// target (see AGENTS.md) and these are exactly the numbers that go wrong when
// only one of the three views is checked.

/** The gap under a view's last row.
 *
 *  The home indicator's inset is *not* a margin: it is the band the swipe bar
 *  itself lives in, so a gutter of `max(15px, env(safe-area-inset-bottom))`
 *  spends all of it on the indicator and leaves the last week row butted
 *  against the bar with nothing under it — which is exactly how it reads on an
 *  installed iOS PWA. So the clear margin is added *on top of* whatever the
 *  device reserves rather than measured against it: 10 px of visible breathing
 *  room below the last row everywhere, floored at 25 px on a phone that
 *  reserves nothing (the old 15 px plus the same 10 px). */
export const CONTENT_BOTTOM_PAD =
  "max(25px, calc(env(safe-area-inset-bottom) + 10px))";

/** The day list's own bottom gutter. It is the one view whose last row has to
 *  be *scrolled* into view rather than laid out on screen, which costs it
 *  twice: the row arrives flush against the bottom edge with nothing under it
 *  to read as an end, and a scroll container's trailing padding is not
 *  reliably counted into the scrollable overflow by every engine — so on a
 *  phone the last day could not be brought fully into view at all. Hence a
 *  floor *on top of* the home indicator's inset rather than the larger of the
 *  two, and a real spacer element rather than padding (see `DayListView`). It
 *  carries the same 10 px of clear margin as `CONTENT_BOTTOM_PAD`. */
export const LIST_BOTTOM_PAD = "calc(30px + env(safe-area-inset-bottom))";

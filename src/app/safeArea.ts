// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The named numbers behind the two chrome measurements that depend on the
// device's safe areas: the clear space the top menu leaves *above* its
// buttons, and the gap a view leaves *below* its last row.
//
// The arithmetic on them is `src/styles.css`'s, not this module's. It was
// JavaScript's for a while — this file read the insets and published both
// lengths on `<html>` — and that arrangement is worth writing down, because
// its failure is the reason it is gone.
//
// It started with an expression the installed iOS app would not compute:
//
//   - `padding-top: max(var(--cal-header-pad), env(safe-area-inset-top))` was
//     dropped as an invalid declaration, so the bar fell back to the rule
//     above it and kept stacking its own 12 px on top of the status-bar
//     inset — the gap over the buttons came out half again the gap under
//     them.
//   - `--cal-bottom-gutter: max(25px, calc(env(...) + 16px))` is a custom
//     property, so nothing rejects it at parse time; it fails later, when
//     `padding-bottom: var(--cal-bottom-gutter)` substitutes it. A `var()`
//     that is invalid at computed-value time falls back to the property's
//     initial value — `padding-bottom: 0` — which is why the last week row
//     ran off the bottom of the screen with no gutter at all rather than
//     with a gutter that was merely too small.
//
// The fix moved the arithmetic here, where a comparison is just `Math.max`,
// and left a fallback in the stylesheet for the frame before this module had
// measured. That fallback was a *browser tab's* arithmetic — and a fallback is
// not a formality: whenever the published value did not land, the installed
// app laid itself out with a tab's answers and both measurements were visibly
// wrong again, in exactly the two ways above. Publishing from JS bought one
// comparison and cost the guarantee that the value on the page is a value that
// computes.
//
// So the answers are the stylesheet's outright, the way the sibling `contacts`
// app has always had them, and the comparisons are made by *scope* rather than
// by `max()`: inside `@supports (-webkit-touch-callout: none)` and
// `@media (display-mode: standalone)` the app is known to be an installed
// iPhone, so the status-bar band is known to be the whole lead and the home
// indicator is known to be there. Nothing writes these properties at runtime,
// which is what makes "every value on the page computes" a property of the
// file rather than a hope about the network.
//
// What is left here is the vocabulary: the numbers, named, so the stylesheet
// is held to them by `tests/layout_test.ts` rather than carrying bare
// literals — and so the prose above has somewhere to live.

/** The top menu's own breathing room — Tailwind's `py-3` step, the sibling
 *  `notes` app's header padding. It is the gap under the buttons, and in a
 *  browser tab the gap over them as well (there the inset is 0 in portrait).
 *  The installed app spends the status-bar band over them instead: the band
 *  already leaves room below the notch, and the air it leaves comes out at
 *  about this same number, which is what makes the bar read as centred rather
 *  than top-heavy. */
export const HEADER_PAD = 12;

/** The visible margin below a view's last row, on top of whatever band the
 *  device reserves for itself.
 *
 *  24 rather than the 16 it shipped with: the band it sits on is the home
 *  indicator's, the swipe bar is drawn inside that band with its own air
 *  around it, and 16 px of clear space read as the last row's descenders
 *  resting on the bar rather than as a margin under the calendar. */
export const GUTTER_MARGIN = 24;

/** The band an iPhone's home indicator occupies.
 *
 *  A constant rather than a reading. `env(safe-area-inset-bottom)` is supposed
 *  to describe this band and has been seen reporting `0` in the installed app
 *  while the swipe bar was still on screen — which is why the stylesheet stops
 *  asking inside the installed-app block and spends this instead. */
export const HOME_INDICATOR = 34;

/** The day list scrolls its last row into view instead of laying it out, so
 *  it carries this much more than the shared gutter. */
export const LIST_EXTRA = 20;

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The two chrome measurements that depend on the device's safe areas: the
// clear space the top menu leaves *above* its buttons, and the gap a view
// leaves *below* its last row.
//
// Both used to be arithmetic in the stylesheet, written as `max()` over
// `env(safe-area-inset-*)`. That expression is the reason this module exists.
// On the installed iOS app neither value computed:
//
//   - `padding-top: max(var(--cal-header-pad), env(safe-area-inset-top))` was
//     dropped as an invalid declaration, so the bar fell back to the rule
//     above it and kept stacking its own 12 px on top of the 59 px status-bar
//     inset — the gap over the buttons came out at roughly twice the gap
//     under them.
//   - `--cal-bottom-gutter: max(25px, calc(env(...) + 16px))` is a custom
//     property, so nothing rejects it at parse time; it fails later, when
//     `padding-bottom: var(--cal-bottom-gutter)` substitutes it. A `var()`
//     that is invalid at computed-value time falls back to the property's
//     initial value — `padding-bottom: 0` — which is why the last week row
//     ran off the bottom of the screen with no gutter at all rather than
//     with a gutter that was merely too small.
//
// Same bug, two faces, and it is why fixing the gutter twice inside the same
// expression changed nothing. So the rule for this app is now:
//
//   **never put `env()` inside `min()`, `max()` or `clamp()`.**
//
// The stylesheet keeps only what a plain `calc(env(…) + <length>)` can say,
// which every engine computes, and the numbers that need a comparison are
// resolved here — where a comparison is just `Math.max` — and published to
// `<html>` as plain pixel lengths. `src/app/layout.ts` still hands the views
// the variable names; only who *computes* them has moved.
//
// Keeping them in JS has a second payoff: the values are pure functions of
// four numbers and a boolean, so `tests/safe_area_test.ts` can assert the
// iOS-standalone geometry on a machine that has no safe areas at all.

import { readInsets, type Insets } from "./viewportInfo.ts";

/** The top menu's own breathing room — Tailwind's `py-3` step, the sibling
 *  `notes` app's header padding. It is the gap under the buttons (where the
 *  stylesheet spends it, as `--cal-header-pad`), and the gap over them
 *  everywhere the device does not reserve a band of its own. The two are the
 *  same number because a bar whose gaps match reads as centred rather than
 *  top-heavy; `tests/layout_test.ts` holds the stylesheet to it. */
export const HEADER_PAD = 12;

/** The visible margin below a view's last row, on top of whatever band the
 *  device reserves for itself.
 *
 *  It is 24 rather than the 16 it shipped with because the band it sits on is
 *  the home indicator's, and the swipe bar is drawn *inside* that band with
 *  its own air around it — so 16 px of clear space read as the last row's
 *  descenders resting on the bar rather than as a margin under the calendar.
 *  `src/styles.css` restates it as `--cal-gutter-margin`, and
 *  `tests/layout_test.ts` holds the two to the same number. */
export const GUTTER_MARGIN = 24;

/** The smallest bottom gutter, for a device that reserves nothing. */
export const GUTTER_FLOOR = 25;

/** The band an iPhone's home indicator occupies. The bottom inset is supposed
 *  to describe it and has been seen reporting 0 in the installed app, so a
 *  device that is demonstrably a notched phone (see `SAFE_TOP_MIN`) gets this
 *  as the floor for the band rather than the inset's word for it.
 *
 *  `src/styles.css` carries the same number, as `--cal-home-indicator` in the
 *  block an installed iOS app falls back to: a fallback that took the inset's
 *  word for the band is how the last week row ended up under the swipe bar
 *  even with this floor written here. */
export const HOME_INDICATOR = 34;

/** A top inset this large is a notch or a Dynamic Island — no browser chrome
 *  reserves that much — and a phone with one has a home indicator too. It is
 *  the evidence the bottom floor above is applied on, so the floor never
 *  costs a device that genuinely has no gesture bar. */
export const SAFE_TOP_MIN = 40;

/** The day list scrolls its last row into view instead of laying it out, so
 *  it carries this much more than the shared gutter. */
export const LIST_EXTRA = 20;

/** The gap above the top menu's buttons.
 *
 *  In a browser tab the pad *adds* to the inset: the inset is 0 in portrait,
 *  so the bar simply gets its `py-3`, and on a notched phone in landscape the
 *  bar still clears the notch.
 *
 *  In an installed app the inset is the whole status-bar band — 59 px on a
 *  Dynamic Island phone, 20 px without one — and it already leaves room below
 *  the island. Adding the pad on top of that is what made the chrome
 *  top-heavy, so the two are compared instead: the inset wins on any phone,
 *  and the pad floors it for an installed app on a device that reserves
 *  nothing (an Android PWA, a desktop window). */
export function topbarLead(insetTop: number, standalone: boolean): number {
  return standalone ? Math.max(HEADER_PAD, insetTop) : insetTop + HEADER_PAD;
}

/** The gap under a view's last row: the band the device reserves, plus a
 *  visible margin, never below the floor.
 *
 *  The band is the reported bottom inset, except on an installed app on a
 *  phone that reports a notch — there it is at least the home indicator's own
 *  34 px, because that inset has been seen reporting nothing while the swipe
 *  bar was very much still there. */
export function bottomGutter(insets: Insets, standalone: boolean): number {
  const notched = standalone && insets.top >= SAFE_TOP_MIN;
  const band = notched
    ? Math.max(insets.bottom, HOME_INDICATOR)
    : insets.bottom;
  return Math.max(GUTTER_FLOOR, band + GUTTER_MARGIN);
}

/** The day list's taller gutter, derived from the shared one so the two can
 *  never drift apart. */
export function listGutter(gutter: number): number {
  return gutter + LIST_EXTRA;
}

/** The three lengths, as the custom properties `src/styles.css` reads. */
export function safeAreaVars(
  insets: Insets,
  standalone: boolean,
): Record<string, string> {
  const gutter = bottomGutter(insets, standalone);
  return {
    "--cal-topbar-lead": `${topbarLead(insets.top, standalone)}px`,
    "--cal-bottom-gutter": `${gutter}px`,
    "--cal-list-gutter": `${listGutter(gutter)}px`,
  };
}

/** Whether the app is running as an installed app rather than in a tab.
 *
 *  Both signals are asked for: `display-mode` is the standard one, and
 *  `navigator.standalone` is the iOS home-screen flag that predates it — the
 *  layout this decides has been wrong on exactly that device, so it does not
 *  hang on one probe answering. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const legacy = (navigator as { standalone?: boolean }).standalone === true;
  return legacy || window.matchMedia("(display-mode: standalone)").matches;
}

/** Resolve the device's safe areas and publish the lengths on `<html>`.
 *  Cheap enough to call on every resize: two DOM writes and a read. */
export function applySafeAreaVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(
    safeAreaVars(readInsets(), isStandalone()),
  )) {
    root.style.setProperty(name, value);
  }
}

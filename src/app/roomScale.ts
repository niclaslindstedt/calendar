// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How much bigger the almanac is set on a screen with more room than the one
// it was measured on.
//
// Every printed size in this app is a measurement taken on a 393 × 852
// portrait phone: the month cell's 7.5 px caption is what lets the widest
// name hold a 47 px line, the strip lane's 4.25 rem floor is "Wednesday" in
// the lane's serif, the entry bands in `entryFont.ts` are the room a phone's
// cell leaves a note. That is the right way to size a phone-first PWA, and it
// is why the reader's own ladder (`textSize.ts`) is a *scale* of those
// measurements rather than a px value.
//
// What it is not is the whole answer. Those numbers were shipped as absolute
// lengths, so a 2560 × 1440 desktop drew a 356 px-wide month cell and printed
// its name days at the same 7.5 px a 47 px cell gets — which is not type
// anybody reads from a desk. Mobile looked right because mobile is what was
// measured.
//
// So the measurement gets a second factor beside the reader's: the **room**
// the screen actually has. It is published per scope like everything else in
// `viewStyle.ts` — the month grid spans the window and the strip views are
// capped at `max-w-3xl`, so the two do not have the same amount of room — and
// it reaches CSS as `--cal-room`, which `src/styles.css` multiplies into
// every size the same way it multiplies `--cal-size-*`.
//
// ## Two measured screens, one curve
//
// The factor is a function of the screen's **area**, which is the ordinary
// way type scales: a page holds a fixed number of *lines of a given length*
// rather than a fixed number of characters, so neither dimension answers on
// its own —
//
//   - width alone would grow a landscape phone's type by half again on a
//     screen where the six week rows have to share 393 px of height;
//   - height alone would tell a 1440 × 900 laptop it has no more room than a
//     phone, when its month cell is four times as wide. It is not stacking
//     the same content into the same height: a name run that wraps to two
//     lines in a 47 px cell holds one line in a 196 px one, so the width the
//     cell gained hands the height back.
//
// — and the two failures are the same failure, which is that a cell is an
// area. One property worth stating because it is the test that catches this
// getting re-derived from one dimension: a **rotated phone has the same
// area**, so it prints at exactly the size it prints at in portrait.
//
// *How fast* it grows with that area is the part that has been wrong twice,
// in both directions, and it is not something to reason out from first
// principles — it is measured, like every other length here, by looking at
// the two screens this app is actually read on:
//
//   - the **phone** ({@link MEASURED_WIDTH} × {@link MEASURED_HEIGHT}), where
//     the factor is 1 by construction: the shipped sizes *are* the phone's
//     sizes;
//   - the **desk** ({@link DESK_WIDTH} × {@link DESK_HEIGHT}, a 16" MacBook
//     Pro), where {@link DESK_ROOM} is what a reader sitting at one picked by
//     looking at the ladder's three steps side by side.
//
// {@link ROOM_EXPONENT} is then not a taste call either — it is whatever
// exponent carries the curve through both anchors, derived rather than
// written down, so moving an anchor moves the curve instead of leaving a
// stale constant beside it.
//
// The first attempt at this used the square root of the area ratio, which is
// the number the "page of lines" argument hands you and which is right *near
// the phone* — but it treats the phone's 7.5 px caption as a size somebody
// chose, when it is a size the 47 px cell **forced**. Lifting a forced floor
// is not the same as scaling a page: past the point where the cell stops
// being the constraint, the only thing still growing is the reader's distance
// from the screen, and that grows far slower than the screen's area does.
// √area put every desk screen from a laptop to a 5K on the ceiling — an
// 11 × area 1440p monitor and a 5 × area laptop both printing at
// {@link ROOM_MAX} — which is both too big at the laptop and, worse, not a
// curve at all up there. Through two anchors it is a curve again: a laptop,
// a 1440p monitor and a 4K each get their own answer.
//
// Floored at 1 (a screen smaller than the measured one keeps the
// measurements; shrinking them is what the reader's Small step is for) and
// capped at {@link ROOM_MAX}.

import { STYLE_SCOPES, type StyleScope } from "./viewStyle.ts";

/** The width the app's lengths were measured at — iPhone 15/16 portrait, the
 *  viewport AGENTS.md holds every layout change to. */
export const MEASURED_WIDTH = 393;

/** …and its height, which is what the six-row month grid was fitted to. */
export const MEASURED_HEIGHT = 852;

/** The **desk** anchor: the width of a 16" MacBook Pro's browser window at
 *  the resolution macOS ships it scaled to. */
export const DESK_WIDTH = 1728;

/** …and a maximised window's height on one, chrome taken off. */
export const DESK_HEIGHT = 1000;

/** What the almanac is set at on that screen, as a multiple of the phone's
 *  measurements — the second of the curve's two anchors, and the one that is
 *  a *reader's* answer rather than a cell's.
 *
 *  The phone anchor is forced: 7.5 px is what a 47 px month cell can set, so
 *  there was nothing to choose. A desk cell is five times as wide and forces
 *  nothing at all, so this end of the curve was picked the way the repo picks
 *  every other length — by looking. At 1.33 the ladder's **default** step
 *  prints a desk month cell at twice the phone's measurements (the two
 *  factors multiply, and the default is 1.5), which is the size a reader at a
 *  MacBook Pro chose off the three steps side by side; the step above and the
 *  step below then land either side of it rather than around something
 *  already too big.
 *
 *  Change this and {@link ROOM_EXPONENT} follows, because the exponent is
 *  derived from it — that is the point of writing the anchor down instead of
 *  the exponent. */
export const DESK_ROOM = 1.33;

/** The most the room factor grows the measurements by.
 *
 *  Past twice the measured size the almanac stops being a calendar page and
 *  starts being a poster: a month cell's caption would be competing with its
 *  date, and a reader who genuinely wants that has the ladder's Large step on
 *  top of this (the two multiply, so the ceiling on the month cell's captions
 *  is three times the measurement).
 *
 *  It is a backstop rather than a working value, and the difference matters:
 *  under the √area curve this replaced, *every* desk screen sat on it, so a
 *  laptop and a 5K printed the same size and the cap was doing the sizing.
 *  Through the two anchors nothing short of a 6K display reaches it. */
export const ROOM_MAX = 2;

/** How fast the factor grows with the screen's area — the exponent that
 *  carries the curve through both anchors, and so a derived number rather
 *  than one anybody chose. (About 0.17: a screen with five times the phone's
 *  area is set a third bigger, not 2.2 times bigger as √area had it.) */
export const ROOM_EXPONENT =
  Math.log(DESK_ROOM) /
  Math.log((DESK_WIDTH * DESK_HEIGHT) / (MEASURED_WIDTH * MEASURED_HEIGHT));

/** The width each scope's row actually gets, whatever the window is.
 *
 *  The month grid spans the window, so its cells keep growing with it. The
 *  week planner and the day list are `max-w-3xl` (48 rem) and centred — a
 *  1440p monitor gives them a 768 px row and not one pixel more — so their
 *  room stops where their column does, and a desk-width window prints the
 *  same strip a tablet does. */
export const SCOPE_MAX_WIDTH: Record<StyleScope, number> = {
  month: Number.POSITIVE_INFINITY,
  strip: 768,
};

/** The room factor for a screen `width` × `height`, before a scope's own cap.
 *
 *  The area ratio raised to {@link ROOM_EXPONENT}, held to `[1, ROOM_MAX]`.
 *  Rounded to two decimals so the value published to CSS is stable across the
 *  sub-pixel viewport jitter a mobile URL bar causes — a factor that changed
 *  on every scroll would restate every font size in the grid. */
export function roomScale(width: number, height: number): number {
  const w = Number.isFinite(width) && width > 0 ? width : MEASURED_WIDTH;
  const h = Number.isFinite(height) && height > 0 ? height : MEASURED_HEIGHT;
  const area = (w * h) / (MEASURED_WIDTH * MEASURED_HEIGHT);
  return round2(Math.max(1, Math.min(ROOM_MAX, area ** ROOM_EXPONENT)));
}

/** The room factor one scope is printed at: {@link roomScale} on the width
 *  that scope's row can actually reach. */
export function scopeRoom(
  scope: StyleScope,
  width: number,
  height: number,
): number {
  return roomScale(Math.min(width, SCOPE_MAX_WIDTH[scope]), height);
}

/** The `<html>` variables for both scopes — the same prefixed-per-scope shape
 *  `viewStyle.ts` publishes, so `.cal-scope-*` maps this one down onto
 *  `--cal-room` alongside the rest of a scope's set. */
export function roomVars(
  width: number,
  height: number,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const scope of STYLE_SCOPES) {
    vars[`--cal-${scope}-room`] = String(scopeRoom(scope, width, height));
  }
  return vars;
}

/** Publish the room factors on `<html>`. Cheap enough for every resize: two
 *  powers and two DOM writes. */
export function applyRoomVars(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(
    roomVars(window.innerWidth, window.innerHeight),
  )) {
    root.style.setProperty(name, value);
  }
}

/** The room factor a scope is being printed at right now, for the one thing
 *  that cannot read it off a CSS variable: the entry bands in
 *  `entryFont.ts`, which are px numbers JS measures a note against
 *  (`entryFit.ts`) rather than lengths the stylesheet resolves. */
export function currentRoom(scope: StyleScope): number {
  if (typeof window === "undefined") return 1;
  return scopeRoom(scope, window.innerWidth, window.innerHeight);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

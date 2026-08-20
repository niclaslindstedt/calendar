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
// its name days at the same 7.5 px a 47 px cell gets — the largest step on
// the ladder came out at 9.4 px on a 1440p monitor, which is not type anybody
// reads from a desk. Mobile looked right because mobile is what was measured.
//
// So the measurement gets a second factor beside the reader's: the **room**
// the screen actually has, as a multiple of the screen the measurements were
// taken on. It is published per scope like everything else in `viewStyle.ts`
// — the month grid spans the window and the strip views are capped at
// `max-w-3xl`, so the two do not have the same amount of room — and it
// reaches CSS as `--cal-room`, which `src/styles.css` multiplies into every
// size the same way it multiplies `--cal-size-*`.
//
// The factor is the square root of the **area** ratio, which is the ordinary
// way type scales: double a page's area and you set it at √2, because a page
// holds a fixed number of *lines of a given length* rather than a fixed number
// of characters. Neither dimension answers on its own —
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
// area. Floored at 1 (a screen smaller than the measured one keeps the
// measurements; shrinking them is what the reader's Small step is for) and
// capped at {@link ROOM_MAX}.
//
// One property worth stating because it is the test that catches this getting
// re-derived from one dimension: a **rotated phone has the same area**, so it
// prints at exactly the size it prints at in portrait.

import { STYLE_SCOPES, type StyleScope } from "./viewStyle.ts";

/** The width the app's lengths were measured at — iPhone 15/16 portrait, the
 *  viewport AGENTS.md holds every layout change to. */
export const MEASURED_WIDTH = 393;

/** …and its height, which is what the six-row month grid was fitted to. */
export const MEASURED_HEIGHT = 852;

/** The most the room factor grows the measurements by.
 *
 *  Past twice the measured size the almanac stops being a calendar page and
 *  starts being a poster: a month cell's caption would be competing with its
 *  date, and a reader who genuinely wants that has the ladder's Large step on
 *  top of this (the two multiply, so the ceiling on the month cell's captions
 *  is three times the measurement). A 1440p screen is eleven times the area
 *  of the measured phone and reaches this cap; nothing bigger goes further. */
export const ROOM_MAX = 2;

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
 *  The square root of the area ratio, held to `[1, ROOM_MAX]`. Rounded to two
 *  decimals so the value published to CSS is stable across the sub-pixel
 *  viewport jitter a mobile URL bar causes — a factor that changed on every
 *  scroll would restate every font size in the grid. */
export function roomScale(width: number, height: number): number {
  const w = Number.isFinite(width) && width > 0 ? width : MEASURED_WIDTH;
  const h = Number.isFinite(height) && height > 0 ? height : MEASURED_HEIGHT;
  const area = (w * h) / (MEASURED_WIDTH * MEASURED_HEIGHT);
  return round2(Math.max(1, Math.min(ROOM_MAX, Math.sqrt(area))));
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
 *  square roots and two DOM writes. */
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

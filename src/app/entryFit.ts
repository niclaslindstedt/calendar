// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Measuring a day's note against the room its view actually left for it.
//
// `entryFont.ts` picks a size from the character count alone — it has to,
// because it runs before layout. This module is the other half: once the note
// is in the DOM it *checks* that guess against the box the view gave it, which
// is the space left over after the day number, the holiday and the name days
// have taken theirs. It steps the size down until the text fits, stops at the
// view's floor, and reports whether even the floor was too small. That last
// flag is the whole point:
//
//   - reading, a note that doesn't fit is clamped to the lines that do and
//     ends in an ellipsis, rather than running under the captions;
//   - writing, the keystroke that would overflow the smallest size is simply
//     refused — the day is full.
//
// Every measurement is a synchronous layout read, so callers run this from a
// layout effect: the size settles before the frame is painted and the text
// never flashes at the wrong size.

/** The line height every entry surface renders at (`.cal-entry`). */
export const ENTRY_LINE_HEIGHT = 1.25;

/** The ladder's rung: half a point. Fine enough that the shrink reads as
 *  continuous, coarse enough that the search below stays a handful of
 *  measurements. */
const SHRINK_STEP = 0.5;

/** The height (px) the note may occupy: the content box of the slot its view
 *  parked it in. Zero when there is nothing to measure against yet — an
 *  unmeasurable slot must never be read as "full". */
export function entrySlotHeight(el: HTMLElement): number {
  const slot = el.parentElement;
  if (!slot) return 0;
  const style = getComputedStyle(slot);
  const padding =
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0);
  return Math.max(0, slot.clientHeight - padding);
}

/** How many lines of `px` text an `available`-tall slot holds. At least one:
 *  a truncated first line still says the day has a note. */
export function entryLineLimit(available: number, px: number): number {
  const line = px * ENTRY_LINE_HEIGHT;
  if (line <= 0) return 1;
  // The epsilon absorbs sub-pixel slot heights — a slot 41.99 px tall holds
  // the same three 14 px lines a 42 px one does.
  return Math.max(1, Math.floor(available / line + 0.02));
}

/** The sizes tried, smallest first: the floor, then every rung up to (and
 *  including) the size the view asked for. */
export function entrySizeLadder(startPx: number, minPx: number): number[] {
  const sizes: number[] = [];
  for (let px = minPx; px < startPx - 0.01; px += SHRINK_STEP) {
    sizes.push(round1(px));
  }
  sizes.push(round1(startPx));
  return sizes;
}

export type EntryFit = {
  /** The size the text was left at, in px. */
  px: number;
  /** Whether it fits the slot at that size. `false` means the floor was still
   *  too big — the caller clamps (reading) or refuses (writing). */
  fits: boolean;
};

/** Size `el`'s text down from `startPx` until it fits `available`, never going
 *  below `minPx`, and leave it at the size it settled on.
 *
 *  Binary search rather than a walk down the ladder: a taller font never wraps
 *  to fewer lines, so "fits" is monotonic along the ladder and four
 *  measurements cover the eleven rungs of a month cell. Callers mutate the
 *  inline font size here and let their next render restate it — the value React
 *  renders is the pre-layout guess, this is the correction. */
export function fitEntryText(
  el: HTMLElement,
  available: number,
  startPx: number,
  minPx: number,
): EntryFit {
  const apply = (px: number) => {
    el.style.fontSize = `${px}px`;
    return el.scrollHeight <= available + 0.5;
  };

  // Nothing to measure against (a slot with no height yet, a hidden view):
  // leave the guess alone and call it a fit, so typing is never blocked by a
  // measurement that could not be taken.
  if (available <= 0) {
    el.style.fontSize = `${startPx}px`;
    return { px: startPx, fits: true };
  }

  const sizes = entrySizeLadder(startPx, minPx);
  let lo = 0;
  let hi = sizes.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (apply(sizes[mid])) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const px = sizes[Math.max(best, 0)];
  el.style.fontSize = `${px}px`;
  return { px, fits: best >= 0 };
}

/** Print as much of `text` as fits `available`, ending it in an ellipsis.
 *
 *  The other way a note that has run out of room is ended. A cell clamps with
 *  `-webkit-line-clamp`, which is one declaration and costs no measuring — but
 *  its line boxes ignore floats, and a strip row's note is lines flowing
 *  around the row's margins (`stripRow.tsx`), so a note clamped that way would
 *  be pushed clear of the margins and set in the third of the row the layout
 *  exists to give up. So the ellipsis is put in the *text* instead: the
 *  longest prefix that still fits, plus the character that says there is more.
 *
 *  A binary search over the character count, for the reason
 *  {@link fitEntryText} uses one: more text never sets in fewer lines, so
 *  "fits" is monotonic and a note of any length is settled in a handful of
 *  measurements. It writes through the text node the renderer already put
 *  there rather than replacing it, so the next render can still restate the
 *  whole text through the same node — this is a correction to what is painted,
 *  not a change to what the day holds. */
export function clipEntryText(
  el: HTMLElement,
  available: number,
  text: string,
): void {
  const node = el.firstChild;
  if (!node || node.nodeType !== 3 /* Node.TEXT_NODE */) return;
  const show = (kept: number): boolean => {
    node.nodeValue = ellipsizedEntry(text, kept);
    return el.scrollHeight <= available + 0.5;
  };

  let lo = 0;
  let hi = text.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (show(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // The search's last measurement is not necessarily the one that fit, so the
  // winner is written back — without measuring it again. A note where nothing
  // fits, not even the first character, is left as the ellipsis alone: a day
  // with something written on it never looks blank, which is the floor
  // {@link entryLineLimit} keeps for a clamped cell too.
  node.nodeValue = ellipsizedEntry(text, Math.max(best, 0));
}

/** `text` cut to `kept` characters and closed with an ellipsis, with any
 *  space the cut left hanging trimmed off first — "Middag …" rather than
 *  "Middag  …". Cutting mid-word is deliberate: a whole word dropped to keep
 *  the ellipsis tidy is a word of the day's note nobody can see. */
export function ellipsizedEntry(text: string, kept: number): string {
  if (kept >= text.length) return text;
  return `${text.slice(0, kept).replace(/\s+$/u, "")}…`;
}

function round1(px: number): number {
  return Math.round(px * 10) / 10;
}

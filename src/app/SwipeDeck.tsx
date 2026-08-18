// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Horizontal period paging for the month and week views. Those two views fill
// exactly one screen and never scroll, which frees the horizontal axis for
// navigation: drag left or right and the neighbouring period follows your
// finger, then springs into place. The framework ships no pager — `useRowSwipe`
// is a per-row reveal/commit gesture and `useSwipeDownToClose` is for sheets —
// so this is app-local.
//
// The track holds three panes (previous, current, next), each exactly one
// container wide, and rests at `-100%` so the current one is on screen.
// Committing a swipe animates the track to `0%` / `-200%`, then re-centres it
// and moves the parent's anchor **in the same batch**, so the pane that slid in
// is the pane that stays and there is no flash between the two.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { useMediaQuery } from "@niclaslindstedt/oss-framework/hooks";

/** Horizontal travel before the gesture is ours rather than the page's. Low
 *  enough that a deliberate swipe engages immediately, high enough that a tap
 *  on a day cell with a shaky thumb still opens the editor. */
const AXIS_LOCK_PX = 10;
/** How much more vertical than horizontal a drag must be before it counts as
 *  scrolling rather than paging, on the decks whose pane actually scrolls. A
 *  thumb swiping across a phone travels in an arc, so a plain
 *  `|dy| >= |dx|` test hands far too many honest side-swipes to the list. */
const SCROLL_BIAS = 1.4;
/** A drag past this share of the width commits even if it ends slowly. */
const COMMIT_FRACTION = 0.22;
/** …and a flick faster than this (px/ms) commits however short it was. */
const COMMIT_VELOCITY = 0.4;
/** Settle duration. Long enough to read as a page turn, short enough that
 *  paging three months back does not feel like waiting. */
const SETTLE_MS = 260;
/** Decelerating ease — fast off the finger, gentle into place. */
const SETTLE_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/** The panes, left to right: the previous period, the current one, the next. */
const RELATIVE: readonly (-1 | 0 | 1)[] = [-1, 0, 1];

/** Marks the scrolling element inside a pane of a `scrolls` deck, so the deck
 *  can put it back to the top when the period changes. Spread onto the
 *  scroller: `<div {...DECK_SCROLLER} className="overflow-y-auto">`. */
export const DECK_SCROLLER = { "data-deck-scroller": "" } as const;

/** Animated period stepping, handed to whatever chrome a pane draws so the
 *  heading arrows turn the page the same way a swipe does. */
export type DeckNav = {
  previous: () => void;
  next: () => void;
};

type Props = {
  /** Identity of the centre period. A change from outside the deck (the Today
   *  button, a view switch) cancels any settle in flight. */
  itemKey: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Draws one pane. `rel` is -1/0/1 relative to the current period; only the
   *  `0` pane is interactive. */
  renderItem: (rel: -1 | 0 | 1, nav: DeckNav) => ReactNode;
  /** Chrome drawn above the track and left out of the animation: a screen
   *  whose header is the same in every period should not have three copies of
   *  it sliding past each other. It still gets `nav`, so its arrows page the
   *  content the way a swipe does. */
  renderChrome?: (nav: DeckNav) => ReactNode;
  /** Whether the pane scrolls vertically. The default — false — is the month
   *  and week views, which fill exactly one screen: there the browser is not
   *  allowed to claim the gesture on either axis (`touch-action: none`), so a
   *  swipe can never be lost to a rubber-band scroll of a page that has
   *  nowhere to go. A scrolling pane keeps `pan-y` and leans on the biased
   *  axis lock. */
  scrolls?: boolean;
};

type Drag = {
  x: number;
  y: number;
  width: number;
  /** Null until the gesture commits to an axis; "y" abandons it to the page. */
  axis: "x" | "y" | null;
  /** Last sample, for the release velocity. */
  sampleX: number;
  sampleT: number;
  velocity: number;
};

export function SwipeDeck({
  itemKey,
  onPrevious,
  onNext,
  renderItem,
  renderChrome,
  scrolls = false,
}: Props) {
  // Where the track sits: `settle` counts whole panes (the committed step) and
  // `dx` the pixels the finger has added on top.
  const [settle, setSettle] = useState<-1 | 0 | 1>(0);
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  /** Set once a gesture becomes a swipe, so the click it ends with does not
   *  also drop into the day cell it happens to land on. */
  const swiped = useRef(false);
  /** True from a committed swipe until its settle lands — input is ignored. */
  const settling = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => () => clearTimeout(timer.current), []);

  // Once a drag locks to the horizontal axis the browser must not reclaim it:
  // on a scrolling deck `pan-y` would otherwise let a downward drift start a
  // native scroll mid-swipe, which fires `pointercancel` and drops the page
  // turn. Swallowing the touchmoves while locked keeps the gesture ours, so
  // only the finger's horizontal travel is measured. Native listener because
  // it must be non-passive to call `preventDefault`.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.axis === "x" && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // The anchor moved while a settle was in flight, which can only mean it moved
  // from outside the deck (our own commit clears `settling` first). Drop the
  // pending step rather than applying it on top of the new anchor.
  useLayoutEffect(() => {
    if (!settling.current) return;
    clearTimeout(timer.current);
    settling.current = false;
    setAnimating(false);
    setSettle(0);
    setDx(0);
  }, [itemKey]);

  // A pane is a reused DOM node — the period swaps under it, its scroll offset
  // does not. So paging out of a month you had scrolled halfway down used to
  // drop you halfway down the neighbouring one, at a row the swipe never
  // showed you: what slid in was that month's *top*. Put every pane back there
  // in the same batch the anchor moves in, before the browser paints, so the
  // page turn lands where it looked like it would.
  useLayoutEffect(() => {
    if (!scrolls) return;
    const el = host.current;
    if (!el) return;
    for (const pane of el.querySelectorAll("[data-deck-scroller]")) {
      pane.scrollTop = 0;
    }
  }, [itemKey, scrolls]);

  const rest = () => {
    setAnimating(true);
    setSettle(0);
    setDx(0);
  };

  const commit = (direction: -1 | 1) => {
    if (settling.current) return;
    const step = () => (direction === 1 ? onNext() : onPrevious());
    if (reducedMotion) {
      setAnimating(false);
      setSettle(0);
      setDx(0);
      step();
      return;
    }
    settling.current = true;
    setAnimating(true);
    setSettle(direction);
    setDx(0);
    timer.current = window.setTimeout(() => {
      // Clearing the flag first keeps the anchor change below from reading as
      // an outside move to the effect above. Preact batches all of this into
      // one render, so the track re-centres in the same frame the new period
      // lands in the middle pane.
      settling.current = false;
      setAnimating(false);
      setSettle(0);
      setDx(0);
      step();
    }, SETTLE_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (settling.current || e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    // A drag across the open entry editor is a text selection, not a month
    // change — leave those gestures alone.
    if (target?.closest("textarea, input, select, [contenteditable='true']")) {
      return;
    }
    const width = host.current?.clientWidth ?? 0;
    if (width === 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      width,
      axis: null,
      sampleX: e.clientX,
      sampleT: e.timeStamp,
      velocity: 0,
    };
    swiped.current = false;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const moved = e.clientX - d.x;

    if (d.axis === null) {
      const vertical = Math.abs(e.clientY - d.y);
      if (Math.abs(moved) < AXIS_LOCK_PX && vertical < AXIS_LOCK_PX) return;
      // Only a pane that scrolls has anything to give the gesture up for, and
      // even then it takes a clearly vertical drag to win it.
      if (scrolls && vertical > Math.abs(moved) * SCROLL_BIAS) {
        // Vertical intent — hand the gesture back to the page.
        drag.current = null;
        return;
      }
      if (Math.abs(moved) < AXIS_LOCK_PX) return;
      d.axis = "x";
      swiped.current = true;
      setAnimating(false);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    const elapsed = e.timeStamp - d.sampleT;
    if (elapsed > 0) {
      d.velocity = (e.clientX - d.sampleX) / elapsed;
      d.sampleX = e.clientX;
      d.sampleT = e.timeStamp;
    }
    // Capped at one period: a long drag reveals the neighbour and no further,
    // because there is no fourth pane behind it.
    setDx(Math.max(-d.width, Math.min(d.width, moved)));
  };

  /** Ends an x-locked drag: commit if it went far or fast, spring back if
   *  not. `x` is the pointer's final position. */
  const finish = (d: Drag, x: number) => {
    const moved = Math.max(-d.width, Math.min(d.width, x - d.x));
    const far = Math.abs(moved) > d.width * COMMIT_FRACTION;
    const flicked =
      Math.abs(d.velocity) > COMMIT_VELOCITY &&
      Math.sign(d.velocity) === Math.sign(moved);
    if (far || flicked) commit(moved < 0 ? 1 : -1);
    else rest();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") return;
    finish(d, e.clientX);
  };

  const onPointerCancel = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    // A cancel after the axis lock means the browser stole a gesture that was
    // already a swipe. Finish it from the last sample rather than snapping
    // back — the finger asked for a page turn.
    if (d.axis === "x") finish(d, d.sampleX);
    else rest();
  };

  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!swiped.current) return;
    // The pointerup that ended the swipe still fires a click on whatever day
    // cell it landed over. Swallow it so paging never opens an editor.
    swiped.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const nav: DeckNav = {
    previous: () => commit(-1),
    next: () => commit(1),
  };

  const active = animating || dx !== 0;

  return (
    <div
      ref={host}
      className="flex h-full flex-col overflow-hidden"
      // A scrolling pane keeps `pan-y` so the browser still owns the vertical
      // axis before the axis lock decides; a pane that fills one screen has no
      // native gesture worth keeping on either axis, and `none` means the
      // browser can never claim the drag (a claim fires `pointercancel` and
      // eats the page turn — `pan-x` invited exactly that).
      style={{ touchAction: scrolls ? "pan-y" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      {renderChrome && <div className="shrink-0">{renderChrome(nav)}</div>}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(${-100 * (1 + settle)}% + ${dx}px), 0, 0)`,
            transition: animating
              ? `transform ${SETTLE_MS}ms ${SETTLE_EASING}`
              : "none",
            willChange: active ? "transform" : "auto",
          }}
        >
          {RELATIVE.map((rel) => (
            // Keyed by position, not by period: the centre node is reused as
            // the anchor moves, so committing a swipe swaps the content in
            // place instead of remounting three views.
            <div
              key={rel}
              className="h-full w-full shrink-0"
              // The neighbours carry focusable day cells and heading arrows;
              // `inert` keeps them out of the tab order and the a11y tree
              // while they are parked off screen.
              {...(rel === 0 ? {} : ({ inert: "" } as Record<string, string>))}
            >
              {renderItem(rel, nav)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Horizontal period paging for the month, week and list views. The month and
// week views fill exactly one screen and never scroll, which frees the
// horizontal axis for navigation: drag left or right and the neighbouring
// period follows your finger, then springs into place. The framework ships no
// pager — `useRowSwipe` is a per-row reveal/commit gesture and
// `useSwipeDownToClose` is for sheets — so this is app-local.
//
// The track holds three panes (previous, current, next), each exactly one
// container wide, and rests at `-100%` so the current one is on screen.
//
// Two rules keep the animation smooth, and both are about *when* work happens:
//
//   - **The gesture never re-renders.** A drag writes the track's transform
//     straight to the DOM rather than through state. Rendering three periods
//     on every pointermove was costing a third of the frames on a mid-range
//     machine; now a drag is a single style write per frame and the browser
//     keeps the whole thing on the compositor.
//   - **A page turn swaps first and animates second.** Committing moves the
//     parent's anchor *immediately* and parks the track one pane off, so the
//     period that was on screen is still the one you see; then the track runs
//     home. The render therefore lands in the pause right after your finger
//     lifts, and the 260 ms that follow are pure compositor work. Animating
//     first and swapping at the end — the obvious order — puts that render
//     exactly where the eye is watching the page settle.

import {
  useEffect,
  useLayoutEffect,
  useMemo,
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
/** Backstop for the `transitionend` that ends a settle. Generous, because the
 *  render that precedes the animation can delay its start on a slow device —
 *  this only cleans up, so firing late costs nothing. */
const SETTLE_TIMEOUT_MS = SETTLE_MS * 2 + 400;

/** The panes, left to right: the previous period, the current one, the next. */
const RELATIVE: readonly (-1 | 0 | 1)[] = [-1, 0, 1];

/** Where the track sits when nothing is happening: the centre pane on screen. */
const REST = "translate3d(-100%, 0, 0)";

/** The track's transform `px` away from {@link REST}. */
function trackTransform(px: number): string {
  return px === 0 ? REST : `translate3d(calc(-100% + ${px}px), 0, 0)`;
}

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
  /** Identity of what the centre pane is showing. A change from outside the
   *  deck (a press of the view you are already in, a picked name day, a view
   *  switch) cancels any settle in flight, re-centres the track and puts every
   *  pane's scroller back to the top. It is the *showing* that is identified,
   *  not the period alone: a caller that means "put me back" changes this even
   *  when the period it is on has not moved. */
  itemKey: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Draws one pane. `rel` is -1/0/1 relative to the current period; only the
   *  `0` pane is interactive. Keep the returned tree cheap to re-render —
   *  better, make it a memoized component with stable props, so a page turn
   *  only renders the one period that is genuinely new. */
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
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  /** How far the finger has taken the track from rest. A ref, not state: the
   *  whole point is that dragging renders nothing. */
  const dx = useRef(0);
  /** Set once a gesture becomes a swipe, so the click it ends with does not
   *  also drop into the day cell it happens to land on. */
  const swiped = useRef(false);
  /** True from a committed swipe until its settle lands. New gestures are
   *  turned away while it holds; another page turn is queued instead. */
  const settling = useRef(false);
  /** Set just before we move the anchor ourselves, so the `itemKey` effect can
   *  tell our own page turn from a jump made outside the deck. */
  const stepped = useRef(false);
  /** A page turn asked for while one was still settling. There is no fourth
   *  pane, so the period after next cannot start sliding until the current one
   *  has landed — but dropping the request outright makes a second tap on the
   *  arrow feel like a miss, which is most of what "laggy" means here. Held,
   *  and turned into a page turn the moment the track is home. One deep, last
   *  one wins: two taps get you two periods, while leaning on the arrow paces
   *  at one page turn per settle instead of banking a queue that keeps flying
   *  after you stop. */
  const queued = useRef<-1 | 1 | null>(null);
  /** The current `commit`, so the settle's tail and the stable `nav` below can
   *  reach it without either of them being rebuilt every render. */
  const commitRef = useRef<(direction: -1 | 1) => void>(() => {});
  const timer = useRef<number | undefined>(undefined);

  // Rotates by one per committed step, so the two panes that survive a page
  // turn keep their key — and, with a memoized pane, their rendered tree. The
  // month that slid in was already rendered as the neighbour; only the period
  // that just came into range is new.
  const [rotation, setRotation] = useState(0);
  /** The pane whose scroll offset is genuinely its own after a page turn: it
   *  held this period before the step too, and is currently sliding out. */
  const keepScroll = useRef<number | null>(null);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  /** Whether text under the deck can be selected. Turned off for the length
   *  of a horizontal drag — see the axis lock. */
  const setSelectable = (on: boolean) => {
    const el = host.current;
    if (!el) return;
    el.style.userSelect = on ? "" : "none";
    el.style.webkitUserSelect = on ? "" : "none";
    if (!on) document.getSelection()?.removeAllRanges();
  };

  /** Park the track `px` from rest, immediately. */
  const place = (px: number) => {
    const el = track.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = trackTransform(px);
  };

  /** Run the track home from wherever it currently is. The start value is
   *  flushed first — without that the browser would resolve both ends in one
   *  style pass and there would be nothing to animate. */
  const runHome = () => {
    const el = track.current;
    if (!el) return;
    void el.offsetWidth;
    el.style.willChange = "transform";
    el.style.transition = `transform ${SETTLE_MS}ms ${SETTLE_EASING}`;
    el.style.transform = REST;
    timer.current = window.setTimeout(endSettle, SETTLE_TIMEOUT_MS);
  };

  const endSettle = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    settling.current = false;
    const el = track.current;
    if (el) {
      el.style.transition = "none";
      el.style.willChange = "auto";
    }
    const next = queued.current;
    queued.current = null;
    if (next) commitRef.current(next);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // The settle is over when the track lands, not when a timer says so: the
  // render that precedes a page turn can push the animation's start out on a
  // slow device, and blocking input for a fixed duration from the *commit*
  // would either unblock mid-flight or hold the next swipe long after the
  // page had settled. The timeout in `runHome` is only a backstop for the
  // case where no transition runs at all.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const done = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "transform") endSettle();
    };
    el.addEventListener("transitionend", done);
    return () => el.removeEventListener("transitionend", done);
    // Only refs and the DOM node are touched, so the first `endSettle` is as
    // good as any later one.
  }, []);

  // Once a drag locks to the horizontal axis the browser must not reclaim it,
  // and it must not keep a gesture of its own running behind ours either.
  //
  // On a scrolling deck `pan-y` would otherwise let a downward drift start a
  // native scroll mid-swipe, which fires `pointercancel` and drops the page
  // turn. Swallowing the touchmoves while locked keeps the gesture ours, so
  // only the finger's horizontal travel is measured.
  //
  // `touch-action: none` looks like it should make that unnecessary on the
  // decks that fill one screen — but it only denies the browser the *scroll*,
  // not the fling it still ends a flick with. A fling in flight arms the
  // engine's tap suppression: the next tap anywhere on the page is read as
  // "stop the fling" and its `click` is never dispatched. So flicking to the
  // next month and then reaching for the top menu cost two taps — the first
  // one only cancelled a fling that moved nothing. Preventing the touchmoves
  // ends the browser's gesture with the finger, so the tap after a flick is
  // the tap the reader meant.
  //
  // Native listener because it must be non-passive to call `preventDefault`.
  // The cost a non-passive touchmove listener carries — the compositor
  // waiting on the main thread before a scrolled frame — is paid only while
  // something under it actually scrolls, which on these decks is the day
  // list's own pane and nothing else.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.axis === "x" && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // The centre period changed. Our own page turn has already placed the track
  // and started its animation; anything else is a jump from outside the deck
  // (the Today button, a picked name day) and lands with no animation at all.
  useLayoutEffect(() => {
    if (stepped.current) {
      stepped.current = false;
      return;
    }
    // Whoever moved the anchor from outside meant *that* period, not the one
    // a queued arrow tap was heading for.
    queued.current = null;
    endSettle();
    dx.current = 0;
    place(0);
  }, [itemKey]);

  // A pane is a reused DOM node — the period inside it swaps, its scroll
  // offset does not. So paging out of a month you had scrolled halfway down
  // used to drop you halfway down the neighbouring one, at a row the swipe
  // never showed you: what slid in was that month's *top*. Put every pane whose
  // period actually changed back there in the same batch the anchor moves in,
  // before the browser paints. The one exception is the pane still holding the
  // period you just left: it is on screen, sliding out, and yanking it to the
  // top mid-animation is exactly the flash this is meant to prevent.
  useLayoutEffect(() => {
    if (!scrolls) return;
    const el = host.current;
    const keep = keepScroll.current;
    keepScroll.current = null;
    if (!el) return;
    for (const pane of el.querySelectorAll<HTMLElement>("[data-deck-pane]")) {
      if (keep !== null && pane.dataset.deckPane === String(keep)) continue;
      for (const scroller of pane.querySelectorAll("[data-deck-scroller]")) {
        scroller.scrollTop = 0;
      }
    }
  }, [itemKey, scrolls]);

  /** Spring back to the current period: the drag did not go far enough. This
   *  one does not block input — nothing changed, so a second try can start
   *  before the first has finished springing. */
  const rest = () => {
    dx.current = 0;
    runHome();
  };

  const commit = (direction: -1 | 1) => {
    if (settling.current) {
      queued.current = direction;
      return;
    }
    const width = host.current?.clientWidth ?? 0;
    const step = () => (direction === 1 ? onNext() : onPrevious());

    // Where the track has to sit, once the anchor has moved, for the period
    // you are looking at to stay exactly where it is: one pane over, plus
    // whatever the finger had already added.
    const from = direction * width + dx.current;
    dx.current = 0;
    stepped.current = true;
    keepScroll.current = paneKey(rotation, 0);
    setRotation((r) => r + direction);

    if (reducedMotion || width === 0) {
      place(0);
      step();
      return;
    }

    settling.current = true;
    // Order matters, and nothing paints in between: park the track as if the
    // step had already happened, start it home, and only then move the anchor.
    // The re-render that follows leaves the transform alone, so a slow render
    // delays the animation rather than truncating it.
    place(from);
    runHome();
    step();
  };

  commitRef.current = commit;
  // Stable across renders so a memoized pane is not invalidated by its own
  // navigation arrows.
  const nav = useMemo<DeckNav>(
    () => ({
      previous: () => commitRef.current(-1),
      next: () => commitRef.current(1),
    }),
    [],
  );

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
      const el = track.current;
      if (el) el.style.willChange = "transform";
      clearTimeout(timer.current);
      // A mouse drag is also a text drag: without this, turning the page on a
      // desktop smears a selection highlight across the days it passes over.
      // Dropped at the moment the gesture becomes ours, and given back when
      // the pointer lifts, so ordinary selection still works everywhere else.
      setSelectable(false);
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
    dx.current = Math.max(-d.width, Math.min(d.width, moved));
    place(dx.current);
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
    setSelectable(true);
    finish(d, e.clientX);
  };

  const onPointerCancel = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    setSelectable(true);
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
          ref={track}
          className="flex h-full w-full"
          // The resting transform is the only one React writes. Every other
          // position — the finger's, the page turn's — is set on this node
          // directly, so no gesture ever costs a render.
          style={{ transform: REST }}
        >
          {RELATIVE.map((rel) => {
            const key = paneKey(rotation, rel);
            return (
              // Keyed by a rotating slot rather than by position: a page turn
              // shifts every period one pane over, and this is what lets the
              // two that were already rendered keep their tree instead of
              // being rebuilt under a position key that never moves.
              <div
                key={key}
                data-deck-pane={key}
                className="h-full w-full shrink-0"
                // The neighbours carry focusable day cells and heading arrows;
                // `inert` keeps them out of the tab order and the a11y tree
                // while they are parked off screen.
                {...(rel === 0
                  ? {}
                  : ({ inert: "" } as Record<string, string>))}
              >
                {renderItem(rel, nav)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The slot a pane occupies, `rel` away from the centre at this rotation.
 *  Three slots cycling means a step re-uses two of them and only the period
 *  that just came into range lands in a fresh one. */
function paneKey(rotation: number, rel: -1 | 0 | 1): number {
  return (((rotation + rel) % 3) + 3) % 3;
}

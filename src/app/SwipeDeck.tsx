// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Period paging for the month, week and list views. The month and week views
// fill exactly one screen and never scroll, which frees an axis for
// navigation: drag along it and the neighbouring period follows your finger,
// then springs into place. The framework ships no pager — `useRowSwipe` is a
// per-row reveal/commit gesture and `useSwipeDownToClose` is for sheets — so
// this is app-local.
//
// Which axis that is, is the reader's (Settings → Calendar → Navigation,
// `navSwipe.ts`). Left/right is the default and the one the app shipped with;
// up/down is for a thumb that would rather scroll a calendar than flick
// through it, and it takes the arrows out of the heading, since a pair of
// chevrons pointing the wrong way is worse than no chevrons at all. Only the
// axis moves: everything below — the axis lock, the commit thresholds, the
// swap-then-animate order — is written in terms of the *main* axis (the one
// pages travel on) and the *cross* axis, so there is one pager rather than
// two.
//
// The track holds three panes (previous, current, next), each exactly one
// container wide (or tall), and rests at `-100%` so the current one is on
// screen.
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

/** Travel along the paging axis before the gesture is ours rather than the
 *  page's. Low enough that a deliberate swipe engages immediately, high enough
 *  that a tap on a day cell with a shaky thumb still opens the editor. */
const AXIS_LOCK_PX = 10;
/** How much more cross-axis than main-axis a drag must be before it counts as
 *  scrolling rather than paging, on the decks whose pane actually scrolls. A
 *  thumb swiping across a phone travels in an arc, so a plain
 *  `|cross| >= |main|` test hands far too many honest side-swipes to the
 *  list. */
const SCROLL_BIAS = 1.4;
/** A drag past this share of the page commits even if it ends slowly. */
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

/** The panes, in reading order along the paging axis: the previous period, the
 *  current one, the next. */
const RELATIVE: readonly (-1 | 0 | 1)[] = [-1, 0, 1];

/** The axis pages travel on: `x` is left/right, `y` is up/down. */
export type DeckAxis = "x" | "y";

/** Where the track sits when nothing is happening: the centre pane on
 *  screen. A percentage transform is of the track's own border box, and the
 *  track is exactly one pane wide *and* tall (its siblings overflow), so the
 *  same `-100%` is one page on either axis. */
function restTransform(axis: DeckAxis): string {
  return axis === "y" ? "translate3d(0, -100%, 0)" : "translate3d(-100%, 0, 0)";
}

/** The track's transform `px` away from {@link restTransform}. */
function trackTransform(axis: DeckAxis, px: number): string {
  if (px === 0) return restTransform(axis);
  return axis === "y"
    ? `translate3d(0, calc(-100% + ${px}px), 0)`
    : `translate3d(calc(-100% + ${px}px), 0, 0)`;
}

/** Whether a scroller has run out of room in the direction a drag is heading:
 *  `main` is the finger's travel along the paging axis, so a positive one
 *  (dragging down, revealing the pane above) needs a scroller already at its
 *  top and a negative one needs it at its bottom.
 *
 *  This is what lets the day list keep the vertical axis it scrolls on and
 *  still page on it: the pane scrolls until it cannot, and the drag that
 *  carries on past the end is the one that turns the page. A pane with no
 *  scroller of its own has nothing to give up, so it is at both ends at once.
 *  The pixel of slack is for fractional scroll offsets, which a zoomed page
 *  and a retina scrollbar both produce. */
function atScrollEnd(scroller: Element | null, main: number): boolean {
  if (!scroller) return true;
  if (main > 0) return scroller.scrollTop <= 0;
  return (
    scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1
  );
}

/** Marks the scrolling element inside a pane of a `scrolls` deck, so the deck
 *  can put it back to the top when the period changes. Spread onto the
 *  scroller: `<div {...DECK_SCROLLER} className="overflow-y-auto">`. */
export const DECK_SCROLLER = { "data-deck-scroller": "" } as const;

/** Marks the row a scroller should open on, when its top is somewhere other
 *  than zero — the day list marks today's week, so the month you are living in
 *  opens where you are in it rather than at the 1st. Spread onto the row
 *  (`{...DECK_HOME}`), at most one per scroller, and only while the pane
 *  actually has such a row: without it the scroller opens at the very top,
 *  which is what every other period wants. */
export const DECK_HOME = { "data-deck-home": "" } as const;

/** Where a scroller's top is. Zero, unless the pane marked a row to open on —
 *  and then that row's offset, less the scroller's own `scroll-padding-top`:
 *  the space its pinned chrome needs kept clear is exactly the space the row
 *  underneath it has to clear. Measured from the rects rather than read off
 *  `offsetTop`, which is relative to whichever ancestor happens to be
 *  positioned rather than to the scroller. */
function homeOffset(scroller: Element): number {
  const home = scroller.querySelector("[data-deck-home]");
  if (!home) return 0;
  const pad = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
  const above =
    home.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  return Math.max(0, above + scroller.scrollTop - pad);
}

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
  /** Which way a page turn travels (Settings → Calendar → Navigation).
   *  Defaults to the left/right paging the app shipped with. */
  axis?: DeckAxis;
};

type Drag = {
  /** Where the finger went down, along the paging axis… */
  main: number;
  /** …and across it. */
  cross: number;
  /** The container's length along the paging axis — one page. */
  size: number;
  /** False until the gesture is ours. A drag the page wins is dropped
   *  outright rather than kept in a losing state. */
  locked: boolean;
  /** The scroller the gesture started over, on a deck whose panes scroll:
   *  what decides, at lock time, whether the pane still has room to give the
   *  drag or the deck should take it (see {@link atScrollEnd}). */
  scroller: Element | null;
  /** Last main-axis sample, for the release velocity. */
  sample: number;
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
  axis = "x",
}: Props) {
  const vertical = axis === "y";
  /** The pointer's position along the paging axis. */
  const along = (e: { clientX: number; clientY: number }) =>
    vertical ? e.clientY : e.clientX;
  /** …and across it. */
  const across = (e: { clientX: number; clientY: number }) =>
    vertical ? e.clientX : e.clientY;
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  /** How far along the paging axis the finger has taken the track from rest.
   *  A ref, not state: the whole point is that dragging renders nothing. */
  const offset = useRef(0);
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
    el.style.transform = trackTransform(axis, px);
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
    el.style.transform = restTransform(axis);
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
      if (drag.current?.locked && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // A deck that pages on the axis its panes scroll on has one more thing to
  // arrange, and it is the browser's rubber band. `overscroll-behavior: none`
  // is what says "there is nothing past the end here": without it iOS bounces
  // the pane instead, and a bounce is a scroll — the engine claims the touch,
  // fires `pointercancel`, and the drag that was meant to turn the page is
  // gone. With it, a finger that reaches the end of the list keeps sending us
  // moves, which is exactly the gesture {@link atScrollEnd} is looking for.
  //
  // Set here rather than in the views' own classes because it is the *deck's*
  // reason: the same list scrolled under left/right paging should keep its
  // bounce.
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const scrollers = el.querySelectorAll<HTMLElement>("[data-deck-scroller]");
    for (const scroller of scrollers) {
      scroller.style.overscrollBehaviorY = vertical ? "none" : "";
    }
    // `scrolls` is what says whether the panes have a scroller at all — it is
    // the prop that changes when the week planner's rows start growing.
  }, [vertical, scrolls]);

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
    offset.current = 0;
    place(0);
    // `itemKey` alone, deliberately. This is the "someone moved the anchor
    // from outside" effect; `place` is in it only because it writes the
    // track, and it counts as reactive only because it reads the paging axis
    // — which cannot change under a mounted deck anyway, since `App.tsx` keys
    // the deck on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey]);

  // A pane is a reused DOM node — the period inside it swaps, its scroll
  // offset does not. So paging out of a month you had scrolled halfway down
  // used to drop you halfway down the neighbouring one, at a row the swipe
  // never showed you: what slid in was that month's *top*. Put every pane whose
  // period actually changed back there in the same batch the anchor moves in,
  // before the browser paints. The one exception is the pane still holding the
  // period you just left: it is on screen, sliding out, and yanking it to the
  // top mid-animation is exactly the flash this is meant to prevent.
  //
  // "The top" is the pane's to define ({@link homeOffset}), and it has to be
  // decided here rather than by the pane itself: this runs after the panes'
  // own layout effects, so a scroll one of them set would be overwritten a
  // moment later by the zero this used to write unconditionally.
  useLayoutEffect(() => {
    if (!scrolls) return;
    const el = host.current;
    const keep = keepScroll.current;
    keepScroll.current = null;
    if (!el) return;
    for (const pane of el.querySelectorAll<HTMLElement>("[data-deck-pane]")) {
      if (keep !== null && pane.dataset.deckPane === String(keep)) continue;
      for (const scroller of pane.querySelectorAll("[data-deck-scroller]")) {
        scroller.scrollTop = homeOffset(scroller);
      }
    }
  }, [itemKey, scrolls]);

  /** Spring back to the current period: the drag did not go far enough. This
   *  one does not block input — nothing changed, so a second try can start
   *  before the first has finished springing. */
  const rest = () => {
    offset.current = 0;
    runHome();
  };

  const commit = (direction: -1 | 1) => {
    if (settling.current) {
      queued.current = direction;
      return;
    }
    const el = host.current;
    const size = (vertical ? el?.clientHeight : el?.clientWidth) ?? 0;
    const step = () => (direction === 1 ? onNext() : onPrevious());

    // Where the track has to sit, once the anchor has moved, for the period
    // you are looking at to stay exactly where it is: one pane over, plus
    // whatever the finger had already added.
    const from = direction * size + offset.current;
    offset.current = 0;
    stepped.current = true;
    keepScroll.current = paneKey(rotation, 0);
    setRotation((r) => r + direction);

    if (reducedMotion || size === 0) {
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
    const el = host.current;
    const size = (vertical ? el?.clientHeight : el?.clientWidth) ?? 0;
    if (size === 0) return;
    drag.current = {
      main: along(e),
      cross: across(e),
      size,
      locked: false,
      scroller: target?.closest("[data-deck-scroller]") ?? null,
      sample: along(e),
      sampleT: e.timeStamp,
      velocity: 0,
    };
    swiped.current = false;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const moved = along(e) - d.main;

    if (!d.locked) {
      const sideways = Math.abs(across(e) - d.cross);
      if (Math.abs(moved) < AXIS_LOCK_PX && sideways < AXIS_LOCK_PX) return;
      // Only a pane that scrolls has anything to give the gesture up for, and
      // even then it takes a clearly cross-axis drag to win it.
      if (scrolls && sideways > Math.abs(moved) * SCROLL_BIAS) {
        // The pane's axis, not ours — hand the gesture back to the page.
        drag.current = null;
        return;
      }
      if (Math.abs(moved) < AXIS_LOCK_PX) return;
      // Paging up and down over a pane that scrolls up and down: the scroll
      // comes first and the page turn is what is left once the pane has run
      // out. Handing the gesture back here is what keeps the day list a list.
      if (vertical && scrolls && !atScrollEnd(d.scroller, moved)) {
        drag.current = null;
        return;
      }
      d.locked = true;
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
      d.velocity = (along(e) - d.sample) / elapsed;
      d.sample = along(e);
      d.sampleT = e.timeStamp;
    }
    // Capped at one period: a long drag reveals the neighbour and no further,
    // because there is no fourth pane behind it.
    offset.current = Math.max(-d.size, Math.min(d.size, moved));
    place(offset.current);
  };

  /** Ends a locked drag: commit if it went far or fast, spring back if not.
   *  `at` is the pointer's final position along the paging axis. */
  const finish = (d: Drag, at: number) => {
    const moved = Math.max(-d.size, Math.min(d.size, at - d.main));
    const far = Math.abs(moved) > d.size * COMMIT_FRACTION;
    const flicked =
      Math.abs(d.velocity) > COMMIT_VELOCITY &&
      Math.sign(d.velocity) === Math.sign(moved);
    if (far || flicked) commit(moved < 0 ? 1 : -1);
    else rest();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.locked) return;
    setSelectable(true);
    finish(d, along(e));
  };

  const onPointerCancel = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    setSelectable(true);
    // A cancel after the axis lock means the browser stole a gesture that was
    // already a swipe. Finish it from the last sample rather than snapping
    // back — the finger asked for a page turn.
    if (d.locked) finish(d, d.sample);
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
      //
      // That holds when the deck pages up and down too, and for the same
      // reason read the other way round: the scroll is the pane's until the
      // pane runs out, so the browser keeps `pan-y` and the deck takes over
      // at the end of the list (`atScrollEnd`, and the `overscroll-behavior`
      // above that keeps the bounce from eating the drag).
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
          // One pane wide and tall either way; the other two overflow, along
          // the axis the panes are laid out on.
          className={`flex h-full w-full ${vertical ? "flex-col" : ""}`}
          // The resting transform is the only one React writes. Every other
          // position — the finger's, the page turn's — is set on this node
          // directly, so no gesture ever costs a render.
          style={{ transform: restTransform(axis) }}
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

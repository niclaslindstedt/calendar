// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which way a page turn travels (Settings → Calendar → Navigation).
//
// The app shipped paging left and right, which is what a wall calendar's pages
// do and what the heading's two chevrons point at. Up and down is the other
// honest answer: it is the direction a phone is already scrolled in, and in the
// day list it is the direction the days themselves run — swiping down brings
// the month above, the way scrolling up would if the year were one long list.
//
// It is one setting for all three views rather than one per view, because it is
// a habit rather than a layout: a thumb that pages a month upward pages a week
// upward too. The deck's own word for it is an axis (`SwipeDeck`), and the
// translation is made here so nothing downstream has to know that "vertical"
// means `y`.
//
// Pure, like the other setting vocabularies here (`pastDays.ts`,
// `weekPlanner.ts`), so the coercion a stored blob goes through is a unit test
// rather than a hope: settings are hand-editable JSON, and an unrecognised
// value must land on the shipped default rather than on a deck that pages
// nowhere.

/** The two directions a swipe can turn the page. */
export const SWIPE_DIRECTIONS = ["horizontal", "vertical"] as const;

export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

/** What the app ships with: left and right, with the heading's arrows. */
export const DEFAULT_SWIPE_DIRECTION: SwipeDirection = "horizontal";

/** A stored value held to the two known directions. */
export function swipeDirectionOf(value: unknown): SwipeDirection {
  return SWIPE_DIRECTIONS.includes(value as SwipeDirection)
    ? (value as SwipeDirection)
    : DEFAULT_SWIPE_DIRECTION;
}

/** The axis the deck pages on. */
export function swipeAxis(direction: SwipeDirection): "x" | "y" {
  return direction === "vertical" ? "y" : "x";
}

/** Whether the period heading prints its two chevrons.
 *
 *  They page left and right, and there is no up-and-down pair to swap them
 *  for: a chevron is a direction, and the two that would be right here point
 *  at the top and the bottom of the screen rather than at the previous and
 *  next period — which reads as "scroll", which is what the swipe already
 *  says. So the vertical reader navigates by the gesture alone, and the
 *  heading is left to name the month. */
export function showsArrows(direction: SwipeDirection): boolean {
  return direction === "horizontal";
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The strip row's arrangement — which margin each piece is printed in, and at
// which end of it. The week planner and the day list are the same row at two
// heights (`stripRow.tsx`), so they share one arrangement, the way they share
// one set of sizes and faces (`viewStyle.ts`).
//
// A row has two margins with the writing surface between them: a **lane** on
// the left, where the printed column calendar sets the date, and a **rail** on
// the right, where it sets its marginalia. Each margin has a top and a bottom
// end — the rail's bottom end is pushed to the row's bottom edge, the way the
// holiday's name is printed along it — so the four slots map onto the four
// quadrants of a row, which is what lets the settings designer be the same
// tap-a-quadrant control the month cell uses.
//
// Two things stay fixed rather than becoming settings. The note has no slot of
// its own — it is what the margins leave, and a row is a line rather than a
// cell, so there is no "middle" for it to sit at. And the weekday's name
// travels with the day number wherever it goes — "Mon" without the date beside
// it is not a piece a calendar prints.
//
// *How much* the margins leave it is a setting, and it is the one below.

/** Whether the note flows *under* the row's margins once it has run past
 *  them, or keeps to the column between them.
 *
 *  Flowing, the lane and the rail are floats — only as tall as what they
 *  print — so a long note runs beside them and then takes the row's full width
 *  underneath, the way text flows around a picture on a page. It is the most
 *  room a row can give a note, and it is also a note printed under the date
 *  and the week number, which is a calendar some readers do not want: a strip
 *  whose right edge is the almanac's margin all the way down reads as a
 *  printed page, and a note that swallows the row reads as a document.
 *
 *  So it is a choice, and the quieter one is the default: **off**, the margins
 *  are columns and the note is the width between them, which is the row both
 *  views drew before the float arrangement existed.
 *
 *  It belongs to the row rather than to a view for the reason the arrangement
 *  above does — the week planner and the day list print the same row, so a
 *  setting that moved in one and not the other would be a bug. */
export const DEFAULT_STRIP_NOTE_FLOW = false;

/** The four places a piece can be printed in a strip row. */
export const STRIP_SLOTS = [
  "lane-top",
  "lane-bottom",
  "rail-top",
  "rail-bottom",
] as const;

export type StripSlot = (typeof STRIP_SLOTS)[number];

/** A row's two margins. */
export type StripMargin = "lane" | "rail";

/** The pieces a row arranges. Your own text is not one of them — it is what
 *  the margins leave. */
export const STRIP_PIECES = ["day", "holidays", "nameDays", "week"] as const;

export type StripPiece = (typeof STRIP_PIECES)[number];

export type StripLayout = Record<StripPiece, StripSlot>;

/** The printed column calendar's own arrangement, and what both views have
 *  always drawn: the date at the head of the lane with the day's names under
 *  it, the week number at the top of the rail and the holiday's name along the
 *  bottom of it. */
export const DEFAULT_STRIP_LAYOUT: StripLayout = {
  day: "lane-top",
  nameDays: "lane-bottom",
  week: "rail-top",
  holidays: "rail-bottom",
};

/** Which margin a slot names. */
export function stripMargin(slot: StripSlot): StripMargin {
  return slot.startsWith("lane") ? "lane" : "rail";
}

/** Which end of that margin. */
export function stripEnd(slot: StripSlot): "top" | "bottom" {
  return slot.endsWith("top") ? "top" : "bottom";
}

/** A stored slot, held to the four the row has. A hand-edited settings blob
 *  can carry anything, and a piece assigned to a slot that does not exist
 *  would simply vanish from the calendar. */
export function stripSlotOf(value: unknown): StripSlot {
  return STRIP_SLOTS.includes(value as StripSlot)
    ? (value as StripSlot)
    : "lane-top";
}

/** The pieces printed in one slot, in the order they stack: the order
 *  {@link STRIP_PIECES} lists them, which is the order a day reads. */
export function piecesInSlot(
  layout: StripLayout,
  slot: StripSlot,
): StripPiece[] {
  return STRIP_PIECES.filter((piece) => layout[piece] === slot);
}

/** The pieces printed in one margin, top end first. */
export function piecesInMargin(
  layout: StripLayout,
  margin: StripMargin,
): StripPiece[] {
  return [
    ...piecesInSlot(layout, `${margin}-top` as StripSlot),
    ...piecesInSlot(layout, `${margin}-bottom` as StripSlot),
  ];
}

/** Whether a margin prints a given piece at all. */
export function inMargin(
  layout: StripLayout,
  margin: StripMargin,
  piece: StripPiece,
): boolean {
  return stripMargin(layout[piece]) === margin;
}

/** The pieces one slot prints for a given day: the arrangement's answer,
 *  filtered to what the day actually has.
 *
 *  Where {@link marginReserved} asks the question once for a whole period —
 *  whether the margin is drawn at all — this asks it per day. The two are not
 *  the same question, because the margins are floats: an empty *margin* would
 *  still move the note's edge on every row, but an empty *piece* costs
 *  nothing, so a week number is printed on the day that opens the week and the
 *  other six get their first lines back. */
export function piecesPrinted(
  layout: StripLayout,
  slot: StripSlot,
  has: Record<StripPiece, boolean>,
): StripPiece[] {
  return piecesInSlot(layout, slot).filter((piece) => has[piece]);
}

/** Whether a margin is worth reserving at all, given what the period has to
 *  print in it.
 *
 *  Decided once per period rather than per row — a margin that came and went
 *  down the strip would give the note a different width on every line, which
 *  is the same reason the lane is a width rather than a shrink-wrap. So a
 *  plain English month, whose days have no name days and whose rail would
 *  hold only the odd holiday, drops the whole margin instead of carrying dead
 *  gutter down ninety rows. */
export function marginReserved(
  layout: StripLayout,
  margin: StripMargin,
  has: Record<StripPiece, boolean>,
): boolean {
  return piecesInMargin(layout, margin).some((piece) => has[piece]);
}

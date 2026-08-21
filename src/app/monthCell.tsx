// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The month cell's arrangement, apart from its content: which corner each
// piece is parked in, and where the note sits in what is left. The month grid
// renders real days through it and Settings → Calendar renders a sample day
// through the same code, so the picker in Settings is the layout rather than a
// drawing of it.
//
// The cell is two bands: the top of the cell, which the day number floats in
// (so a short caption sits beside it and a long one drops under it) and which
// the note flows into behind the number, and a bottom band captioning the
// cell's edge. A corner names a band and a side; pieces sharing a corner stack
// in reading order.
//
// The note *flowing* is what puts your text in the white space beside the
// number rather than under it — the same arrangement the strip row gives its
// margins (`stripRow.tsx`). It only holds where the note is set to the top of
// the cell, which is where it is set by default: a note the reader has pushed
// to the middle or the bottom is asking for the leftover room as a *box*, and
// a box cannot be an L. So that case keeps the three bands this cell had, and
// {@link monthNoteFlows} is the one place that says which of the two a layout
// gets.

import type { ReactNode } from "react";

import {
  CELL_PIECES,
  type CellCorner,
  type CellPiece,
  type MonthCellLayout,
} from "./useAppSettings.ts";

/** The rendered piece for each slot, or null when the day has none. */
export type CellContent = Record<CellPiece, ReactNode> & { note: ReactNode };

/** Whether this arrangement lets the note flow around the day number — see
 *  the file header. The views ask because the note has to know: text that
 *  makes room for a float cannot be ended with `-webkit-line-clamp`, whose
 *  line boxes ignore floats (`DayEntry`'s `flow`). */
export function monthNoteFlows(layout: MonthCellLayout): boolean {
  return layout.note === "top";
}

const isTop = (corner: CellCorner) => corner.startsWith("top");
const isRight = (corner: CellCorner) => corner.endsWith("right");

/** The pieces parked in one corner, in stacking order. */
function piecesIn(layout: MonthCellLayout, corner: CellCorner): CellPiece[] {
  return CELL_PIECES.filter((piece) => layout[piece] === corner);
}

/** Whether a corner would draw anything for this day — an empty corner takes
 *  no height, so a day without a holiday is not indented by the space one
 *  would have used. */
function filled(
  layout: MonthCellLayout,
  content: CellContent,
  corner: CellCorner,
): CellPiece[] {
  return piecesIn(layout, corner).filter((piece) => content[piece] != null);
}

export function MonthCellFrame({
  layout,
  content,
  className = "",
}: {
  layout: MonthCellLayout;
  content: CellContent;
  className?: string;
}) {
  const topLeft = filled(layout, content, "top-left");
  const topRight = filled(layout, content, "top-right");
  const bottomLeft = filled(layout, content, "bottom-left");
  const bottomRight = filled(layout, content, "bottom-right");
  const dayOnTop = isTop(layout.day);

  const flows = monthNoteFlows(layout);
  const number = dayOnTop && content.day != null && (
    <span
      className={`block px-1 ${isRight(layout.day) ? "float-right" : "float-left"}`}
    >
      {content.day}
    </span>
  );
  const captions = (topLeft.length > 0 || topRight.length > 0) && (
    // The captions the top corners hold, capped at the share of the cell they
    // may take: a day with a long holiday and three names must not crowd the
    // note out, and the cap is what stops it.
    //
    // `overflow: clip` rather than `hidden` (`.cal-cell-caps`), because
    // `hidden` would make this a formatting context and a formatting context
    // is pushed clear of a float whole — the captions would stop wrapping
    // around the number and stand beside it in a column. It is also why they
    // can't use `line-clamp-*`: that sets `display: -webkit-box`, whose line
    // boxes ignore a float instead of wrapping around it.
    //
    // The cap is a share of the cell rather than a length, which is why it
    // carries the room factor: it was measured against a phone's 120 px cell,
    // and on a screen that prints the number and the captions half again as
    // large it has to cap half again as much or it clips the second name off
    // every day (`src/app/roomScale.ts`).
    <div className="cal-cell-caps">
      {topLeft
        .filter((piece) => piece !== "day" || !dayOnTop)
        .map((piece) => (
          <div key={piece} className="px-0.5 text-left">
            {content[piece]}
          </div>
        ))}
      {topRight
        .filter((piece) => piece !== "day" || !dayOnTop)
        .map((piece) => (
          <div key={piece} className="px-0.5 text-right">
            {content[piece]}
          </div>
        ))}
    </div>
  );

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      {flows ? (
        // One flowing box: the number floated in it, the captions wrapping
        // around the number, and the note wrapping around whatever is left of
        // it. `overflow-hidden` contains the float — a block holding only a
        // float has no height, so the number would otherwise hang into the
        // band below — and clips what the cell cannot show.
        //
        // The negative margin is the cell's own padding, given back to the
        // number and the captions so they can be set hard against the cell's
        // edges; the note takes it back in `.cal-cell-flow > .cal-entry`,
        // which is where its text keeps the margin it has always had.
        <div className="cal-cell-flow -mx-1 min-h-0 flex-1 overflow-hidden">
          {number}
          {captions}
          {content.note}
        </div>
      ) : (
        <>
          {(number || captions) && (
            <div className="-mx-1 shrink-0 overflow-hidden">
              {number}
              {captions}
            </div>
          )}
          {/* A note the reader has pushed down the cell: a box in the room the
              bands leave, justified inside it. It cannot flow around the
              number — the number is at the top and this is not. */}
          <div
            className={`flex min-h-0 flex-1 flex-col ${
              layout.note === "middle" ? "justify-center" : "justify-end"
            }`}
          >
            {content.note}
          </div>
        </>
      )}

      {(bottomLeft.length > 0 || bottomRight.length > 0) && (
        // The bottom band splits into two columns so a piece in each corner
        // sits side by side rather than stacked; a single occupied corner
        // takes the whole width and keeps its own alignment.
        <div className="-mx-1 flex shrink-0 items-end gap-1 px-0.5">
          {bottomLeft.length > 0 && (
            <div className="min-w-0 flex-1 text-left">
              {bottomLeft.map((piece) => (
                <div key={piece}>{content[piece]}</div>
              ))}
            </div>
          )}
          {bottomRight.length > 0 && (
            <div className="ml-auto min-w-0 flex-1 text-right">
              {bottomRight.map((piece) => (
                <div key={piece}>{content[piece]}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The month cell's arrangement, apart from its content: which corner each
// piece is parked in, and where the note sits in what is left. The month grid
// renders real days through it and Settings → Calendar renders a sample day
// through the same code, so the picker in Settings is the layout rather than a
// drawing of it.
//
// The cell is three bands: a top band the day number floats in (so a short
// caption sits beside it and a long one drops under it), the note taking
// whatever height is left, and a bottom band captioning the cell's edge. A
// corner names a band and a side; pieces sharing a corner stack in reading
// order.

import type { ReactNode } from "react";

import {
  CELL_PIECES,
  type CellCorner,
  type CellPiece,
  type MonthCellLayout,
} from "./useAppSettings.ts";

/** The rendered piece for each slot, or null when the day has none. */
export type CellContent = Record<CellPiece, ReactNode> & { note: ReactNode };

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

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      {(topLeft.length > 0 || topRight.length > 0) && (
        // `overflow-hidden` does double duty here — it contains the floated
        // number (a block holding only a float has no height, so the number
        // would otherwise overlap the note below) and it caps the band at
        // `max-h`, keeping a day with a long holiday and three names from
        // crowding the note surface out of the cell. It is also why the
        // captions can't use `line-clamp-*`: that sets `display: -webkit-box`,
        // whose line boxes ignore a float instead of wrapping around it.
        //
        // The cap is a share of the cell rather than a length, which is why it
        // carries the room factor: it was measured against a phone's 120 px
        // cell, and on a screen that prints the number and the captions half
        // again as large it has to cap half again as much or it clips the
        // second name off every day (`src/app/roomScale.ts`).
        <div className="-mx-1 max-h-[calc(3.5rem*var(--cal-room,1))] shrink-0 overflow-hidden">
          {dayOnTop && content.day != null && (
            <span
              className={`block px-1 ${isRight(layout.day) ? "float-right" : "float-left"}`}
            >
              {content.day}
            </span>
          )}
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
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col ${
          layout.note === "middle"
            ? "justify-center"
            : layout.note === "bottom"
              ? "justify-end"
              : "justify-start"
        }`}
      >
        {content.note}
      </div>

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

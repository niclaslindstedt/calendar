// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab: how a month cell is laid out, arranged on a sample day
// rather than described in a list of dropdowns. The preview is drawn by the
// same `MonthCellFrame` the real grid uses, so what you rearrange here is the
// layout itself — tap a corner, pick what belongs in it.
//
// The defaults reproduce a printed Swedish wall calendar: the number large in
// the top-right corner, the writing space under it, and the captions stacked
// bottom-right with the holiday above the name days.
//
// Part of the previewed look — the edits stream to the calendar behind the
// dialog and are only written on Save.

import { useState } from "react";

import {
  CheckIcon,
  Field,
  Section,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type MessageKey } from "../i18n/index.ts";
import { MonthCellFrame } from "../monthCell.tsx";
import {
  CELL_PIECES,
  CELL_PIECE_KEY,
  monthCellLayout,
  type CellCorner,
  type CellPiece,
  type LookSettings,
  type NotePlacement,
} from "../useAppSettings.ts";

type UpdateLook = <K extends keyof LookSettings>(
  key: K,
  value: LookSettings[K],
) => void;

const CORNERS: readonly CellCorner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const CORNER_LABELS: Record<CellCorner, MessageKey> = {
  "top-left": "settings.cellTopLeft",
  "top-right": "settings.cellTopRight",
  "bottom-left": "settings.cellBottomLeft",
  "bottom-right": "settings.cellBottomRight",
};

const PIECE_LABELS: Record<CellPiece, MessageKey> = {
  day: "settings.cellDayNumber",
  holidays: "settings.cellHolidays",
  nameDays: "settings.cellNameDays",
};

/** The sample day the preview arranges: a red day carrying every piece at
 *  once, so no corner is empty while you are deciding where things go. */
const SAMPLE = {
  day: "31",
  holiday: "Alla helgons dag",
  nameDays: "Edit, Edgar",
  note: "Middag 18:00",
};

export function CalendarSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();
  // The corner whose menu is open, if any. One at a time: the menu covers a
  // good share of a 393 px preview.
  const [openCorner, setOpenCorner] = useState<CellCorner | null>(null);
  const layout = monthCellLayout(look);

  const move = (piece: CellPiece, corner: CellCorner) => {
    onUpdate(CELL_PIECE_KEY[piece], corner);
    setOpenCorner(null);
  };

  return (
    <Section title={t("settings.monthCell")}>
      <p className="text-muted text-xs">{t("settings.monthCellHint")}</p>

      {/* The preview and the picker are one control: the four corner buttons
          sit over the sample cell, each opening the list of pieces. */}
      <div className="relative mt-1">
        {/* The sample stands on the calendar's own ground, framed like a day
            cell, so what you are rearranging looks like where it will land. */}
        <div className="bg-page-bg relative h-44 rounded border border-line px-1 pt-0.5 pb-1">
          <MonthCellFrame
            className="pointer-events-none h-full select-none"
            layout={layout}
            content={{
              day: (
                <span className="cal-serif text-2xl leading-none cal-red">
                  {SAMPLE.day}
                </span>
              ),
              holidays: (
                <span className="cal-red block text-[10px] leading-[1.25]">
                  {SAMPLE.holiday}
                </span>
              ),
              nameDays: (
                <span className="text-muted block text-[10px] leading-[1.25]">
                  {SAMPLE.nameDays}
                </span>
              ),
              note: (
                <span className="text-fg block text-[11px] leading-tight">
                  {SAMPLE.note}
                </span>
              ),
            }}
          />

          {/* The tap targets: a quadrant each, outlined faintly so the four
              corners read as places you can put something before you have
              tried tapping one. */}
          {CORNERS.map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={t(CORNER_LABELS[corner])}
              aria-haspopup="menu"
              aria-expanded={openCorner === corner}
              onClick={() =>
                setOpenCorner((prev) => (prev === corner ? null : corner))
              }
              className={`absolute h-1/2 w-1/2 cursor-pointer rounded border border-dashed transition-colors focus-visible:outline-2 ${
                corner.startsWith("top") ? "top-0" : "bottom-0"
              } ${corner.endsWith("left") ? "left-0" : "right-0"} ${
                openCorner === corner
                  ? "border-accent bg-accent/10"
                  : "hover:border-accent border-line/60 hover:bg-accent/5"
              }`}
            />
          ))}
        </div>

        {openCorner && (
          <>
            {/* Outside tap dismisses, the same pattern the settings header's
                section menu uses. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={t("settings.cellCloseMenu")}
              onClick={() => setOpenCorner(null)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              aria-label={t(CORNER_LABELS[openCorner])}
              className="absolute top-1/2 left-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded border border-line bg-surface-3 p-2 shadow-xl"
            >
              <p className="text-muted px-2 pb-1 text-[11px] font-bold tracking-wide uppercase">
                {t(CORNER_LABELS[openCorner])}
              </p>
              {CELL_PIECES.map((piece) => {
                const here = layout[piece] === openCorner;
                return (
                  <button
                    key={piece}
                    type="button"
                    role="menuitemradio"
                    aria-checked={here}
                    onClick={() => move(piece, openCorner)}
                    className={`hover:bg-surface flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm ${
                      here ? "text-accent font-bold" : "text-fg"
                    }`}
                  >
                    <CheckIcon
                      className={`h-3.5 w-3.5 shrink-0 ${here ? "" : "opacity-0"}`}
                    />
                    <span>{t(PIECE_LABELS[piece])}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* The note has no corner — it takes the room the corners leave — so it
          keeps a control of its own. */}
      <Field label={t("settings.cellNote")}>
        <SegmentedControl<NotePlacement>
          value={look.monthNote}
          onChange={(next) => onUpdate("monthNote", next)}
          ariaLabel={t("settings.cellNote")}
          options={[
            { value: "top", label: t("settings.cellNoteTop") },
            { value: "middle", label: t("settings.cellNoteMiddle") },
            { value: "bottom", label: t("settings.cellNoteBottom") },
          ]}
        />
      </Field>
    </Section>
  );
}

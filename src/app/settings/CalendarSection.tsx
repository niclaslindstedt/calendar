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
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import {
  HEADER_COLORS,
  HEADER_COLOR_HEX,
  type HeaderColor,
} from "../headerColor.ts";
import { useT, type MessageKey } from "../i18n/index.ts";
import { MonthCellFrame } from "../monthCell.tsx";
import { MarkedDate, PastMark } from "../PastMark.tsx";
import {
  PAST_MARK_SCOPES,
  PAST_MARK_STYLES,
  type PastMarkScope,
  type PastMarkStyle,
} from "../pastDays.ts";
import {
  CELL_PIECES,
  CELL_PIECE_KEY,
  headerColorFor,
  monthCellLayout,
  pastMarkOf,
  weekDateSizeFor,
  weekFormatFor,
  weekRowsOf,
  type CellCorner,
  type CellPiece,
  type ListRowMode,
  type LookSettings,
  type NotePlacement,
} from "../useAppSettings.ts";
import {
  WEEK_DATE_SIZES,
  WEEK_FORMATS,
  weekNumberLabel,
  type WeekDateSize,
  type WeekFormat,
  type WeekRowMode,
} from "../weekPlanner.ts";

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

const HEADER_COLOR_LABELS: Record<HeaderColor, MessageKey> = {
  none: "settings.headerColorNone",
  red: "settings.headerColorRed",
  blue: "settings.headerColorBlue",
  green: "settings.headerColorGreen",
  plum: "settings.headerColorPlum",
  ochre: "settings.headerColorOchre",
};

/** The four steps the week strip's date is set at. The three the rest of the
 *  app uses, plus the wall-planner one this view alone has the height for. */
const WEEK_DATE_LABELS: Record<WeekDateSize, MessageKey> = {
  small: "settings.textSizeSmall",
  medium: "settings.textSizeMedium",
  large: "settings.textSizeLarge",
  huge: "settings.textSizeHuge",
};

const PAST_MARK_LABELS: Record<PastMarkStyle, MessageKey> = {
  none: "settings.pastMarkNone",
  cross: "settings.pastMarkCross",
  slash: "settings.pastMarkSlash",
};

const PAST_SCOPE_LABELS: Record<PastMarkScope, MessageKey> = {
  cell: "settings.pastMarkScopeCell",
  date: "settings.pastMarkScopeDate",
};

/** The week the format buttons are labelled with — two digits, so the widest
 *  of the three labels is the widest it will ever be. */
const SAMPLE_WEEK = 34;

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
  // The sample day stands in for a day that has passed, so the stroke the
  // Passed days section below chooses is drawn on it — the preview is the
  // one place you can see what "the date" versus "whole day" means without
  // scrolling the calendar back into last week.
  const pastMark = pastMarkOf(look);

  const move = (piece: CellPiece, corner: CellCorner) => {
    onUpdate(CELL_PIECE_KEY[piece], corner);
    setOpenCorner(null);
  };

  return (
    <>
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
                  <MarkedDate
                    style={pastMark.scope === "date" ? pastMark.style : "none"}
                  >
                    <span className="cal-font-day text-2xl leading-none cal-red">
                      {SAMPLE.day}
                    </span>
                  </MarkedDate>
                ),
                holidays: (
                  <span className="cal-font-holiday cal-red block text-[10px] leading-[1.25]">
                    {SAMPLE.holiday}
                  </span>
                ),
                nameDays: (
                  <span className="cal-font-nameday text-muted block text-[10px] leading-[1.25]">
                    {SAMPLE.nameDays}
                  </span>
                ),
                note: (
                  <span className="cal-font-entry text-fg block text-[11px] leading-tight">
                    {SAMPLE.note}
                  </span>
                ),
              }}
            />

            {pastMark.scope === "cell" && <PastMark style={pastMark.style} />}

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

      {/* Crossing off what has gone. Off by default: a calendar you have
        written on is a preference, not an improvement. */}
      <Section title={t("settings.pastDays")}>
        <p className="text-muted text-xs">{t("settings.pastDaysHint")}</p>

        <Field label={t("settings.pastMark")}>
          <SegmentedControl<PastMarkStyle>
            value={pastMark.style}
            onChange={(next) => onUpdate("pastMark", next)}
            ariaLabel={t("settings.pastMark")}
            options={PAST_MARK_STYLES.map((style) => ({
              value: style,
              label: t(PAST_MARK_LABELS[style]),
            }))}
          />
        </Field>

        {/* Only once there is a mark to place: with the stroke off, "whole
          day or the date" is a question about nothing. */}
        {pastMark.style !== "none" && (
          <Field label={t("settings.pastMarkScope")}>
            <SegmentedControl<PastMarkScope>
              value={pastMark.scope}
              onChange={(next) => onUpdate("pastMarkScope", next)}
              ariaLabel={t("settings.pastMarkScope")}
              options={PAST_MARK_SCOPES.map((scope) => ({
                value: scope,
                label: t(PAST_SCOPE_LABELS[scope]),
              }))}
            />
          </Field>
        )}
      </Section>

      {/* The two views whose rows can grow, kept on the Calendar tab beside
        the month cell rather than on a tab of their own. Two controls rather
        than one: a day-list row is one line of a ninety-row scroll, a week
        row is a seventh of the screen, and someone can reasonably want the
        one to grow and not the other. */}
      <Section title={t("settings.dayListRows")}>
        <Field label={t("settings.rows")}>
          <SegmentedControl<ListRowMode>
            value={look.listRows}
            onChange={(next) => onUpdate("listRows", next)}
            ariaLabel={t("settings.dayListRows")}
            options={[
              { value: "fixed", label: t("settings.rowsFixed") },
              { value: "dynamic", label: t("settings.rowsDynamic") },
            ]}
          />
          <p className="text-muted text-xs">{t("settings.dayListRowsHint")}</p>
        </Field>
      </Section>

      {/* The week strip. */}
      <Section title={t("settings.weekPlanner")}>
        <p className="text-muted text-xs">{t("settings.weekPlannerHint")}</p>

        <ToggleRow
          label={t("settings.weekDayOfYear")}
          hint={t("settings.weekDayOfYearHint")}
          checked={look.weekDayOfYear}
          onChange={(next) => onUpdate("weekDayOfYear", next)}
        />

        {/* The date's size, in the strip's own steps rather than on the shared
          ladder: a week row is four times a month cell's height, so it can
          carry a wall-planner date that would not fit anywhere else. */}
        <Field label={t("settings.weekDateSize")}>
          <SegmentedControl<WeekDateSize>
            value={weekDateSizeFor(look)}
            onChange={(next) => onUpdate("weekDateSize", next)}
            ariaLabel={t("settings.weekDateSize")}
            options={WEEK_DATE_SIZES.map((size) => ({
              value: size,
              label: t(WEEK_DATE_LABELS[size]),
            }))}
          />
        </Field>

        {/* The three ways of printing a week number, each option labelled with
          what it actually prints — the question is what you want to read in
          the margin, so the answer is shown rather than described. */}
        <Field label={t("settings.weekFormat")}>
          <SegmentedControl<WeekFormat>
            value={weekFormatFor(look)}
            onChange={(next) => onUpdate("weekFormat", next)}
            ariaLabel={t("settings.weekFormat")}
            options={WEEK_FORMATS.map((format) => ({
              value: format,
              label: weekNumberLabel(format, SAMPLE_WEEK, {
                long: t("topbar.week", { n: SAMPLE_WEEK }),
                mark: t("topbar.weekMark", { n: SAMPLE_WEEK }),
              }),
            }))}
          />
          <p className="text-muted text-xs">{t("settings.weekFormatHint")}</p>
        </Field>

        <Field label={t("settings.rows")}>
          <SegmentedControl<WeekRowMode>
            value={weekRowsOf(look)}
            onChange={(next) => onUpdate("weekRows", next)}
            ariaLabel={t("settings.weekRows")}
            options={[
              { value: "fixed", label: t("settings.rowsFixed") },
              { value: "dynamic", label: t("settings.rowsDynamic") },
            ]}
          />
          <p className="text-muted text-xs">{t("settings.weekRowsHint")}</p>
        </Field>
      </Section>

      {/* The masthead. It bands every view's heading, not only the week
        planner's, so it sits in a section of its own — but it is the week
        planner that spends it twice, printing its week numbers in the same
        ink. */}
      <Section title={t("settings.heading")}>
        <p className="text-muted text-xs">{t("settings.headingHint")}</p>

        <Field label={t("settings.headerColor")}>
          <div
            role="radiogroup"
            aria-label={t("settings.headerColor")}
            className="flex flex-wrap gap-2"
          >
            {HEADER_COLORS.map((color) => {
              const active = headerColorFor(look) === color;
              const hex = color === "none" ? null : HEADER_COLOR_HEX[color];
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t(HEADER_COLOR_LABELS[color])}
                  onClick={() => onUpdate("headerColor", color)}
                  className={`h-9 w-9 cursor-pointer rounded border-2 transition-colors focus-visible:outline-2 ${
                    active ? "border-fg" : "border-line hover:border-accent"
                  }`}
                  // The swatch *is* the colour, so it is painted rather than
                  // labelled; "off" is the page's own ground with a slash
                  // through it, the way a colour picker draws "no colour".
                  style={
                    hex
                      ? { background: hex }
                      : {
                          background:
                            "linear-gradient(135deg, var(--page-bg) 0 45%, var(--line) 45% 55%, var(--page-bg) 55% 100%)",
                        }
                  }
                />
              );
            })}
          </div>
        </Field>
      </Section>
    </>
  );
}

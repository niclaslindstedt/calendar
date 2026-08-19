// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The month view — the wall calendar. A large month image (when a pack ships
// one) hangs above the grid, pushing the calendar down so image + month title
// + grid fill the screen; without artwork, the calendar alone covers the
// viewport. Below the serif month title: weekday headers, ISO week numbers in
// the margin, red Sundays, name days small in each cell, and the user's note
// text shrinking to fit its cell.

import { memo, useMemo } from "react";

import type { DayKey, GridCell } from "@niclaslindstedt/oss-framework/calendar";
import {
  buildMonthGrid,
  parseDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import { DayEntry } from "./DayEntry.tsx";
import { MONTH_CELL_FONT, type EntryTextSize } from "./entryFont.ts";
import { useT } from "./i18n/index.ts";
import { CONTENT_BOTTOM_PAD } from "./layout.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import {
  holidayFor,
  hyphenate,
  isRedDay,
  isRedWeekday,
  monthName,
  nameDaysFor,
  weekNumber,
  weekdayName,
  weekdayOrder,
  type LocalePack,
} from "./locale/index.ts";
import { MonthCellFrame } from "./monthCell.tsx";
import { MarkedDate, PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { monthImageUrl } from "./monthImage.ts";
import { minHyphenatedLetters } from "./textSize.ts";
import { SCOPE_CLASS } from "./viewStyle.ts";
import type { CalendarDoc } from "./types.ts";
import type { MonthCellLayout } from "./useAppSettings.ts";

type Props = {
  year: number;
  month: number;
  today: DayKey;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  /** Where the number, the captions and the note sit in a cell. */
  layout: MonthCellLayout;
  /** The heading band's colour (Settings → Calendar → Heading), or `null`. */
  headerInk: string | null;
  /** The stroke drawn over the days that have passed, if any. */
  pastMark: PastMarkSetting;
  textSize: EntryTextSize;
  /** How big the two caption bands are set (Settings → Calendar → View), as
   *  scales of their measured size. The sizes themselves are applied in CSS;
   *  these reach JS only to re-seed the hyphens the band needs at that size,
   *  which have to be in the string before it is laid out. Two numbers rather
   *  than the scope's whole style object, so the memo below still holds when
   *  an unrelated piece is re-sized. */
  nameDayScale: number;
  holidayScale: number;
  doc: CalendarDoc;
  editingDay: DayKey | null;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Tapping a holiday's name opens the holidays screen. Takes the year so
   *  the handler can stay one stable function across every day of every
   *  period the deck holds, rather than a fresh closure per cell. */
  onOpenHolidays: (year: number) => void;
  /** Tapping one of the day's names opens the name-day search on it. */
  onOpenNames: (name: string) => void;
};

/** Memoized: the deck keeps three months mounted, so an unrelated state change
 *  (a tap on another day, a settings preview) must not re-render the two that
 *  did not move. Every prop above is either a primitive or memoized by
 *  `App.tsx` — keep it that way. */
export const MonthGridView = memo(function MonthGridView({
  year,
  month,
  today,
  pack,
  showWeekNumbers,
  showNameDays,
  layout,
  headerInk,
  pastMark,
  textSize,
  nameDayScale,
  holidayScale,
  doc,
  editingDay,
  onEditDay,
  onCommit,
  onPrevious,
  onNext,
  onOpenHolidays,
  onOpenNames,
}: Props) {
  const t = useT();
  // Memoized so the cells below — which are memoized in turn — are handed the
  // same `GridCell` objects until the month itself changes.
  const weeks = useMemo(
    () =>
      buildMonthGrid(year, month, { weekStartsOn: pack.weekStartsOn, today }),
    [year, month, pack.weekStartsOn, today],
  );
  const order = weekdayOrder(pack);
  const image = monthImageUrl(year, month, "large");

  // The week gutter carries a bare number — the column is self-evidently the
  // week once it has a header-less lane of its own, so the "v."/"w." prefix
  // was portrait width spent saying so.
  //
  // The lane is a measured constant, like the cell font: at the gutter's
  // computed 10 px the widest of the 53 possible labels is 11.12 px, and the
  // week number is never three digits. The number is left-aligned in a 20 px
  // lane, which spends the width in the two places it is visible — the number
  // starts at the section's 12 px padding, matching the 12 px the grid leaves
  // on the right, and the ~9 px left over becomes the gap between the number
  // and the first day column. Sizing the lane to the digits alone squared the
  // margins but pressed the number against the grid.
  const gridCols = showWeekNumbers
    ? "grid-template-columns: 1.25rem repeat(7, minmax(0, 1fr))"
    : "grid-template-columns: repeat(7, minmax(0, 1fr))";

  return (
    <div
      className={`${SCOPE_CLASS.month} flex h-full flex-col overflow-hidden`}
    >
      {/* The artwork band. Absent until a month-image pack ships. The view no
          longer scrolls, so the image shares the one screen with the grid
          rather than hanging above a viewport of its own. */}
      {image && (
        <img
          src={image}
          alt=""
          className="h-[28svh] w-full shrink-0 object-cover"
          loading="lazy"
        />
      )}

      <section
        className="flex min-h-0 flex-1 flex-col px-3 sm:px-6"
        style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
      >
        {/* The serif month title, wall-calendar style, between the arrows. */}
        <PeriodHeading
          title={monthName(pack, month)}
          meta={String(year)}
          titleClass="cal-serif text-3xl font-normal tracking-[0.18em] uppercase sm:text-4xl"
          metaClass="text-xl tracking-normal sm:text-2xl"
          accent={headerInk}
          onPrevious={onPrevious}
          onNext={onNext}
        />

        {/* Weekday headers. */}
        <div className="grid shrink-0" style={gridCols}>
          {showWeekNumbers && <div aria-hidden="true" />}
          {order.map((wd) => (
            <div
              key={wd}
              className={`cal-serif border-b border-line pb-1 text-center text-sm sm:text-base ${
                isRedWeekday(pack, wd) ? "cal-red" : "text-fg"
              }`}
            >
              <span className="hidden sm:inline">{weekdayName(pack, wd)}</span>
              <span className="sm:hidden">
                {weekdayName(pack, wd, "short")}
              </span>
            </div>
          ))}
        </div>

        {/* The week rows. `flex-1` + per-row `flex: 1` keeps the grid filling
            the section, so the month always covers one screen. The rows carry
            no min-height: the view does not scroll, so on a short viewport six
            rows have to share whatever is there rather than push past the
            bottom of a container that would clip them. */}
        <div className="flex min-h-0 flex-1 flex-col">
          {weeks.map((week) => (
            <div
              key={week[0].key}
              className="grid min-h-0 flex-1 border-b border-line"
              style={gridCols}
            >
              {showWeekNumbers && (
                // Bare number, flush to the lane's left edge. The prefix
                // survives in the accessible name, where there is no width to
                // pay for it.
                <div
                  className="text-muted cal-font-week cal-size-week pt-1 [--cal-base:10px]"
                  aria-label={t("topbar.week", {
                    n: weekNumber(pack, week[0].key),
                  })}
                >
                  {weekNumber(pack, week[0].key)}
                </div>
              )}
              {week.map((cell) => (
                <DayCell
                  key={cell.key}
                  cell={cell}
                  year={year}
                  pack={pack}
                  today={today}
                  layout={layout}
                  pastMark={pastMark}
                  showNameDays={showNameDays}
                  textSize={textSize}
                  nameDayScale={nameDayScale}
                  holidayScale={holidayScale}
                  entry={doc.entries[cell.key] ?? ""}
                  editing={editingDay === cell.key}
                  onEditDay={onEditDay}
                  onCommit={onCommit}
                  onOpenHolidays={onOpenHolidays}
                  onOpenNames={onOpenNames}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

/** One day of the grid. Where each piece sits — which corner takes the
 *  number, the holiday and the day's names, and where the note starts —
 *  comes from Settings → Calendar, so the cell is assembled by
 *  {@link MonthCellFrame} from those choices rather than hard-coded.
 *
 *  What stays fixed is the typography. The captions never use `break-words` —
 *  that splits against whatever is left on the current line and shatters a
 *  name into "Mart" / "a". `hyphenate` seeds soft hyphens at the syllable
 *  boundaries the language allows instead, and only in words too long to fit a
 *  caption line whole, so "Elsa, Isabella" breaks after the comma while
 *  "Midsom-marafton" breaks inside. Every name fits a full line unaided — at
 *  7.5 px on the 45.8 px line a band gets, all 627 names in the Swedish
 *  almanac do, the widest being "Bartolomeus" at 42.1 px. Re-measure before
 *  growing this font — and note that the *reader* can grow it (Settings →
 *  Calendar → View), which is why the threshold is derived from the
 *  live scale rather than taken as the constant.
 *
 *  Memoized, and the reason is the tap: opening the editor on one day used to
 *  re-render every cell of three months, which is a fifth of a second of dead
 *  main thread on a mid-range phone. Now the day you touched is the only one
 *  that renders. */
const DayCell = memo(function DayCell({
  cell,
  year,
  pack,
  today,
  layout,
  pastMark,
  showNameDays,
  textSize,
  nameDayScale,
  holidayScale,
  entry,
  editing,
  onEditDay,
  onCommit,
  onOpenHolidays,
  onOpenNames,
}: {
  cell: GridCell;
  /** The month's own year — what a tapped holiday opens the screen on. */
  year: number;
  pack: LocalePack;
  today: DayKey;
  layout: MonthCellLayout;
  pastMark: PastMarkSetting;
  showNameDays: boolean;
  textSize: EntryTextSize;
  nameDayScale: number;
  holidayScale: number;
  entry: string;
  editing: boolean;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onOpenHolidays: (year: number) => void;
  onOpenNames: (name: string) => void;
}) {
  const parts = parseDayKey(cell.key);
  const weekday = parts ? new Date(`${cell.key}T12:00:00Z`).getUTCDay() : 1;
  const holiday = parts
    ? holidayFor(pack, parts.year, parts.month, parts.day)
    : null;
  const red = parts
    ? isRedDay(pack, parts.year, parts.month, parts.day, weekday)
    : false;
  const names =
    showNameDays && parts ? nameDaysFor(pack, parts.month, parts.day) : [];
  // Asked once per day, handed to whichever box carries the stroke.
  const marked = pastMarkSlot(pastMark, cell.key, today);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={cell.key}
      onClick={() => onEditDay(cell.key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !editing) {
          e.preventDefault();
          onEditDay(cell.key);
        }
      }}
      className={`relative min-w-0 cursor-text overflow-hidden border-l border-line px-1 pt-0.5 pb-1 last:border-r focus-visible:outline-2 ${
        cell.inMonth ? "" : "opacity-35"
      } ${cell.isToday ? "bg-surface-2" : ""}`}
    >
      <MonthCellFrame
        className="h-full"
        layout={layout}
        content={{
          day: (
            <MarkedDate style={marked === "date" ? pastMark.style : "none"}>
              <span
                className={`cal-font-day cal-size-day leading-none [--cal-base:1rem] sm:[--cal-base:1.125rem] ${
                  red ? "cal-red" : "text-fg"
                } ${cell.isToday ? "font-bold" : ""}`}
              >
                {cell.day}
              </span>
            </MarkedDate>
          ),
          // The holiday name is also the way into the holidays screen — it is
          // already on screen and it is exactly what you are asking about.
          // `stopPropagation` keeps the tap off the cell's click-to-type.
          holidays: holiday ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenHolidays(year);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                onOpenHolidays(year);
              }}
              className={`cal-font-holiday cal-cell-holiday block cursor-pointer leading-[1.25] focus-visible:outline-2 ${
                holiday.red ? "cal-red" : "text-muted"
              }`}
            >
              {hyphenate(holiday.name, pack.hyphenation, {
                minWordLength: minHyphenatedLetters(holidayScale),
              })}
            </span>
          ) : null,
          // Each name is its own tap target — the way into the name-day
          // search, seeded with the name you touched. They are still one run
          // of text: the separators sit outside the spans, so the line breaks
          // exactly where `hyphenate` says and not at the tap targets' edges.
          nameDays:
            names.length > 0 ? (
              <span className="cal-font-nameday cal-cell-nameday text-muted block leading-[1.25]">
                <NameDayNames
                  names={names}
                  pack={pack}
                  onOpen={onOpenNames}
                  hyphenated
                  minWordLength={minHyphenatedLetters(nameDayScale)}
                />
              </span>
            ) : null,
          note: (
            <DayEntry
              text={entry}
              editing={editing}
              font={MONTH_CELL_FONT}
              size={textSize}
              bounded
              onCommit={(text) => onCommit(cell.key, text)}
              onClose={() => onEditDay(null)}
            />
          ),
        }}
      />

      {/* The whole-cell stroke, over the day rather than in it: last in the
          cell so it sits above the note, and `pointer-events-none` so the
          cell is still a tap target underneath. */}
      {marked === "cell" && <PastMark style={pastMark.style} />}
    </div>
  );
});

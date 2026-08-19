// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week planner — one week at a time, one generous row per weekday (the
// "Veckoplanerare" board): the date set big in a lane down the left with the
// day's own printing stacked under it — weekday, holiday, name days — and the
// whole rest of the row left to write in.
//
// The almanac's four pieces are a *column*, not a header line: a row is a
// hundred-odd pixels tall, so a header line spent the row's width on printing
// that is read at a glance and left the writing area only what was under it.
// Stacked in a lane, the date reads across the week the way it does on a paper
// planner, and the note beside it gets the row's full height.

import { memo, useMemo } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  buildWeekStrip,
  parseDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import { DayEntry } from "./DayEntry.tsx";
import { WEEK_ROW_FONT, type EntryTextSize } from "./entryFont.ts";
import { useT } from "./i18n/index.ts";
import {
  holidayFor,
  isRedDay,
  monthName,
  nameDaysFor,
  weekNumber,
  weekdayName,
  type LocalePack,
} from "./locale/index.ts";
import { CONTENT_BOTTOM_PAD } from "./layout.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { MarkedDate, PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import type { CalendarDoc } from "./types.ts";

type Props = {
  /** Any day inside the week on display. */
  anchor: DayKey;
  today: DayKey;
  pack: LocalePack;
  showNameDays: boolean;
  /** The stroke drawn over the days that have passed, if any. */
  pastMark: PastMarkSetting;
  textSize: EntryTextSize;
  doc: CalendarDoc;
  editingDay: DayKey | null;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Tapping a holiday's name opens the holidays screen. Takes the year so the
   *  handler can stay one stable function across every day of every period the
   *  deck holds, rather than a fresh closure per row. */
  onOpenHolidays: (year: number) => void;
  /** Tapping one of the day's names opens the name-day search on it. */
  onOpenNames: (name: string) => void;
};

/** Memoized for the same reason as the other two views: the deck keeps three
 *  weeks mounted and only one of them ever changes. */
export const WeekPlannerView = memo(function WeekPlannerView({
  anchor,
  today,
  pack,
  showNameDays,
  pastMark,
  textSize,
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
  const days = useMemo(
    () => buildWeekStrip(anchor, { weekStartsOn: pack.weekStartsOn, today }),
    [anchor, pack.weekStartsOn, today],
  );
  const first = parseDayKey(days[0].key);
  const year = first?.year ?? 0;

  return (
    <div
      className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden px-3 sm:px-6"
      style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
    >
      <PeriodHeading
        title={t("topbar.week", { n: weekNumber(pack, days[0].key) })}
        meta={first ? `${monthName(pack, first.month)} ${first.year}` : ""}
        titleClass="cal-serif text-2xl tracking-wide sm:text-3xl"
        metaClass="text-lg"
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {/* Seven equal rows sharing the screen. No min-height: the view does not
          scroll, so on a short viewport the rows give ground rather than push
          the last weekday past the bottom edge. */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-line">
        {days.map((cell) => {
          const parts = parseDayKey(cell.key);
          const weekday = new Date(`${cell.key}T12:00:00Z`).getUTCDay();
          const holiday = parts
            ? holidayFor(pack, parts.year, parts.month, parts.day)
            : null;
          const red = parts
            ? isRedDay(pack, parts.year, parts.month, parts.day, weekday)
            : false;
          const names =
            showNameDays && parts
              ? nameDaysFor(pack, parts.month, parts.day)
              : [];
          const entry = doc.entries[cell.key] ?? "";
          const marked = pastMarkSlot(pastMark, cell.key, today);
          return (
            <div
              key={cell.key}
              role="button"
              tabIndex={0}
              aria-label={cell.key}
              onClick={() => onEditDay(cell.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editingDay !== cell.key) {
                  e.preventDefault();
                  onEditDay(cell.key);
                }
              }}
              className={`cal-week-row relative flex min-h-0 flex-1 cursor-text items-start gap-2 overflow-hidden border-b border-line px-2 py-1 focus-visible:outline-2 ${
                cell.isToday ? "bg-surface-2" : ""
              }`}
            >
              {/* The almanac's lane — a width, not a shrink-wrap: seven ragged
                  left edges on the writing area would read as seven columns
                  rather than one board. 112 px is what the stack needs to stay
                  inside a portrait row: it holds "Trettondedag jul" on one line
                  and the longest run of names on two, which with the date and
                  the weekday is the row's height. Wider buys no extra line —
                  "Kristi himmelsfärds dag" wraps at any width the note can
                  spare — and would spend the note's room to do it. A pack that
                  prints no name days has nothing that wide to set, so it gets
                  the narrower lane (wide enough for "Wednesday") and the note
                  gets the difference back, the same rule the day list's week
                  gutter follows. `--cal-lane` is only the base: the lane grows
                  with the caption scales, in `src/styles.css`. */}
              <div
                className={`cal-week-lane flex shrink-0 flex-col leading-tight ${
                  showNameDays
                    ? "[--cal-lane:7rem] sm:[--cal-lane:9rem]"
                    : "[--cal-lane:5rem] sm:[--cal-lane:7rem]"
                }`}
              >
                <MarkedDate style={marked === "date" ? pastMark.style : "none"}>
                  {/* 24 px is a measurement, like the month cell's caption:
                      it is the largest date that still leaves the row room for
                      the weekday, a holiday and a line of names at the *top* of
                      the size ladder (Large), where the date grows but the row
                      does not. */}
                  <span
                    className={`cal-font-day cal-size-day leading-none [--cal-base:1.5rem] ${
                      red ? "cal-red" : "text-fg"
                    }`}
                  >
                    {parts?.day}
                  </span>
                </MarkedDate>
                <span
                  className={`cal-serif text-sm ${red ? "cal-red" : "text-muted"}`}
                >
                  {weekdayName(pack, weekday)}
                </span>
                {/* Also the way into the holidays screen — see the same tap
                    target in the month view. */}
                {holiday && (
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
                    className={`cal-font-holiday cal-size-holiday cursor-pointer [--cal-base:11px] focus-visible:outline-2 ${
                      holiday.red ? "cal-red" : "text-muted"
                    }`}
                  >
                    {holiday.name}
                  </span>
                )}
                {names.length > 0 && (
                  <span className="cal-font-nameday cal-size-nameday text-muted [--cal-base:10px]">
                    {/* Every name is also the way into the name-day search. */}
                    <NameDayNames
                      names={names}
                      pack={pack}
                      onOpen={onOpenNames}
                    />
                  </span>
                )}
              </div>
              <div className="min-h-0 min-w-0 flex-1 self-stretch">
                <DayEntry
                  text={entry}
                  editing={editingDay === cell.key}
                  font={WEEK_ROW_FONT}
                  size={textSize}
                  bounded
                  onCommit={(text) => onCommit(cell.key, text)}
                  onClose={() => onEditDay(null)}
                />
              </div>

              {/* The whole-row stroke — drawn over the row's content, and
                  transparent to taps so the day still opens under it. */}
              {marked === "cell" && <PastMark style={pastMark.style} />}
            </div>
          );
        })}
      </div>
    </div>
  );
});

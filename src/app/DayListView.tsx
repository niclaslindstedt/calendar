// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day list — the month as a vertical scroll, one row per day (the
// name-day calendar look): day number in the margin, the day's names small
// beside it, the note filling the line. A small month image heads the list
// when a pack ships one. Rows are fixed-height by default; the "dynamic"
// setting lets a row grow with its text for people who write more.

import { memo } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { toDayKey } from "@niclaslindstedt/oss-framework/calendar";

import { DayEntry } from "./DayEntry.tsx";
import { LIST_ROW_FONT, type EntryTextSize } from "./entryFont.ts";
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
import { LIST_BOTTOM_PAD } from "./layout.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { MarkedDate, PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { monthImageUrl } from "./monthImage.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import { DECK_SCROLLER } from "./SwipeDeck.tsx";
import type { ListRowMode } from "./useAppSettings.ts";
import type { CalendarDoc } from "./types.ts";

type Props = {
  year: number;
  month: number;
  today: DayKey;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  rowMode: ListRowMode;
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
   *  handler can stay one stable function across every row of every period the
   *  deck holds, rather than a fresh closure per day. */
  onOpenHolidays: (year: number) => void;
  /** Tapping one of the day's names opens the name-day search on it. */
  onOpenNames: (name: string) => void;
};

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Memoized for the same reason as the month grid: the deck keeps three months
 *  mounted, and the two off screen must not be rebuilt every time something
 *  else in the app changes. */
export const DayListView = memo(function DayListView({
  year,
  month,
  today,
  pack,
  showWeekNumbers,
  showNameDays,
  rowMode,
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
  const image = monthImageUrl(year, month, "small");
  const count = daysInMonth(year, month);

  return (
    // The list is the one paged view that scrolls, so it owns the vertical
    // axis inside its pane while the deck around it owns the horizontal one.
    // `DECK_SCROLLER` hands that offset back to the deck: a swipe reveals the
    // neighbouring month from its top, so that is where the page turn has to
    // leave you — not at whatever row you had scrolled to in the month before.
    <div
      {...DECK_SCROLLER}
      className="mx-auto h-full w-full max-w-2xl overflow-y-auto overscroll-contain px-3 sm:px-6"
    >
      {/* The slim artwork band (smaller than the month view's). */}
      {image && (
        <img
          src={image}
          alt=""
          className="h-[22svh] w-full object-cover"
          loading="lazy"
        />
      )}

      {/* Pinned to the top of the list's own scroller: this is the one view
          that scrolls far enough to lose sight of which month you are in, and
          the arrows come along so paging never means scrolling back up. The
          background is opaque — rows pass underneath it — and the hairline it
          carries is the one the rows below used to start with, so the heading
          keeps the list's top border rather than adding a second line. */}
      <PeriodHeading
        title={monthName(pack, month)}
        meta={String(year)}
        titleClass="cal-serif text-2xl tracking-wide sm:text-3xl"
        metaClass="text-lg"
        className="bg-page-bg sticky top-0 z-10 border-b border-line"
        onPrevious={onPrevious}
        onNext={onNext}
      />

      <div>
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const key = toDayKey({ year, month, day });
          return (
            <DayRow
              key={key}
              dayKey={key}
              year={year}
              month={month}
              day={day}
              pack={pack}
              showWeekNumbers={showWeekNumbers}
              showNameDays={showNameDays}
              today={today}
              pastMark={pastMark}
              textSize={textSize}
              entry={doc.entries[key] ?? ""}
              editing={editingDay === key}
              // A fixed row clips, so its note is measured against the row;
              // the row it is being typed into grows instead, whatever the
              // setting, so the caret is never in a box it has outgrown.
              fixed={rowMode === "fixed" && editingDay !== key}
              onEditDay={onEditDay}
              onCommit={onCommit}
              onOpenHolidays={onOpenHolidays}
              onOpenNames={onOpenNames}
            />
          );
        })}
      </div>

      {/* The gutter under the last day. An in-flow spacer rather than
          `padding-bottom` on the scroller: trailing padding is not counted
          into the scrollable overflow by every engine, so on a phone the last
          row could not be scrolled clear of the bottom edge. */}
      <div aria-hidden="true" style={{ height: LIST_BOTTOM_PAD }} />
    </div>
  );
});

/** One day of the list. Memoized, and given only primitives and stable
 *  references so the memo actually holds: everything a row draws — its
 *  weekday, its holiday, its names, its week marker — is derived from the day
 *  and the pack in here rather than computed by the list and passed down as
 *  fresh objects. Opening the editor then renders one row instead of ninety. */
const DayRow = memo(function DayRow({
  dayKey,
  year,
  month,
  day,
  pack,
  showWeekNumbers,
  showNameDays,
  today,
  pastMark,
  textSize,
  entry,
  editing,
  fixed,
  onEditDay,
  onCommit,
  onOpenHolidays,
  onOpenNames,
}: {
  dayKey: DayKey;
  /** The month's own year — what a tapped holiday opens the screen on. */
  year: number;
  month: number;
  day: number;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  today: DayKey;
  pastMark: PastMarkSetting;
  textSize: EntryTextSize;
  entry: string;
  editing: boolean;
  fixed: boolean;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onOpenHolidays: (year: number) => void;
  onOpenNames: (name: string) => void;
}) {
  const t = useT();
  const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
  const holiday = holidayFor(pack, year, month, day);
  const red = isRedDay(pack, year, month, day, weekday);
  const names = showNameDays ? nameDaysFor(pack, month, day) : [];
  const marked = pastMarkSlot(pastMark, dayKey, today);
  // A small week marker on the first day of each week (and on the 1st), the
  // way Swedish wall calendars badge their week rows. Bare number, like the
  // month grid's gutter: once the marker has a lane of its own the column says
  // "week" by itself, and the prefix was portrait width spent repeating it.
  const startsWeek = weekday === pack.weekStartsOn || day === 1;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={dayKey}
      onClick={() => onEditDay(dayKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !editing) {
          e.preventDefault();
          onEditDay(dayKey);
        }
      }}
      className={`relative flex cursor-text items-start gap-2 border-b border-line px-1 py-1 focus-visible:outline-2 ${
        fixed ? "h-11 overflow-hidden" : "min-h-11"
      } ${dayKey === today ? "bg-surface-2" : ""}`}
    >
      {/* The week gutter is only reserved when week numbers are on —
          otherwise every row carries dead left margin. It is sized to its
          digits rather than to the day column: two digits are 14 px at the
          ladder's top stop, so a 16 px lane holds the widest week number at
          any text size, and the negative margin halves the row's gap on the
          number's right. Both sides of the marker stay narrow so the day
          number reads as the row's start. */}
      {showWeekNumbers && (
        <span
          className="text-muted cal-size-week -mr-1 w-4 shrink-0 pt-1 text-right leading-tight [--cal-base:9px]"
          aria-label={
            startsWeek
              ? t("topbar.week", { n: weekNumber(pack, dayKey) })
              : undefined
          }
        >
          {startsWeek ? weekNumber(pack, dayKey) : ""}
        </span>
      )}
      <span
        className={`cal-font-day cal-size-day w-7 shrink-0 text-right leading-tight [--cal-base:1.125rem] ${
          red ? "cal-red" : "text-fg"
        }`}
      >
        <MarkedDate style={marked === "date" ? pastMark.style : "none"}>
          {day}
        </MarkedDate>
      </span>
      <span
        className={`w-8 shrink-0 pt-1 text-[10px] leading-tight ${
          red ? "cal-red" : "text-muted"
        }`}
      >
        {weekdayName(pack, weekday, "short")}
      </span>
      {/* The holiday and the day's names share this column and **wrap** rather
          than truncate: "Trettondedag jul · Kasper, Melker" ending in an
          ellipsis tells you a name is there and refuses to say which. Two
          lines of 10 px still clear a fixed 44 px row. */}
      <span className="w-24 shrink-0 pt-1 text-[10px] leading-tight sm:w-36">
        {/* Also the way into the holidays screen — see the same tap target in
            the month view. */}
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
            className={`cal-font-holiday cal-size-holiday cursor-pointer [--cal-base:10px] focus-visible:outline-2 ${
              holiday.red ? "cal-red" : "text-muted"
            }`}
          >
            {holiday.name}
          </span>
        )}
        {holiday && names.length > 0 && <span className="text-muted"> · </span>}
        <span className="cal-font-nameday cal-size-nameday text-muted [--cal-base:10px]">
          {/* Every name is also the way into the name-day search. */}
          <NameDayNames names={names} pack={pack} onOpen={onOpenNames} />
        </span>
      </span>
      <div className="min-h-0 min-w-0 flex-1 self-stretch pt-0.5">
        <DayEntry
          text={entry}
          editing={editing}
          font={LIST_ROW_FONT}
          size={textSize}
          bounded={fixed}
          onCommit={(text) => onCommit(dayKey, text)}
          onClose={() => onEditDay(null)}
        />
      </div>

      {/* The whole-row stroke — over the row, transparent to taps. */}
      {marked === "cell" && <PastMark style={pastMark.style} />}
    </div>
  );
});

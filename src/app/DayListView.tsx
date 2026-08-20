// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day list — the month as a vertical scroll, one row per day, laid out
// like the printed column calendar it is drawn from and sharing its anatomy
// with the week planner (`stripRow.tsx`): the date at the head of the row with
// the weekday beside it and the day's names under that, the day's ordinal in
// the year small in the margin behind them, the note filling the
// middle, and the almanac's marginalia in a rail on the right — the week
// number where a week opens, the holiday's name along the bottom. A heavier
// rule — in the heading's own colour, where the heading is banded — crosses the
// list wherever the week changes, which is the one thing this view can show
// that a single-week strip cannot.
//
// A small month image heads the list when a pack ships one. Rows are
// fixed-height by default; the "dynamic" setting lets a row grow with its text
// for people who write more.

import { memo, useMemo, type CSSProperties } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { toDayKey } from "@niclaslindstedt/oss-framework/calendar";

import { DayEntry } from "./DayEntry.tsx";
import { LIST_ROW_FONT, type EntryTextSize } from "./entryFont.ts";
import {
  holidayFor,
  isRedDay,
  monthName,
  nameDaysFor,
  weekNumber,
  type LocalePack,
} from "./locale/index.ts";
import { LIST_BOTTOM_PAD } from "./layout.ts";
import { PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { monthImageUrl } from "./monthImage.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import { marginReserved, type StripLayout } from "./stripLayout.ts";
import { StripLane, StripNote, StripRail, type StripDay } from "./stripRow.tsx";
import { SCOPE_CLASS } from "./viewStyle.ts";
import { DECK_SCROLLER } from "./SwipeDeck.tsx";
import type { ListRowMode } from "./useAppSettings.ts";
import type { CalendarDoc } from "./types.ts";
import { startsWeek, type WeekFormat } from "./weekPlanner.ts";

/** What the list sets its date at. Not the week planner's setting: a list row
 *  is a line of a month-long scroll rather than a band a seventh of the screen
 *  high, so its date is sized to the two caption lines beside it and stays
 *  there. The shared day-number scale still multiplies it. */
export const LIST_DATE_BASE = "1.25rem";

type Props = {
  year: number;
  month: number;
  today: DayKey;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  /** Whether each row prints the day's ordinal in the year (1–366) — the same
   *  setting the week planner reads, because it is the same gloss printed in
   *  the same lane. */
  showDayOfYear: boolean;
  /** Which margin each piece of a row is printed in — shared with the week
   *  planner, which prints the same row (Settings → Calendar → View). */
  layout: StripLayout;
  rowMode: ListRowMode;
  /** How the rail prints a week number: "Week 34", "w 34", or "34" — the same
   *  setting the week planner reads, because it is the same piece of almanac
   *  printed in the same margin. */
  weekFormat: WeekFormat;
  /** The heading band's colour (Settings → Calendar → Heading), or `null`. */
  headerInk: string | null;
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
  showDayOfYear,
  layout,
  rowMode,
  weekFormat,
  headerInk,
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
  // Whether each margin is rendered at all, decided once for the month rather
  // than per row — the same rule the week planner follows, and for the same
  // reason: a margin that came and went down a ninety-row scroll would give
  // the note a different width on every line. Reserved when the month has
  // something to print in it, and left out entirely when it has not; what
  // lands in which margin is the reader's arrangement.
  const has = useMemo(
    () => ({
      day: true,
      nameDays: showNameDays,
      week: showWeekNumbers,
      holidays: Array.from({ length: count }, (_, i) =>
        holidayFor(pack, year, month, i + 1),
      ).some((holiday) => holiday !== null),
    }),
    [count, month, pack, showNameDays, showWeekNumbers, year],
  );
  // The year-day number stays in the lane whatever the arrangement (it is a
  // gloss on the date, not a piece of the almanac), so it can be the only
  // reason the lane is drawn at all — the same rule the week planner follows.
  const lane = marginReserved(layout, "lane", has) || showDayOfYear;
  const rail = marginReserved(layout, "rail", has);

  return (
    // The list is the one paged view that scrolls, so it owns the vertical
    // axis inside its pane while the deck around it owns the horizontal one.
    // `DECK_SCROLLER` hands that offset back to the deck: a swipe reveals the
    // neighbouring month from its top, so that is where the page turn has to
    // leave you — not at whatever row you had scrolled to in the month before.
    <div
      {...DECK_SCROLLER}
      className={`${SCOPE_CLASS.strip} mx-auto h-full w-full max-w-3xl overflow-y-auto overscroll-contain px-3 sm:px-6`}
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
          keeps the list's top border rather than adding a second line. A
          coloured band is already an edge, so it drops the hairline: a rule
          immediately under a solid band reads as a stray line. */}
      <PeriodHeading
        title={monthName(pack, month)}
        meta={String(year)}
        titleClass="cal-serif text-2xl tracking-wide sm:text-3xl"
        metaClass="text-lg"
        accent={headerInk}
        bleed
        className={`bg-page-bg sticky top-0 z-10 ${
          headerInk ? "" : "border-b border-line"
        }`}
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
              showDayOfYear={showDayOfYear}
              weekFormat={weekFormat}
              layout={layout}
              lane={lane}
              rail={rail}
              headerInk={headerInk}
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
  showDayOfYear,
  weekFormat,
  layout,
  lane,
  rail,
  headerInk,
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
  showDayOfYear: boolean;
  weekFormat: WeekFormat;
  layout: StripLayout;
  /** Whether the month reserved each margin (decided once, by the list). */
  lane: boolean;
  rail: boolean;
  headerInk: string | null;
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
  const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
  const holiday = holidayFor(pack, year, month, day);
  const red = isRedDay(pack, year, month, day, weekday);
  const names = showNameDays ? nameDaysFor(pack, month, day) : [];
  const marked = pastMarkSlot(pastMark, dayKey, today);
  // The week number is printed on the day that opens the week — and on the
  // 1st, whatever weekday it falls on, so a month never starts without saying
  // which week you are in. The heavier rule is the *week's* though, so it is
  // drawn only where a week actually changes: a 1st mid-week gets the number
  // without the line.
  const opens = startsWeek(weekday, pack.weekStartsOn);
  const marks = opens || day === 1;

  const stripDay: StripDay = {
    layout,
    dayKey,
    day,
    pack,
    weekday,
    names,
    holiday,
    weekNumber: showWeekNumbers && marks ? weekNumber(pack, dayKey) : null,
    weekFormat,
    red,
    markDate: marked === "date" ? pastMark.style : "none",
    dateBase: LIST_DATE_BASE,
    ink: headerInk,
    showDayOfYear,
    onOpenNames,
    onOpenHolidays: () => onOpenHolidays(year),
  };

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
      // The week rule's ink, where a week opens and the heading is banded: the
      // same colour the rail's week numbers are printed in, so the two marks
      // that say "a week starts here" say it in one voice. Nothing to set with
      // the band off — the rule falls back to the hairline's own colour.
      style={
        opens && headerInk
          ? ({ "--cal-week-rule": headerInk } as CSSProperties)
          : undefined
      }
      // 3.25 rem is the row measured rather than chosen: a weekday line
      // (14 px), the gap under it, and *two* lines of names — which is not an
      // edge case but the ordinary Swedish day ("Bernhard, Bernt" does not
      // hold an 88 px lane) — come to 41 px, and the row's own padding takes
      // the rest. A shorter fixed row clipped the second name away.
      className={`cal-strip-row relative flex cursor-text items-stretch gap-2 border-b border-line px-2 py-1 focus-visible:outline-2 ${
        fixed ? "h-[3.25rem] overflow-hidden" : "min-h-[3.25rem]"
      } ${opens ? "cal-strip-break" : ""} ${
        dayKey === today ? "bg-surface-2" : ""
      }`}
    >
      {lane && <StripLane day={stripDay} />}

      <StripNote>
        <DayEntry
          text={entry}
          editing={editing}
          font={LIST_ROW_FONT}
          size={textSize}
          bounded={fixed}
          onCommit={(text) => onCommit(dayKey, text)}
          onClose={() => onEditDay(null)}
        />
      </StripNote>

      {rail && <StripRail day={stripDay} />}

      {/* The whole-row stroke — over the row, transparent to taps. */}
      {marked === "cell" && <PastMark style={pastMark.style} />}
    </div>
  );
});

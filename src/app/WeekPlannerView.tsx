// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week planner — one week at a time, one generous row per weekday, laid
// out the way a Swedish column calendar prints its strip: the date set big at
// the head of the row with the weekday beside it and the day's names under
// that, the day's ordinal in the year small in the margin behind them, the
// rest of the row left blank to write in, and the almanac's own marginalia —
// the week number where a week opens, the holiday's name — printed down the
// right-hand edge.
//
// Two things about that arrangement are load-bearing rather than decorative:
//
//   * The almanac's pieces are *margins*, not a header line. A row is a
//     hundred-odd pixels tall, so a header line spent the row's width on
//     printing that is read at a glance and left the writing area only what
//     was under it. A lane on the left and a rail on the right leave the note
//     the row's full height between them — and, being floats only as tall as
//     what they print, the row's full width under them (`stripRow.tsx`).
//   * The week's opening day carries a heavier rule above it. In a view that
//     shows exactly one week that rule is the strip's top edge — which is the
//     point: paging through the weeks, the heavy line is where one week ends
//     and the next begins, the same mark the printed strip uses down a month.

import { memo, useMemo, useRef } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  buildWeekStrip,
  parseDayKey,
} from "@niclaslindstedt/oss-framework/calendar";
import { useLongPress } from "@niclaslindstedt/oss-framework/hooks";

import { DayEntry } from "./DayEntry.tsx";
import {
  WEEK_ROW_FONT,
  scaleEntryFont,
  type EntryTextSize,
} from "./entryFont.ts";
import {
  holidayFor,
  isRedDay,
  monthName,
  nameDaysFor,
  weekNumber,
  type LocalePack,
} from "./locale/index.ts";
import { CONTENT_BOTTOM_PAD, LIST_BOTTOM_PAD } from "./layout.ts";
import { PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import { marginReserved, type StripLayout } from "./stripLayout.ts";
import {
  STRIP_ROW_EDGE,
  STRIP_ROW_FRAME,
  StripBody,
  type StripDay,
} from "./stripRow.tsx";
import { useRoom } from "./useRoom.ts";
import { SCOPE_CLASS } from "./viewStyle.ts";
import { DECK_SCROLLER } from "./SwipeDeck.tsx";
import type { CalendarDoc } from "./types.ts";
import {
  WEEK_ROW_MIN_HEIGHT,
  startsWeek,
  weekDateBase,
  type WeekDateSize,
  type WeekFormat,
  type WeekRowMode,
} from "./weekPlanner.ts";

type Props = {
  /** Any day inside the week on display. */
  anchor: DayKey;
  today: DayKey;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  /** Whether each row prints the day's ordinal in the year (1–366). */
  showDayOfYear: boolean;
  /** Which margin each piece of a row is printed in — shared with the day
   *  list, which prints the same row (Settings → Calendar → View). */
  layout: StripLayout;
  /** Rows all one height, or grown by what is written in them. */
  rowMode: WeekRowMode;
  /** How the margin prints a week number: "Week 34", "w 34", or "34". */
  weekFormat: WeekFormat;
  /** How big the date is set at the head of a row. */
  dateSize: WeekDateSize;
  /** The heading band's colour, which the week numbers are printed in too —
   *  `null` for the plain heading, and then the page's own ink. */
  headerInk: string | null;
  /** Whether the heading prints its period arrows — off where the reader
   *  pages up and down (`navSwipe.ts`). */
  arrows: boolean;
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
  /** A long press holds the day up close (`DayZoom`). */
  onZoomDay: (day: DayKey) => void;
};

/** Memoized for the same reason as the other two views: the deck keeps three
 *  weeks mounted and only one of them ever changes. */
export const WeekPlannerView = memo(function WeekPlannerView({
  anchor,
  today,
  pack,
  showWeekNumbers,
  showNameDays,
  showDayOfYear,
  layout,
  rowMode,
  weekFormat,
  dateSize,
  headerInk,
  arrows,
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
  onZoomDay,
}: Props) {
  // Press and hold to zoom (`DayZoom`). One hook for the seven rows rather
  // than one per row, because the rows here are a `map` in this component
  // rather than a component of their own — so the row records which day the
  // finger went down on and the hook reads it when the press comes good. The
  // other two views can call the hook inside their own memoized row.
  const pressed = useRef<DayKey | null>(null);
  const press = useLongPress(() => {
    const day = pressed.current;
    if (day && editingDay !== day) onZoomDay(day);
  });
  const days = useMemo(
    () => buildWeekStrip(anchor, { weekStartsOn: pack.weekStartsOn, today }),
    [anchor, pack.weekStartsOn, today],
  );
  const first = parseDayKey(days[0].key);
  const year = first?.year ?? 0;
  // The heading names the month, not the week: the week number is printed
  // where the almanac prints it, in the margin of the day that opens the week,
  // and a heading that repeated it there spent the one wide line the view has
  // on a number that is already on the page.
  //
  // A week that straddles two months is named for the one it mostly lies in —
  // its middle day, which for both shipped packs (and any pack numbering weeks
  // by ISO-8601) is the Thursday the week is defined to belong to. One month
  // name, always: the alternative, printing both, is a two-line heading on a
  // portrait phone in exactly the weeks a reader is most likely to be paging
  // through.
  const mid = parseDayKey(days[3]?.key ?? days[0].key) ?? first;
  const grows = rowMode === "dynamic";

  // Whether each margin is rendered at all, decided once for the whole week
  // rather than per row. A margin that came and went down the strip would give
  // the note seven different widths and seven ragged edges — the same reason
  // the lane is a width rather than a shrink-wrap. So each is reserved when
  // the week has something to print in it and left out entirely when it has
  // not, which is what keeps a plain English week from carrying 64 px of dead
  // right margin on every row. What lands in which margin is the reader's
  // arrangement, so the question is asked of that rather than of a fixed idea
  // of what a rail holds.
  const has = useMemo(
    () => ({
      day: true,
      nameDays: showNameDays,
      week: showWeekNumbers,
      holidays: days.some((cell) => {
        const parts = parseDayKey(cell.key);
        return parts
          ? holidayFor(pack, parts.year, parts.month, parts.day) !== null
          : false;
      }),
    }),
    [days, pack, showNameDays, showWeekNumbers],
  );
  // The note's band, on the screen this is actually being drawn on: the same
  // rows on a desk monitor are taller and their notes are set larger
  // (`roomScale.ts`), and the band is a px number rather than a CSS length
  // because `entryFit.ts` measures the note against it.
  const room = useRoom("strip");
  const entryFont = useMemo(() => scaleEntryFont(WEEK_ROW_FONT, room), [room]);

  const lane = marginReserved(layout, "lane", has) || showDayOfYear;
  const rail = marginReserved(layout, "rail", has);

  const heading = (
    <PeriodHeading
      title={mid ? monthName(pack, mid.month) : ""}
      meta={mid ? String(mid.year) : ""}
      accent={headerInk}
      bleed
      arrows={arrows}
      // Grown rows turn the one view that fits a week on a screen into a
      // scroller, so the heading pins itself the way the day list's does —
      // otherwise scrolling to Sunday loses which week you are in.
      className={grows ? "bg-page-bg sticky top-0 z-10" : ""}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );

  const strip = days.map((cell, i) => {
    const parts = parseDayKey(cell.key);
    const weekday = new Date(`${cell.key}T12:00:00Z`).getUTCDay();
    const holiday = parts
      ? holidayFor(pack, parts.year, parts.month, parts.day)
      : null;
    const red = parts
      ? isRedDay(pack, parts.year, parts.month, parts.day, weekday)
      : false;
    const names =
      showNameDays && parts ? nameDaysFor(pack, parts.month, parts.day) : [];
    const entry = doc.entries[cell.key] ?? "";
    const marked = pastMarkSlot(pastMark, cell.key, today);
    const opens = startsWeek(weekday, pack.weekStartsOn);
    // The week-change rule, except where the band above has already drawn the
    // line: a coloured heading is a solid edge, and a rule immediately under
    // it reads as a stray hairline rather than as the start of a week.
    const bandedTop = i === 0 && headerInk !== null;
    const stripDay: StripDay = {
      layout,
      dayKey: cell.key,
      day: parts?.day ?? 0,
      pack,
      weekday,
      names,
      holiday,
      weekNumber: showWeekNumbers && opens ? weekNumber(pack, cell.key) : null,
      weekFormat,
      red,
      markDate: marked === "date" ? pastMark.style : "none",
      dateBase: weekDateBase(dateSize),
      ink: headerInk,
      showDayOfYear,
      onOpenNames,
      onOpenHolidays: () => onOpenHolidays(year),
    };
    return (
      <div
        key={cell.key}
        role="button"
        tabIndex={0}
        aria-label={cell.key}
        {...press}
        onPointerDown={(e) => {
          pressed.current = cell.key;
          press.onPointerDown(e);
        }}
        onClick={() => onEditDay(cell.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && editingDay !== cell.key) {
            e.preventDefault();
            onEditDay(cell.key);
          }
        }}
        // `flex-1` only where the seven rows share one screen. A grown strip
        // sizes each row by its own contents instead, with the fixed row's
        // height as the floor so an empty week still looks like a week.
        style={grows ? { minHeight: WEEK_ROW_MIN_HEIGHT } : undefined}
        className={`cal-day cal-strip-row cal-week-row relative ${STRIP_ROW_FRAME} cursor-text border-b border-line py-1 focus-visible:outline-2 ${STRIP_ROW_EDGE} ${
          grows ? "" : "min-h-0 flex-1 overflow-hidden"
        } ${opens && !bandedTop ? "cal-strip-break" : ""} ${
          cell.isToday ? "bg-surface-2" : ""
        }`}
      >
        <StripBody day={stripDay} lane={lane} rail={rail}>
          <DayEntry
            text={entry}
            editing={editingDay === cell.key}
            font={entryFont}
            size={textSize}
            // A row that cannot grow measures its note against itself; a grown
            // one has no bound to measure against and simply takes the height
            // the text needs.
            bounded={!grows}
            // …and either way its lines run beside the row's margins and then
            // under them, which is what a note that has outgrown the row has
            // to be ended against.
            flow
            onCommit={(text) => onCommit(cell.key, text)}
            onClose={() => onEditDay(null)}
          />
        </StripBody>

        {/* The whole-row stroke — drawn over the row's content, and
            transparent to taps so the day still opens under it. */}
        {marked === "cell" && <PastMark style={pastMark.style} />}
      </div>
    );
  });

  // Fixed rows fill exactly one screen and the pane never scrolls; grown rows
  // scroll inside the deck's pane, the way the day list does — including the
  // in-flow spacer under the last row, because a scroll container's trailing
  // padding is not counted into the scrollable overflow by every engine.
  return grows ? (
    <div
      {...DECK_SCROLLER}
      className={`${SCOPE_CLASS.strip} mx-auto h-full w-full max-w-3xl overflow-y-auto overscroll-contain px-3 sm:px-6`}
    >
      {heading}
      <div>{strip}</div>
      <div aria-hidden="true" style={{ height: LIST_BOTTOM_PAD }} />
    </div>
  ) : (
    <div
      className={`${SCOPE_CLASS.strip} mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden px-3 sm:px-6`}
      style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
    >
      {heading}
      {/* Seven equal rows sharing the screen. No min-height: the view does not
          scroll, so on a short viewport the rows give ground rather than push
          the last weekday past the bottom edge. */}
      <div className="flex min-h-0 flex-1 flex-col">{strip}</div>
    </div>
  );
});

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
//     the row's full height between them.
//   * The week's opening day carries a heavier rule above it. In a view that
//     shows exactly one week that rule is the strip's top edge — which is the
//     point: paging through the weeks, the heavy line is where one week ends
//     and the next begins, the same mark the printed strip uses down a month.

import { memo, useMemo, type CSSProperties } from "react";

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
import { CONTENT_BOTTOM_PAD, LIST_BOTTOM_PAD } from "./layout.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { MarkedDate, PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import { DECK_SCROLLER } from "./SwipeDeck.tsx";
import type { CalendarDoc } from "./types.ts";
import {
  WEEK_ROW_MIN_HEIGHT,
  dayOfYear,
  startsWeek,
  weekDateBase,
  weekNumberLabel,
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
  /** Rows all one height, or grown by what is written in them. */
  rowMode: WeekRowMode;
  /** How the margin prints a week number: "Week 34", "w 34", or "34". */
  weekFormat: WeekFormat;
  /** How big the date is set at the head of a row. */
  dateSize: WeekDateSize;
  /** The heading band's colour, which the week numbers are printed in too —
   *  `null` for the plain heading, and then the page's own ink. */
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
  showWeekNumbers,
  showNameDays,
  showDayOfYear,
  rowMode,
  weekFormat,
  dateSize,
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
  const t = useT();
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

  // Whether the right-hand rail is rendered at all, decided once for the whole
  // week rather than per row. A rail that came and went down the strip would
  // give the note seven different widths and seven ragged right edges — the
  // same reason the lane on the left is a width rather than a shrink-wrap. So
  // it is reserved when the week has anything to print in it (a week number,
  // or any holiday among its seven days) and left out entirely when it has
  // not, which is what keeps a plain English week from carrying 64 px of dead
  // right margin on every row.
  const rail = useMemo(
    () =>
      showWeekNumbers ||
      days.some((cell) => {
        const parts = parseDayKey(cell.key);
        return parts
          ? holidayFor(pack, parts.year, parts.month, parts.day) !== null
          : false;
      }),
    [days, pack, showWeekNumbers],
  );

  const heading = (
    <PeriodHeading
      title={mid ? monthName(pack, mid.month) : ""}
      meta={mid ? String(mid.year) : ""}
      titleClass="cal-serif text-2xl tracking-wide sm:text-3xl"
      metaClass="text-lg"
      accent={headerInk}
      // Grown rows turn the one view that fits a week on a screen into a
      // scroller, so the heading pins itself the way the day list's does —
      // otherwise scrolling to Sunday loses which week you are in.
      className={grows ? "bg-page-bg sticky top-0 z-10" : ""}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );

  const strip = days.map((cell) => {
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
        // `flex-1` only where the seven rows share one screen. A grown strip
        // sizes each row by its own contents instead, with the fixed row's
        // height as the floor so an empty week still looks like a week.
        style={grows ? { minHeight: WEEK_ROW_MIN_HEIGHT } : undefined}
        className={`cal-week-row relative flex cursor-text items-stretch gap-2 border-b border-line px-2 py-1 focus-visible:outline-2 ${
          grows ? "" : "min-h-0 flex-1 overflow-hidden"
        } ${opens ? "cal-week-break" : ""} ${
          cell.isToday ? "bg-surface-2" : ""
        }`}
      >
        {/* The almanac's lane — a width, not a shrink-wrap: seven ragged left
            edges on the writing area would read as seven columns rather than
            one board. The date leads it, at a measured 24 px (the largest that
            still leaves a portrait row its weekday and a line of names at the
            *top* of the size ladder, where the date grows but the row does
            not), with the weekday and the day's names set beside it in a
            stack. `--cal-lane` is the room that stack gets, and 88 px is what
            the longest run of names needs to hold two lines under the
            weekday; a pack that prints no name days has nothing that wide to
            set, so it gets the measured floor and nothing more, and the note
            gets the difference back — the same rule the day list's week
            gutter follows. The date's own column and the year-day number's
            are added to it in `src/styles.css`, each scaled by its own size
            setting rather than by the names'. */}
        <div
          // The date's size is the reader's (Settings → Calendar → Week
          // planner), and it is published here as one custom property because
          // two things need it: the date itself, and the width the lane bills
          // for its first column (`src/styles.css`).
          style={{ "--cal-date": weekDateBase(dateSize) } as CSSProperties}
          className={`cal-week-lane flex shrink-0 items-start gap-1.5 leading-tight ${
            showNameDays
              ? "[--cal-lane:5.5rem] sm:[--cal-lane:7rem]"
              : "[--cal-lane:4.25rem] sm:[--cal-lane:5.5rem]"
          } ${showDayOfYear ? "[--cal-lane-extra:1.375rem]" : ""}`}
        >
          <MarkedDate style={marked === "date" ? pastMark.style : "none"}>
            <span
              className={`cal-font-day cal-size-day leading-none [--cal-base:var(--cal-date,1.5rem)] ${
                red ? "cal-red" : "text-fg"
              }`}
            >
              {parts?.day}
            </span>
          </MarkedDate>
          <div className="cal-week-names flex min-w-0 flex-1 flex-col">
            <span
              className={`cal-serif text-sm leading-none ${
                red ? "cal-red" : "text-muted"
              }`}
            >
              {weekdayName(pack, weekday)}
            </span>
            {names.length > 0 && (
              <span className="cal-font-nameday cal-size-nameday text-muted mt-0.5 [--cal-base:10px]">
                {/* Every name is also the way into the name-day search. */}
                <NameDayNames names={names} pack={pack} onOpen={onOpenNames} />
              </span>
            )}
          </div>
          {/* The day's ordinal in the year, printed the way the strip
              calendar does: small, grey, hard against the lane's right edge,
              where it is available to be counted from and invisible until it
              is wanted. Sized off the week number's scale — the two are the
              same kind of number, marginalia rather than a day's content — so
              one setting moves both. */}
          {showDayOfYear && (
            <span className="cal-size-week text-muted shrink-0 pt-1 leading-none [--cal-base:9px]">
              {dayOfYear(cell.key) || ""}
            </span>
          )}
        </div>

        <div className="cal-week-note min-h-0 min-w-0 flex-1 self-stretch">
          <DayEntry
            text={entry}
            editing={editingDay === cell.key}
            font={WEEK_ROW_FONT}
            size={textSize}
            // A row that cannot grow measures its note against itself; a grown
            // one has no bound to measure against and simply takes the height
            // the text needs.
            bounded={!grows}
            onCommit={(text) => onCommit(cell.key, text)}
            onClose={() => onEditDay(null)}
          />
        </div>

        {/* The right-hand margin: the week number at the top of the day that
            opens the week, the holiday's name along the bottom. Both are the
            almanac talking rather than the day, which is why they sit outside
            the writing area instead of floating over it. */}
        {rail && (
          <div className="cal-week-rail flex w-16 shrink-0 flex-col items-end self-stretch text-right sm:w-24">
            {showWeekNumbers && opens && (
              <span
                className={`cal-serif cal-size-week leading-none italic [--cal-base:0.875rem] ${
                  headerInk ? "" : "text-fg"
                }`}
                style={headerInk ? { color: headerInk } : undefined}
                // Spelled out for a screen reader whatever the margin prints:
                // "34" on its own is a number, not a week.
                aria-label={t("topbar.week", { n: weekNumber(pack, cell.key) })}
              >
                {weekNumberLabel(weekFormat, weekNumber(pack, cell.key), {
                  long: t("topbar.week", { n: weekNumber(pack, cell.key) }),
                  mark: t("topbar.weekMark", { n: weekNumber(pack, cell.key) }),
                })}
              </span>
            )}
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
                className={`cal-font-holiday cal-size-holiday cal-week-holiday mt-auto cursor-pointer leading-tight [--cal-base:11px] focus-visible:outline-2 ${
                  holiday.red ? "cal-red" : "text-muted"
                }`}
              >
                {holiday.name}
              </span>
            )}
          </div>
        )}

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
      className="mx-auto h-full w-full max-w-3xl overflow-y-auto overscroll-contain px-3 sm:px-6"
    >
      {heading}
      <div>{strip}</div>
      <div aria-hidden="true" style={{ height: LIST_BOTTOM_PAD }} />
    </div>
  ) : (
    <div
      className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden px-3 sm:px-6"
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

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day list — the month as a vertical scroll, one row per day, laid out
// like the printed column calendar it is drawn from and sharing its anatomy
// with the week planner (`stripRow.tsx`): the date at the head of the row with
// the weekday beside it and the day's names under that, the day's ordinal in
// the year small in the margin behind them, the almanac's marginalia in a rail
// on the right — the week number where a week opens, the holiday's name along
// the bottom — and the note in what they leave: the column between them, or
// (Settings → Calendar → View) flowing around them and across the row's full
// width underneath. A heavier
// rule — in the heading's own colour, where the heading is banded — crosses the
// list wherever the week changes, which is the one thing this view can show
// that a single-week strip cannot.
//
// A small month image heads the list when a pack ships one. Rows are
// fixed-height by default; the "dynamic" setting lets a row grow with its text
// for people who write more.
//
// Where a month opens is `listHome.ts`'s: the week you are in on the month you
// opened on, and the edge you came in through on a month you paged to — its
// 1st going forward, its last day going back, so the page you turn to begins
// where the page you left ended. The deck does the scrolling, because it owns
// every pane's offset; this view only marks the row (`DECK_HOME`) — or the
// whole scroller, where the answer is its far end (`DECK_END`) — and keeps the
// pinned heading's height clear of it (`scroll-padding-top`), less the tuck
// that row asks for on top of it ({@link LIST_HOME_TUCK}).

import { memo, useMemo, type CSSProperties } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { toDayKey } from "@niclaslindstedt/oss-framework/calendar";
import { useLongPress } from "@niclaslindstedt/oss-framework/hooks";

import { DayEntry } from "./DayEntry.tsx";
import {
  LIST_ROW_FONT,
  scaleEntryFont,
  type EntryFontOptions,
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
import { LIST_BOTTOM_PAD } from "./layout.ts";
import { PastMark } from "./PastMark.tsx";
import { pastMarkSlot, type PastMark as PastMarkSetting } from "./pastDays.ts";
import { monthImageUrl } from "./monthImage.ts";
import { listOpensAt, type ListArrival } from "./listHome.ts";
import {
  HEADING_CLEARANCE,
  HEADING_GAP,
  PeriodHeading,
} from "./PeriodHeading.tsx";
import { marginReserved, type StripLayout } from "./stripLayout.ts";
import {
  STRIP_ROW_EDGE,
  STRIP_ROW_FRAME,
  STRIP_ROW_PAD,
  StripBody,
  WEEK_RULE_WIDTH,
  type StripDay,
} from "./stripRow.tsx";
import { useRoom } from "./useRoom.ts";
import { SCOPE_CLASS } from "./viewStyle.ts";
import { DECK_END, DECK_HOME, DECK_SCROLLER } from "./SwipeDeck.tsx";
import type { ListRowMode } from "./useAppSettings.ts";
import type { CalendarDoc } from "./types.ts";
import { startsWeek, type WeekFormat } from "./weekPlanner.ts";

/** What the list sets its date at. Not the week planner's setting: a list row
 *  is a line of a month-long scroll rather than a band a seventh of the screen
 *  high, so its date is sized to the two caption lines beside it and stays
 *  there. The shared day-number scale still multiplies it. */
export const LIST_DATE_BASE = "1.25rem";

/** How much further than the scroller's own clearance the month's home row is
 *  taken, as the `scroll-margin-top` that says so (negative: the row asks to
 *  land *past* where the padding would put it).
 *
 *  `scroll-padding-top` is the clearance a row scrolled into view mid-list
 *  wants — the band, and the air the band leaves under itself — and the row
 *  the month *opens* on wants one thing more. It is the row that opens a week,
 *  so it draws the week rule ({@link WEEK_RULE_WIDTH}), and left at the plain
 *  clearance that rule came to rest a few pixels under the masthead: a red line
 *  across the top of the screen with nothing above it, which reads as a stray
 *  mark rather than as "a week starts here". So the row gives up the air and
 *  the rule's own thickness with it, and the rule ends up behind the band —
 *  which is the same answer the week planner reaches by another route, where
 *  a banded heading makes the first row drop its rule outright
 *  (`opens && !bandedTop`): under a band, the band is the edge.
 *
 *  Carries the room factor because {@link HEADING_GAP} does; it is resolved
 *  from the row's computed style by the deck (`SwipeDeck`), so this is a CSS
 *  length rather than a number. */
export const LIST_HOME_TUCK = `calc(-1 * (${HEADING_GAP} + ${WEEK_RULE_WIDTH}))`;

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
  /** Whether a note flows under those margins once it has run past them, or
   *  keeps the column between them — shared with the week planner for the same
   *  reason the arrangement is. */
  noteFlow: boolean;
  rowMode: ListRowMode;
  /** How the rail prints a week number: "Week 34", "w 34", or "34" — the same
   *  setting the week planner reads, because it is the same piece of almanac
   *  printed in the same margin. */
  weekFormat: WeekFormat;
  /** The heading band's colour (Settings → Calendar → Heading), or `null`. */
  headerInk: string | null;
  /** Whether the heading prints its period arrows — off where the reader
   *  pages up and down (`navSwipe.ts`). */
  arrows: boolean;
  /** How the reader got to this month, which is what decides where its scroll
   *  opens (`listHome.ts`). The deck's three panes all take the same answer:
   *  paging on again travels the same way, so the neighbour waiting in that
   *  direction wants the same edge the month on screen was given. */
  arrival: ListArrival;
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
  /** A long press holds the day up close (`DayZoom`) — a fixed row clips its
   *  note exactly as a month cell does. */
  onZoomDay: (day: DayKey) => void;
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
  noteFlow,
  rowMode,
  weekFormat,
  headerInk,
  arrows,
  arrival,
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

  // The note's band, on the screen this is actually being drawn on. The rows
  // are the same rows a phone prints, set larger where the screen has the room
  // for it (`roomScale.ts`); the band is a px number rather than a CSS length
  // because `entryFit.ts` measures the note against it.
  const room = useRoom("strip");
  const entryFont = useMemo(() => scaleEntryFont(LIST_ROW_FONT, room), [room]);

  // Where this month opens. The deck reads the mark off the DOM when it puts
  // the pane back, so this is a flag on one row — or, for the bottom, on the
  // scroller itself — rather than a scroll of our own: a scroll set from here
  // would be overwritten by the deck's own a moment later (see `SwipeDeck`).
  const opensAt = listOpensAt(year, month, today, pack.weekStartsOn, arrival);
  const home = opensAt === "end" ? null : opensAt;

  return (
    // The list is the one paged view that scrolls, so it owns the vertical
    // axis inside its pane while the deck around it owns the horizontal one.
    // `DECK_SCROLLER` hands that offset back to the deck: a swipe reveals the
    // neighbouring month from its top, so that is where the page turn has to
    // leave you — not at whatever row you had scrolled to in the month before.
    <div
      {...DECK_SCROLLER}
      // Paged into backwards: the month opens at its last day, which is the
      // scroll's own far end (the trailing gutter included) rather than any
      // row's offset — so the scroller says it about itself.
      {...(opensAt === "end" ? DECK_END : {})}
      // The heading below is pinned to this scroller's top, so it covers
      // whatever the scroller is scrolled to. `scroll-padding-top` is the
      // browser's own word for that: it keeps the heading's height — and the
      // gap it leaves under itself — clear at the top of the scrollport, both
      // for the row the deck opens the month on and for anything the browser
      // scrolls into view itself; a row's editor, opened with the keyboard,
      // used to land under the month.
      style={{ scrollPaddingTop: HEADING_CLEARANCE }}
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
        accent={headerInk}
        bleed
        arrows={arrows}
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
              noteFlow={noteFlow}
              lane={lane}
              rail={rail}
              headerInk={headerInk}
              today={today}
              pastMark={pastMark}
              textSize={textSize}
              entryFont={entryFont}
              entry={doc.entries[key] ?? ""}
              editing={editingDay === key}
              home={day === home}
              lastOfMonth={day === count}
              // A fixed row clips, so its note is measured against the row;
              // the row it is being typed into grows instead, whatever the
              // setting, so the caret is never in a box it has outgrown.
              fixed={rowMode === "fixed" && editingDay !== key}
              onEditDay={onEditDay}
              onCommit={onCommit}
              onOpenHolidays={onOpenHolidays}
              onOpenNames={onOpenNames}
              onZoomDay={onZoomDay}
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
  noteFlow,
  lane,
  rail,
  headerInk,
  today,
  pastMark,
  textSize,
  entryFont,
  entry,
  editing,
  fixed,
  home,
  lastOfMonth,
  onEditDay,
  onCommit,
  onOpenHolidays,
  onOpenNames,
  onZoomDay,
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
  /** Whether a note flows under the row's margins (`stripNoteFlow`). */
  noteFlow: boolean;
  /** Whether the month reserved each margin (decided once, by the list). */
  lane: boolean;
  rail: boolean;
  headerInk: string | null;
  today: DayKey;
  pastMark: PastMarkSetting;
  textSize: EntryTextSize;
  entryFont: EntryFontOptions;
  entry: string;
  editing: boolean;
  fixed: boolean;
  /** Whether this is the row the month opens on (`listHome.ts`). A primitive,
   *  like everything else here, so the memo holds for the other ninety. */
  home: boolean;
  /** Whether this is the month's last row — the one row with no day under it
   *  to hand its rule to (see the border below). */
  lastOfMonth: boolean;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onOpenHolidays: (year: number) => void;
  onOpenNames: (name: string) => void;
  onZoomDay: (day: DayKey) => void;
}) {
  // Press and hold to zoom — see the month cell's copy of this; the rule is
  // the row's rather than the cell's only because the surface is.
  const press = useLongPress(() => onZoomDay(dayKey), { enabled: !editing });
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
  // The last day of a week hands its rule to the first day of the next, which
  // draws a heavier one of its own (`cal-strip-break`). Left in place, the two
  // sat a pixel apart — a hairline immediately over the week's own rule, which
  // reads as a smudged double line rather than as one mark saying "a week
  // starts here". The month's last row keeps its rule: nothing follows it in
  // this pane, so there is nobody to hand it to.
  const closes =
    !lastOfMonth && startsWeek((weekday + 1) % 7, pack.weekStartsOn);

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
      {...(home ? DECK_HOME : {})}
      {...press}
      onClick={() => onEditDay(dayKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !editing) {
          e.preventDefault();
          onEditDay(dayKey);
        }
      }}
      // Two things, and both are about the rule this row draws where a week
      // opens. Its ink, where the heading is banded: the same colour the rail's
      // week numbers are printed in, so the two marks that say "a week starts
      // here" say it in one voice (nothing to set with the band off — the rule
      // falls back to the hairline's own colour). And, on the one row the month
      // opens at, the tuck that takes the rule up behind the masthead
      // ({@link LIST_HOME_TUCK}) — read back off this style by the deck, which
      // is what actually does the scrolling.
      style={
        {
          ...(opens && headerInk ? { "--cal-week-rule": headerInk } : {}),
          ...(home ? { scrollMarginTop: LIST_HOME_TUCK } : {}),
        } as CSSProperties
      }
      // 3.375 rem is the row measured rather than chosen: a weekday line
      // (14 px), the gap under it, and *two* lines of names — which is not an
      // edge case but the ordinary Swedish day ("Bernhard, Bernt" does not
      // hold an 88 px lane) — come to 41 px, the row's own padding
      // (`STRIP_ROW_PAD`) takes 10 more, and the rest is the slack that keeps
      // a font rounding a pixel the other way from clipping the second name
      // away. It was 3.25 rem while that padding was 4 px at both ends, and it
      // grows by exactly the two pixels the top end gained.
      //
      // It is multiplied by the room factor for exactly that reason: those
      // are 14 px lines on the phone the row was measured on, and a screen
      // with more room prints them larger (`src/app/roomScale.ts`), so a row
      // held at the phone's height would clip the same second name again.
      className={`cal-day cal-strip-row relative ${STRIP_ROW_FRAME} ${STRIP_ROW_PAD} cursor-text border-line focus-visible:outline-2 ${STRIP_ROW_EDGE} ${
        closes ? "" : "border-b"
      } ${
        fixed
          ? "h-[calc(3.375rem*var(--cal-room,1))] overflow-hidden"
          : "min-h-[calc(3.375rem*var(--cal-room,1))]"
      } ${opens ? "cal-strip-break" : ""} ${
        dayKey === today ? "bg-surface-2" : ""
      }`}
    >
      <StripBody day={stripDay} lane={lane} rail={rail} flow={noteFlow}>
        <DayEntry
          text={entry}
          editing={editing}
          font={entryFont}
          size={textSize}
          bounded={fixed}
          // Where the row prints its margins beside the note rather than
          // around it, the note's lines make room for them and then take the
          // row's full width — which is also what a note too long for the row
          // has to be ended against.
          flow={noteFlow}
          onCommit={(text) => onCommit(dayKey, text)}
          onClose={() => onEditDay(null)}
        />
      </StripBody>

      {/* The whole-row stroke — over the row, transparent to taps. */}
      {marked === "cell" && <PastMark style={pastMark.style} />}
    </div>
  );
});

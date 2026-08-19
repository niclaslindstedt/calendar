// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The strip row's two margins, shared by the week planner and the day list.
//
// Both views print the same day: the date set big at the head of a lane on the
// left with the weekday beside it and the day's names under that, and the
// almanac's own marginalia — the week number where a week opens, the holiday's
// name along the bottom — in a rail on the right. What differs is the *row*:
// the week planner gives a day a seventh of the screen and the day list gives
// it a line of a month-long scroll. So the row itself stays each view's own
// (its height, its borders, how it memoizes) and only the two margins live
// here, which is what keeps the two from drifting apart a caption at a time.
//
// Which margin each piece is printed in — and at which end of it — is the
// reader's call (Settings → Calendar → View, `stripLayout.ts`). The defaults
// are the arrangement above, so a calendar nobody has rearranged is the one
// both views have always drawn.

import type { CSSProperties, ReactNode } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { useT } from "./i18n/index.ts";
import { weekdayName, type Holiday, type LocalePack } from "./locale/index.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { MarkedDate } from "./PastMark.tsx";
import type { PastMarkStyle } from "./pastDays.ts";
import {
  inMargin,
  piecesInMargin,
  piecesInSlot,
  type StripLayout,
  type StripPiece,
} from "./stripLayout.ts";
import { dayOfYear, weekNumberLabel, type WeekFormat } from "./weekPlanner.ts";

/** Everything a row prints, and the arrangement it prints it in. The views
 *  hand this straight down from what they already resolved per day. */
export type StripDay = {
  layout: StripLayout;
  dayKey: DayKey;
  /** The day of the month, as printed. */
  day: number;
  pack: LocalePack;
  weekday: number;
  /** The day's names, already resolved (empty when the pack prints none). */
  names: readonly string[];
  /** The day's holiday, or null. */
  holiday: Holiday | null;
  /** The week this day opens, or `null` on a day that opens none (and on a
   *  country that prints no week numbers). */
  weekNumber: number | null;
  weekFormat: WeekFormat;
  red: boolean;
  /** The stroke over the date, for the `date` scope of the passed-day mark. */
  markDate: PastMarkStyle;
  /** What the date is set at — the view's own base, which the day-number
   *  scale then multiplies. The week planner makes this a setting; the day
   *  list, whose row is a line rather than a band, keeps its own. */
  dateBase: string;
  /** The heading band's colour, which the week number is printed in — `null`
   *  for the page's own ink. */
  ink: string | null;
  showDayOfYear?: boolean;
  onOpenNames: (name: string) => void;
  onOpenHolidays: () => void;
};

/** The lane on the left: whichever pieces are parked in it, with the date in a
 *  column of its own at the head of the row.
 *
 *  The lane is a *width*, not a shrink-wrap: ragged left edges on the writing
 *  area would read as a column per row rather than as one board. `--cal-lane`
 *  is the room the stack beside the date gets, and 88 px is what the longest
 *  run of names needs to hold two lines; a lane printing no names has nothing
 *  that wide to set, so it gets the measured floor and nothing more and the
 *  note gets the difference back. The date's own column and the year-day
 *  number's are added to those in `src/styles.css`, each scaled by its own
 *  size setting rather than by the names' — and each zeroed here when the
 *  piece it pays for is printed in the other margin instead. */
export function StripLane({ day: d }: { day: StripDay }) {
  const dateHere = inMargin(d.layout, "lane", "day");
  const namesHere =
    inMargin(d.layout, "lane", "nameDays") && d.names.length > 0;
  const stack = laneStack(d.layout);
  const showDayOfYear = d.showDayOfYear ?? false;

  return (
    <div
      style={
        {
          // Both are lengths the stylesheet multiplies, so a margin that does
          // not print the piece has to zero the term rather than drop it.
          "--cal-date": dateHere ? d.dateBase : "0rem",
          "--cal-lane-floor": dateHere ? "4.25rem" : "0rem",
        } as CSSProperties
      }
      className={`cal-strip-lane flex shrink-0 items-start gap-1.5 leading-tight ${
        // The wide pair once the lane carries a caption to set; the measured
        // weekday floor otherwise.
        namesHere || inMargin(d.layout, "lane", "holidays")
          ? "[--cal-lane:5.5rem] sm:[--cal-lane:7rem]"
          : "[--cal-lane:4.25rem] sm:[--cal-lane:5.5rem]"
      } ${showDayOfYear ? "[--cal-lane-extra:1.375rem]" : ""}`}
    >
      {/* The date sits in a box exactly as wide as it is set — one em holds
          two digits in the lane's serif ("28" measures 24 px at 24 px) — and
          is right-aligned inside it. That is what keeps the weekday column
          straight down a month: left-aligned, every single-digit date pulled
          its weekday half a digit to the left, which reads as a ragged edge
          rather than as a narrow number. The width is the same `--cal-date`
          the lane bills for the column, so the two can't disagree.

          The number itself is a `block` so that `text-box-trim` applies to it
          (`src/styles.css`): that is what lines its capitals up with the
          weekday's beside it, at whatever size the date is set. An inline span
          takes no trim, and the wrapper around it is the passed-day stroke's
          box rather than the type's, so it is the wrong box to measure. */}
      {dateHere && (
        <div className="w-[var(--cal-date,1.5rem)] shrink-0 text-right">
          <DateNumber day={d} />
        </div>
      )}
      <div className="cal-strip-names flex min-w-0 flex-1 flex-col">
        {/* The weekday travels with the date: "Mon" on its own is not a piece
            a calendar prints. */}
        {dateHere && <Weekday day={d} />}
        {stack.map((piece) => (
          <div key={piece} className="mt-0.5 min-w-0">
            {piecePart(piece, d)}
          </div>
        ))}
      </div>
      {/* The day's ordinal in the year, printed the way the strip calendar
          does: small, grey, hard against the lane's right edge, where it is
          available to be counted from and invisible until it is wanted. It
          stays in the lane whatever the arrangement — it is a gloss on the
          date rather than a piece of the almanac — and is sized off the week
          number's scale, the two being the same kind of marginal number. */}
      {showDayOfYear && (
        <span className="cal-font-week cal-size-week text-muted shrink-0 pt-1 leading-none [--cal-base:9px]">
          {dayOfYear(d.dayKey) || ""}
        </span>
      )}
    </div>
  );
}

/** The rail on the right: whichever pieces are parked in it, the top end at
 *  the row's top and the bottom end pushed to its bottom edge — which is where
 *  a printed almanac sets a holiday's name.
 *
 *  Everything here is the almanac talking rather than the day, which is why
 *  the rail sits outside the writing area instead of floating over it — and
 *  why it is reserved for a whole period at a time (`marginReserved`), so the
 *  note keeps one straight right edge down the strip. */
export function StripRail({
  day: d,
  className = "",
}: {
  day: StripDay;
  className?: string;
}) {
  const top = piecesInSlot(d.layout, "rail-top");
  const bottom = piecesInSlot(d.layout, "rail-bottom");
  // A rail holding a caption needs more than the two digits of a week number.
  const wide =
    inMargin(d.layout, "rail", "nameDays") || inMargin(d.layout, "rail", "day");

  return (
    <div
      className={`cal-strip-rail flex shrink-0 flex-col items-end self-stretch text-right ${
        wide ? "w-24 sm:w-32" : "w-16 sm:w-24"
      } ${className}`}
    >
      {top.map((piece) => (
        <div key={piece} className="min-w-0">
          {piecePart(piece, d)}
        </div>
      ))}
      {bottom.map((piece, i) => (
        <div
          key={piece}
          // The first piece of the bottom end carries the push; the landscape
          // media query in `src/styles.css` clears it by this class when the
          // rail lies down into a line.
          className={`min-w-0 ${i === 0 ? "cal-strip-rail-tail mt-auto" : ""}`}
        >
          {piecePart(piece, d)}
        </div>
      ))}
    </div>
  );
}

/** A day's writing surface, between the two margins. Just the box — the entry
 *  itself stays the view's, because what it is measured against (a band the
 *  view fixed, or a line that grows) is the difference between the two. */
export function StripNote({ children }: { children: ReactNode }) {
  return (
    <div className="cal-strip-note min-h-0 min-w-0 flex-1 self-stretch">
      {children}
    </div>
  );
}

/** The pieces the lane stacks beside the date, top end before bottom end. The
 *  date is not among them: it is the column they are set beside. */
function laneStack(layout: StripLayout): StripPiece[] {
  return piecesInMargin(layout, "lane").filter((piece) => piece !== "day");
}

/** One piece, as the margins print it. The date is the one that differs by
 *  margin — in the lane it is a column with the weekday beside it, in the rail
 *  it is a two-line block — so it is assembled here rather than passed in. */
function piecePart(piece: StripPiece, d: StripDay): ReactNode {
  switch (piece) {
    case "day":
      return (
        <div className="flex flex-col items-end">
          <DateNumber day={d} />
          <Weekday day={d} />
        </div>
      );
    case "nameDays":
      return d.names.length > 0 ? <Names day={d} /> : null;
    case "holidays":
      return d.holiday ? <HolidayName day={d} holiday={d.holiday} /> : null;
    case "week":
      return d.weekNumber !== null ? <WeekMark day={d} /> : null;
  }
}

function DateNumber({ day: d }: { day: StripDay }) {
  return (
    <MarkedDate style={d.markDate}>
      <span
        className={`cal-strip-date block cal-font-day cal-size-day leading-none [--cal-base:var(--cal-date,1.5rem)] ${
          d.red ? "cal-red" : "text-fg"
        }`}
      >
        {d.day}
      </span>
    </MarkedDate>
  );
}

function Weekday({ day: d }: { day: StripDay }) {
  return (
    <span
      className={`cal-strip-weekday cal-serif text-sm leading-none ${
        d.red ? "cal-red" : "text-muted"
      }`}
    >
      {weekdayName(d.pack, d.weekday)}
    </span>
  );
}

function Names({ day: d }: { day: StripDay }) {
  return (
    <span className="cal-font-nameday cal-size-nameday text-muted block [--cal-base:10px]">
      {/* Every name is also the way into the name-day search. */}
      <NameDayNames names={d.names} pack={d.pack} onOpen={d.onOpenNames} />
    </span>
  );
}

/** Also the way into the holidays screen — see the same tap target in the
 *  month view. */
function HolidayName({ day: d, holiday }: { day: StripDay; holiday: Holiday }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        d.onOpenHolidays();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        d.onOpenHolidays();
      }}
      className={`cal-font-holiday cal-size-holiday cal-strip-holiday block cursor-pointer leading-tight [--cal-base:11px] focus-visible:outline-2 ${
        holiday.red ? "cal-red" : "text-muted"
      }`}
    >
      {holiday.name}
    </span>
  );
}

function WeekMark({ day: d }: { day: StripDay }) {
  const t = useT();
  const n = d.weekNumber ?? 0;
  return (
    <span
      className={`cal-font-week cal-size-week block leading-none italic [--cal-base:0.875rem] ${
        d.ink ? "" : "text-fg"
      }`}
      style={d.ink ? { color: d.ink } : undefined}
      // Spelled out for a screen reader whatever the margin prints: "34" on
      // its own is a number, not a week.
      aria-label={t("topbar.week", { n })}
    >
      {weekNumberLabel(d.weekFormat, n, {
        long: t("topbar.week", { n }),
        mark: t("topbar.weekMark", { n }),
      })}
    </span>
  );
}

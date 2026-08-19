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

import type { CSSProperties, ReactNode } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { useT } from "./i18n/index.ts";
import { weekdayName, type Holiday, type LocalePack } from "./locale/index.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { MarkedDate } from "./PastMark.tsx";
import type { PastMarkStyle } from "./pastDays.ts";
import { dayOfYear, weekNumberLabel, type WeekFormat } from "./weekPlanner.ts";

/** The lane on the left: the date, the weekday, the day's names, and — when
 *  the reader has asked for it — the day's ordinal in the year.
 *
 *  The lane is a *width*, not a shrink-wrap: ragged left edges on the writing
 *  area would read as a column per row rather than as one board. `--cal-lane`
 *  is the room the weekday-and-names stack gets, and 88 px is what the longest
 *  run of names needs to hold two lines under the weekday; a pack that prints
 *  no name days has nothing that wide to set, so it gets the measured floor
 *  and nothing more and the note gets the difference back. The date's own
 *  column and the year-day number's are added to those in `src/styles.css`,
 *  each scaled by its own size setting rather than by the names'. */
export function StripLane({
  dayKey,
  day,
  pack,
  weekday,
  names,
  red,
  markDate,
  dateBase,
  showDayOfYear = false,
  onOpenNames,
}: {
  dayKey: DayKey;
  /** The day of the month, as printed. */
  day: number;
  pack: LocalePack;
  weekday: number;
  /** The day's names, already resolved (empty when the pack prints none). */
  names: readonly string[];
  red: boolean;
  /** The stroke over the date, for the `date` scope of the passed-day mark. */
  markDate: PastMarkStyle;
  /** What the date is set at — the view's own base, which the shared day-number
   *  scale then multiplies. The week planner makes this a setting; the day
   *  list, whose row is a line rather than a band, keeps its own. */
  dateBase: string;
  showDayOfYear?: boolean;
  onOpenNames: (name: string) => void;
}) {
  return (
    <div
      // Published as one custom property because two things need it: the date
      // itself, and the width the lane bills for its first column.
      style={{ "--cal-date": dateBase } as CSSProperties}
      className={`cal-strip-lane flex shrink-0 items-start gap-1.5 leading-tight ${
        names.length > 0
          ? "[--cal-lane:5.5rem] sm:[--cal-lane:7rem]"
          : "[--cal-lane:4.25rem] sm:[--cal-lane:5.5rem]"
      } ${showDayOfYear ? "[--cal-lane-extra:1.375rem]" : ""}`}
    >
      {/* The date sits in a column wide enough for the widest day the face
          has to set, and is right-aligned inside it. The width is a column
          rather than a shrink-wrap because the weekday and the day's names
          line up beside it down a whole month: left-aligned digits pulled
          every single-digit row's weekday half a number to the left, which
          reads as a ragged edge rather than as a narrow date. So a
          single-digit row simply carries more air after its number than a
          two-digit one does — that is the column being kept, not padding
          being spent.

          How wide that is comes from the face (`DATE_COLUMN_EM` in
          `fonts.ts`, billed to the lane as `--cal-date-col`) and is floored
          at the two digits the *resolved* face actually measures — see
          `.cal-strip-date`. It carries the date's own face and size for that
          reason: `ch` is only the digit's width if the box is set in the type
          it is holding. */}
      <div className="cal-strip-date cal-font-day cal-size-day shrink-0 text-right leading-none [--cal-base:var(--cal-date,1.5rem)]">
        <MarkedDate style={markDate}>
          <span className={red ? "cal-red" : "text-fg"}>{day}</span>
        </MarkedDate>
      </div>
      <div className="cal-strip-names flex min-w-0 flex-1 flex-col">
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
      {/* The day's ordinal in the year, printed the way the strip calendar
          does: small, grey, hard against the lane's right edge, where it is
          available to be counted from and invisible until it is wanted. Sized
          off the week number's scale — the two are the same kind of number,
          marginalia rather than a day's content — so one setting moves both. */}
      {showDayOfYear && (
        <span className="cal-size-week text-muted shrink-0 pt-1 leading-none [--cal-base:9px]">
          {dayOfYear(dayKey) || ""}
        </span>
      )}
    </div>
  );
}

/** The rail on the right: the week number at the top of the day that opens a
 *  week, the holiday's name along the bottom.
 *
 *  Both are the almanac talking rather than the day, which is why they sit
 *  outside the writing area instead of floating over it — and why the rail is
 *  reserved for a whole period at a time (see each view's `rail`), so the note
 *  keeps one straight right edge down the strip. */
export function StripRail({
  weekNumber,
  weekFormat,
  holiday,
  ink,
  onOpenHolidays,
  className = "",
}: {
  /** The week this day opens, or `null` on a day that opens none (and on a
   *  view or a country that prints no week numbers). */
  weekNumber: number | null;
  weekFormat: WeekFormat;
  holiday: Holiday | null;
  /** The heading band's colour, which the week number is printed in — `null`
   *  for the page's own ink. */
  ink: string | null;
  onOpenHolidays: () => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      className={`cal-strip-rail flex w-16 shrink-0 flex-col items-end self-stretch text-right sm:w-24 ${className}`}
    >
      {weekNumber !== null && (
        <span
          className={`cal-serif cal-size-week leading-none italic [--cal-base:0.875rem] ${
            ink ? "" : "text-fg"
          }`}
          style={ink ? { color: ink } : undefined}
          // Spelled out for a screen reader whatever the margin prints: "34"
          // on its own is a number, not a week.
          aria-label={t("topbar.week", { n: weekNumber })}
        >
          {weekNumberLabel(weekFormat, weekNumber, {
            long: t("topbar.week", { n: weekNumber }),
            mark: t("topbar.weekMark", { n: weekNumber }),
          })}
        </span>
      )}
      {/* Also the way into the holidays screen — see the same tap target in
          the month view. */}
      {holiday && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onOpenHolidays();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            onOpenHolidays();
          }}
          className={`cal-font-holiday cal-size-holiday cal-strip-holiday mt-auto cursor-pointer leading-tight [--cal-base:11px] focus-visible:outline-2 ${
            holiday.red ? "cal-red" : "text-muted"
          }`}
        >
          {holiday.name}
        </span>
      )}
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

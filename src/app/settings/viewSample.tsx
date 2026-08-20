// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The sample day the View section arranges and sets — one per view, each drawn
// by the code the view itself draws with.
//
// That is the whole point of it. The month cell comes out of `MonthCellFrame`
// and the strip row out of `StripLane` / `StripRail`, under the scope class
// the real view carries, so what the dialog shows is the layout rather than a
// picture of one: move a piece here and the sample moves because the *cell*
// moved. Sizes and faces come the same way — through the `.cal-font-*` /
// `.cal-size-*` classes, off the variables `App.tsx` is already publishing
// from the open draft — so every edit lands in the sample as it is made,
// without this file knowing which setting changed.
//
// Three liberties are taken, all for legibility rather than for looks. A month
// cell's captions ship at 7.5 px, which is true and unreadable in a dialog, so
// the sample sets them at 11 px; the *scale* the reader picks still multiplies
// that, so the three steps read as the three steps. Every sample is drawn at
// the designer's height rather than the view's — a real month cell is 47 px
// wide and a real day-list row is one line, and a quadrant of either is not a
// tap target. And the sample day is a red day carrying every piece at once — a
// holiday, two names, a week number, a note — so no quadrant is empty while
// you are deciding what goes in it.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { DayEntryText } from "../DayEntry.tsx";
import { LIST_DATE_BASE } from "../DayListView.tsx";
import { LIST_ROW_FONT, MONTH_CELL_FONT, WEEK_ROW_FONT } from "../entryFont.ts";
import { useT, type TFunction } from "../i18n/index.ts";
import { getLocale, weekdayName, type Holiday } from "../locale/index.ts";
import { MonthCellFrame } from "../monthCell.tsx";
import { MarkedDate, PastMark } from "../PastMark.tsx";
import {
  StripLane,
  StripNote,
  StripRail,
  type StripDay,
} from "../stripRow.tsx";
import {
  headerInkOf,
  monthCellLayout,
  pastMarkOf,
  stripLayoutOf,
  weekDateSizeFor,
  weekFormatFor,
  effectiveToggles,
  type LookSettings,
} from "../useAppSettings.ts";
import { SCOPE_CLASS, type StyleView } from "../viewStyle.ts";
import { marginReserved } from "../stripLayout.ts";
import { weekDateBase } from "../weekPlanner.ts";

/** The week the sample day falls in — two digits, so the margin is as wide as
 *  it will ever need to be. */
export const SAMPLE_WEEK = 44;

/** The sample day: the 31st, a Friday, red, with a holiday and two names on
 *  it. The same day in both samples, so the month cell and the strip row read
 *  as one calendar seen twice. */
const SAMPLE_KEY = "2025-10-31" as DayKey;
const SAMPLE_DAY = 31;
const SAMPLE_WEEKDAY = 5;
const SAMPLE_NAMES = ["Edit", "Edgar"];

function sampleHoliday(t: TFunction): Holiday {
  return {
    month: 10,
    day: 31,
    name: t("settings.textSizeSampleHoliday"),
    red: true,
    off: true,
  };
}

/** The month grid's cell, plus the week gutter beside it when the country
 *  prints one — the number lives in the margin rather than in the cell, so a
 *  sample without the gutter could not show what sizing it does. */
export function MonthSample({ look }: { look: LookSettings }) {
  const t = useT();
  const layout = monthCellLayout(look);
  const pastMark = pastMarkOf(look);
  const holiday = sampleHoliday(t);
  const note = t("settings.textSizeSampleNote");

  return (
    <div className={`${SCOPE_CLASS.month} flex h-full gap-1`}>
      {effectiveToggles(look).weekNumbers && (
        <div className="cal-font-week cal-size-week text-muted w-5 shrink-0 pt-1 leading-none [--cal-base:10px]">
          {SAMPLE_WEEK}
        </div>
      )}
      <div className="relative min-w-0 flex-1">
        <MonthCellFrame
          className="h-full"
          layout={layout}
          content={{
            day: (
              <MarkedDate
                style={pastMark.scope === "date" ? pastMark.style : "none"}
              >
                <span className="cal-font-day cal-size-day cal-red leading-none [--cal-base:1.5rem]">
                  {SAMPLE_DAY}
                </span>
              </MarkedDate>
            ),
            holidays: (
              <span className="cal-font-holiday cal-size-holiday cal-red block leading-[1.25] [--cal-base:11px]">
                {holiday.name}
              </span>
            ),
            nameDays: (
              <span className="cal-font-nameday cal-size-nameday text-muted block leading-[1.25] [--cal-base:11px]">
                {SAMPLE_NAMES.join(", ")}
              </span>
            ),
            note: (
              <DayEntryText
                text={note}
                font={MONTH_CELL_FONT}
                size={look.styles.month.entry.size}
              />
            ),
          }}
        />
        {pastMark.scope === "cell" && <PastMark style={pastMark.style} />}
      </div>
    </div>
  );
}

/** The week planner's row, or the day list's — the same row, printed at the
 *  two views' own dates and note sizes, which is the whole of what separates
 *  them once they share an arrangement. */
export function StripSample({
  look,
  view,
}: {
  look: LookSettings;
  view: Exclude<StyleView, "month">;
}) {
  const t = useT();
  const pack = getLocale(look.localeId);
  const layout = stripLayoutOf(look);
  const pastMark = pastMarkOf(look);
  const week = view === "week";
  const toggles = effectiveToggles(look);
  // The sample day carries every piece, so both margins are worth reserving
  // whatever the country prints — the reader is arranging them, and a margin
  // that vanished mid-arrangement would read as the piece having been lost.
  const has = { day: true, nameDays: true, holidays: true, week: true };
  const day: StripDay = {
    layout,
    dayKey: SAMPLE_KEY,
    day: SAMPLE_DAY,
    pack,
    weekday: SAMPLE_WEEKDAY,
    names: toggles.nameDays ? SAMPLE_NAMES : [],
    holiday: sampleHoliday(t),
    weekNumber: toggles.weekNumbers ? SAMPLE_WEEK : null,
    weekFormat: weekFormatFor(look),
    red: true,
    markDate: pastMark.scope === "date" ? pastMark.style : "none",
    dateBase: week ? weekDateBase(weekDateSizeFor(look)) : LIST_DATE_BASE,
    ink: headerInkOf(look),
    // Both strip views print it — it is one setting for the row they share —
    // so the sample shows it whichever of the two is being previewed.
    showDayOfYear: look.weekDayOfYear,
    onOpenNames: NOOP,
    onOpenHolidays: NOOP,
  };

  return (
    // `cal-week-row` only on the week planner's: it is the hook the landscape
    // media query hangs the lie-flat lane on, and the day list does not have
    // that problem.
    <div
      className={`${SCOPE_CLASS.strip} cal-strip-row relative flex h-full items-stretch gap-2 overflow-hidden px-2 py-1 ${
        week ? "cal-week-row" : ""
      }`}
    >
      {(marginReserved(layout, "lane", has) || day.showDayOfYear) && (
        <StripLane day={day} />
      )}
      <StripNote>
        <DayEntryText
          text={t("settings.textSizeSampleNote")}
          font={week ? WEEK_ROW_FONT : LIST_ROW_FONT}
          size={look.styles.strip.entry.size}
        />
      </StripNote>
      {marginReserved(layout, "rail", has) && <StripRail day={day} />}
      {pastMark.scope === "cell" && <PastMark style={pastMark.style} />}
    </div>
  );
}

/** The weekday the sample prints, for the section's accessible description. */
export function sampleWeekday(look: LookSettings): string {
  return weekdayName(getLocale(look.localeId), SAMPLE_WEEKDAY);
}

const NOOP = () => {};

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The month view — the wall calendar. A large month image (when a pack ships
// one) hangs above the grid, pushing the calendar down so image + month title
// + grid fill the screen; without artwork, the calendar alone covers the
// viewport. Below the serif month title: weekday headers, ISO week numbers in
// the margin, red Sundays, name days small in each cell, and the user's note
// text shrinking to fit its cell.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
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
  isRedDay,
  isRedWeekday,
  monthName,
  nameDaysFor,
  weekNumber,
  weekdayName,
  weekdayOrder,
  type LocalePack,
} from "./locale/index.ts";
import { monthImageUrl } from "./monthImage.ts";
import type { CalendarDoc } from "./types.ts";

type Props = {
  year: number;
  month: number;
  today: DayKey;
  pack: LocalePack;
  showWeekNumbers: boolean;
  showNameDays: boolean;
  textSize: EntryTextSize;
  doc: CalendarDoc;
  editingDay: DayKey | null;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function MonthGridView({
  year,
  month,
  today,
  pack,
  showWeekNumbers,
  showNameDays,
  textSize,
  doc,
  editingDay,
  onEditDay,
  onCommit,
  onPrevious,
  onNext,
}: Props) {
  const t = useT();
  const weeks = buildMonthGrid(year, month, {
    weekStartsOn: pack.weekStartsOn,
    today,
  });
  const order = weekdayOrder(pack);
  const image = monthImageUrl(year, month, "large");

  const gridCols = showWeekNumbers
    ? "grid-template-columns: 2.25rem repeat(7, minmax(0, 1fr))"
    : "grid-template-columns: repeat(7, minmax(0, 1fr))";

  return (
    <div className="flex min-h-full flex-col">
      {/* The artwork band. Absent until a month-image pack ships; then the
          calendar section below still fills a viewport of its own, so the
          page reads image-first and scrolls to a fullscreen calendar. */}
      {image && (
        <img
          src={image}
          alt=""
          className="h-[60svh] w-full object-cover"
          loading="lazy"
        />
      )}

      <section
        className="flex flex-col px-3 sm:px-6"
        style={{
          minHeight: image ? "100svh" : undefined,
          flex: image ? undefined : "1",
          paddingBottom: CONTENT_BOTTOM_PAD,
        }}
      >
        {/* The serif month title, wall-calendar style, between the arrows. */}
        <PeriodHeading
          title={monthName(pack, month)}
          meta={String(year)}
          titleClass="cal-serif text-3xl font-normal tracking-[0.18em] uppercase sm:text-4xl"
          metaClass="text-xl tracking-normal sm:text-2xl"
          onPrevious={onPrevious}
          onNext={onNext}
        />

        {/* Weekday headers. */}
        <div className="grid" style={gridCols}>
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
            the section, so the month always covers one screen. */}
        <div className="flex flex-1 flex-col">
          {weeks.map((week) => (
            <div
              key={week[0].key}
              className="grid min-h-[4.5rem] flex-1 border-b border-line"
              style={gridCols}
            >
              {showWeekNumbers && (
                <div
                  className="text-muted pt-1 pl-1 text-[10px]"
                  aria-label={t("topbar.week", {
                    n: weekNumber(pack, week[0].key),
                  })}
                >
                  {t("weekdays.weekShort")}
                  {weekNumber(pack, week[0].key)}
                </div>
              )}
              {week.map((cell) => {
                const parts = parseDayKey(cell.key);
                const weekday = parts
                  ? new Date(`${cell.key}T12:00:00Z`).getUTCDay()
                  : 1;
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
                    className={`relative flex min-w-0 cursor-text flex-col overflow-hidden border-l border-line px-1 pt-0.5 pb-1 last:border-r focus-visible:outline-2 ${
                      cell.inMonth ? "" : "opacity-35"
                    } ${cell.isToday ? "bg-surface-2" : ""}`}
                  >
                    {/* The date has the first line to itself. A portrait
                        phone gives a cell ~48 px of width, which is not
                        enough to share with a name — "Bartolomeus" beside
                        the 24th truncated to "B…" and told nobody anything.
                        The names and the holiday get their own rows below,
                        wrapping onto a second line and breaking mid-word
                        when a single name is wider than the column. */}
                    <div className="text-right">
                      <span
                        className={`cal-serif text-base leading-none sm:text-lg ${
                          red ? "cal-red" : "text-fg"
                        } ${cell.isToday ? "font-bold" : ""}`}
                      >
                        {cell.day}
                      </span>
                    </div>
                    {/* The holiday name, red for official red days — the
                        kalender.se convention. */}
                    {holiday && (
                      <div
                        className={`line-clamp-3 text-[9px] leading-[1.15] break-words ${
                          holiday.red ? "cal-red" : "text-muted"
                        }`}
                      >
                        {holiday.name}
                      </div>
                    )}
                    {/* Name days, small under the date like the printed
                        lists — but one per line rather than comma-separated.
                        At this width a pair almost always wraps anyway, and
                        wrapping a comma-joined string strands the comma at
                        the head of the second line ("Bernhard" / ", Bernt").
                        Clamped at two lines so a day with three names cannot
                        crowd out the note text below. */}
                    {names.length > 0 && (
                      <div className="text-muted line-clamp-2 text-[9px] leading-[1.15] break-words whitespace-pre-line">
                        {names.join("\n")}
                      </div>
                    )}
                    <div className="min-h-0 flex-1">
                      <DayEntry
                        text={entry}
                        editing={editingDay === cell.key}
                        font={MONTH_CELL_FONT}
                        size={textSize}
                        onCommit={(text) => onCommit(cell.key, text)}
                        onClose={() => onEditDay(null)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

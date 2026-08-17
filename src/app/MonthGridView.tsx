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

  // The week gutter carries a bare number — the column is self-evidently the
  // week once it has a header-less lane of its own, so the "v."/"w." prefix
  // was portrait width spent saying so.
  //
  // The lane is a measured constant, like the cell font: at the gutter's
  // computed 10 px the widest of the 53 possible labels is 11.12 px, and the
  // week number is never three digits, so 13 px holds every value with ~1.9 px
  // to spare. That width also squares the margins — the number's left edge
  // lands ~12.9 px from the screen edge against the section's 12 px right
  // padding, so the grid sits centred rather than shoved right.
  const gridCols = showWeekNumbers
    ? "grid-template-columns: 0.8125rem repeat(7, minmax(0, 1fr))"
    : "grid-template-columns: repeat(7, minmax(0, 1fr))";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* The artwork band. Absent until a month-image pack ships. The view no
          longer scrolls, so the image shares the one screen with the grid
          rather than hanging above a viewport of its own. */}
      {image && (
        <img
          src={image}
          alt=""
          className="h-[28svh] w-full shrink-0 object-cover"
          loading="lazy"
        />
      )}

      <section
        className="flex min-h-0 flex-1 flex-col px-3 sm:px-6"
        style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
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
        <div className="grid shrink-0" style={gridCols}>
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
            the section, so the month always covers one screen. The rows carry
            no min-height: the view does not scroll, so on a short viewport six
            rows have to share whatever is there rather than push past the
            bottom of a container that would clip them. */}
        <div className="flex min-h-0 flex-1 flex-col">
          {weeks.map((week) => (
            <div
              key={week[0].key}
              className="grid min-h-0 flex-1 border-b border-line"
              style={gridCols}
            >
              {showWeekNumbers && (
                // Bare number, centred in its lane. The prefix survives in the
                // accessible name, where there is no width to pay for it.
                <div
                  className="text-muted pt-1 text-center text-[10px]"
                  aria-label={t("topbar.week", {
                    n: weekNumber(pack, week[0].key),
                  })}
                >
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
                    {/* The date **floats** right so the holiday and the name
                        days flow around it: a short name ("Ada") sits beside
                        the number on the first line, a long one drops under
                        it, and neither is ever truncated to "B…" the way a
                        shared flex row forced at ~48 px of cell width.
                        `overflow-hidden` does double duty — it contains the
                        float (a block holding only a float has no height, so
                        the number would otherwise overlap the note below)
                        and it caps the block at `max-h`, keeping a day with
                        a long holiday and three names from crowding the note
                        surface out of the cell. It is also why the text
                        can't use `line-clamp-*`: that sets
                        `display: -webkit-box`, whose line boxes ignore a
                        float instead of wrapping around it. */}
                    <div className="-mx-1 max-h-[3.5rem] shrink-0 overflow-hidden">
                      <span
                        className={`cal-serif float-right pr-1 pl-1 text-base leading-none sm:text-lg ${
                          red ? "cal-red" : "text-fg"
                        } ${cell.isToday ? "font-bold" : ""}`}
                      >
                        {cell.day}
                      </span>
                      {/* The holiday name clears the float: Swedish holiday
                          names are long compounds ("Midsommarafton" is 60 px
                          at a 43 px line) that have to break somewhere, and
                          breaking them against the ~20 px left beside the
                          date shatters them into three fragments. Starting
                          below the date costs the ~13 holidays a year one
                          line and breaks the word at most once. The 7.5 px
                          matches the names, and is also what keeps
                          "Nyårsdagen" (43.1 px at 8 px) on one line instead
                          of stranding its last letter. */}
                      {holiday && (
                        <span
                          className={`clear-right block px-0.5 text-[7.5px] leading-[1.25] break-words ${
                            holiday.red ? "cal-red" : "text-muted"
                          }`}
                        >
                          {holiday.name}
                        </span>
                      )}
                      {/* Name days flow around the date, so "Ada" shares its
                          line and only a name too wide for the gap drops
                          below. Deliberately NO `break-words`: the default
                          never splits a word, so a name that does not fit
                          beside the date moves down whole instead of
                          shattering into "Mart" / "a", and "Bernhard," can
                          never leave its comma stranded at the head of the
                          next line. That only holds if every name fits a
                          full line — at 7.5 px on the 43 px line this block
                          gets (the cell's own padding is cancelled by the
                          `-mx-1` bleed), all 627 names in the Swedish
                          almanac do, the widest being "Bartolomeus" at
                          42 px. Re-measure before growing this font. */}
                      {names.length > 0 && (
                        <span className="text-muted block px-0.5 text-[7.5px] leading-[1.25]">
                          {names.join(", ")}
                        </span>
                      )}
                    </div>
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

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day list — the month as a vertical scroll, one row per day (the
// name-day calendar look): day number in the margin, the day's names small
// beside it, the note filling the line. A small month image heads the list
// when a pack ships one. Rows are fixed-height by default; the "dynamic"
// setting lets a row grow with its text for people who write more.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { parseDayKey, toDayKey } from "@niclaslindstedt/oss-framework/calendar";

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
import { CONTENT_BOTTOM_PAD } from "./layout.ts";
import { monthImageUrl } from "./monthImage.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
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
  textSize: EntryTextSize;
  doc: CalendarDoc;
  editingDay: DayKey | null;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Tapping a holiday's name opens the holidays screen for its year. */
  onOpenHolidays: () => void;
};

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function DayListView({
  year,
  month,
  today,
  pack,
  showWeekNumbers,
  showNameDays,
  rowMode,
  textSize,
  doc,
  editingDay,
  onEditDay,
  onCommit,
  onPrevious,
  onNext,
  onOpenHolidays,
}: Props) {
  const t = useT();
  const image = monthImageUrl(year, month, "small");
  const count = daysInMonth(year, month);

  return (
    // The list is the one paged view that scrolls, so it owns the vertical
    // axis inside its pane while the deck around it owns the horizontal one.
    <div
      className="mx-auto h-full w-full max-w-2xl overflow-y-auto overscroll-contain px-3 sm:px-6"
      style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
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
          const parts = parseDayKey(key);
          const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
          const holiday = holidayFor(pack, year, month, day);
          const red = isRedDay(pack, year, month, day, weekday);
          const names =
            showNameDays && parts
              ? nameDaysFor(pack, parts.month, parts.day)
              : [];
          const entry = doc.entries[key] ?? "";
          const fixed = rowMode === "fixed" && editingDay !== key;
          // A small week marker on the first day of each week (and on the
          // 1st), the way Swedish wall calendars badge their week rows. Bare
          // number, like the month grid's gutter: once the marker has a lane
          // of its own the column says "week" by itself, and the prefix was
          // portrait width spent repeating it.
          const weekMark =
            showWeekNumbers && (weekday === pack.weekStartsOn || day === 1)
              ? String(weekNumber(pack, key))
              : "";
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={key}
              onClick={() => onEditDay(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editingDay !== key) {
                  e.preventDefault();
                  onEditDay(key);
                }
              }}
              className={`flex cursor-text items-start gap-2 border-b border-line px-1 py-1 focus-visible:outline-2 ${
                fixed ? "h-11 overflow-hidden" : "min-h-11"
              } ${key === today ? "bg-surface-2" : ""}`}
            >
              {/* The week gutter is only reserved when week numbers are on —
                  otherwise every row carries 36 px of dead left margin. */}
              {showWeekNumbers && (
                <span
                  className="text-muted w-7 shrink-0 pt-1 text-right text-[9px] leading-tight"
                  aria-label={
                    weekMark
                      ? t("topbar.week", { n: weekNumber(pack, key) })
                      : undefined
                  }
                >
                  {weekMark}
                </span>
              )}
              <span
                className={`cal-font-day w-7 shrink-0 text-right text-lg leading-tight ${
                  red ? "cal-red" : "text-fg"
                }`}
              >
                {day}
              </span>
              <span
                className={`w-8 shrink-0 pt-1 text-[10px] leading-tight ${
                  red ? "cal-red" : "text-muted"
                }`}
              >
                {weekdayName(pack, weekday, "short")}
              </span>
              {/* The holiday and the day's names share this column and
                  **wrap** rather than truncate: "Trettondedag jul · Kasper,
                  Melker" ending in an ellipsis tells you a name is there and
                  refuses to say which. Two lines of 10 px still clear a fixed
                  44 px row. */}
              <span className="w-24 shrink-0 pt-1 text-[10px] leading-tight sm:w-36">
                {/* Also the way into the holidays screen — see the same tap
                    target in the month view. */}
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
                    className={`cal-font-holiday cursor-pointer focus-visible:outline-2 ${
                      holiday.red ? "cal-red" : "text-muted"
                    }`}
                  >
                    {holiday.name}
                  </span>
                )}
                {holiday && names.length > 0 && (
                  <span className="text-muted"> · </span>
                )}
                <span className="cal-font-nameday text-muted">
                  {names.join(", ")}
                </span>
              </span>
              <div className="min-h-0 min-w-0 flex-1 self-stretch pt-0.5">
                <DayEntry
                  text={entry}
                  editing={editingDay === key}
                  font={LIST_ROW_FONT}
                  size={textSize}
                  onCommit={(text) => onCommit(key, text)}
                  onClose={() => onEditDay(null)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

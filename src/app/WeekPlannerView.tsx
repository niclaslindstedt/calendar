// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week planner — one week at a time, one generous row per weekday (the
// "Veckoplanerare" board): weekday name at the row's head, the day's date and
// name days beside it, and real room for text below.

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
import { CONTENT_BOTTOM_PAD } from "./layout.ts";
import { PeriodHeading } from "./PeriodHeading.tsx";
import type { CalendarDoc } from "./types.ts";

type Props = {
  /** Any day inside the week on display. */
  anchor: DayKey;
  today: DayKey;
  pack: LocalePack;
  showNameDays: boolean;
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

export function WeekPlannerView({
  anchor,
  today,
  pack,
  showNameDays,
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
  const days = buildWeekStrip(anchor, {
    weekStartsOn: pack.weekStartsOn,
    today,
  });
  const first = parseDayKey(days[0].key);

  return (
    <div
      className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden px-3 sm:px-6"
      style={{ paddingBottom: CONTENT_BOTTOM_PAD }}
    >
      <PeriodHeading
        title={t("topbar.week", { n: weekNumber(pack, days[0].key) })}
        meta={first ? `${monthName(pack, first.month)} ${first.year}` : ""}
        titleClass="cal-serif text-2xl tracking-wide sm:text-3xl"
        metaClass="text-lg"
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {/* Seven equal rows sharing the screen. No min-height: the view does not
          scroll, so on a short viewport the rows give ground rather than push
          the last weekday past the bottom edge. */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-line">
        {days.map((cell) => {
          const parts = parseDayKey(cell.key);
          const weekday = new Date(`${cell.key}T12:00:00Z`).getUTCDay();
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
              className={`flex min-h-0 flex-1 cursor-text flex-col overflow-hidden border-b border-line px-2 py-1.5 focus-visible:outline-2 ${
                cell.isToday ? "bg-surface-2" : ""
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`cal-serif text-lg ${red ? "cal-red" : "text-fg"}`}
                >
                  {weekdayName(pack, weekday)}
                </span>
                <span className="cal-font-day text-muted text-sm">
                  {parts?.day}
                </span>
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
                    className={`cal-font-holiday cursor-pointer truncate text-[11px] focus-visible:outline-2 ${
                      holiday.red ? "cal-red" : "text-muted"
                    }`}
                  >
                    {holiday.name}
                  </span>
                )}
                <span className="cal-font-nameday text-muted min-w-0 flex-1 truncate text-right text-[10px]">
                  {names.join(", ")}
                </span>
              </div>
              <div className="min-h-0 flex-1 pt-0.5">
                <DayEntry
                  text={entry}
                  editing={editingDay === cell.key}
                  font={WEEK_ROW_FONT}
                  size={textSize}
                  onCommit={(text) => onCommit(cell.key, text)}
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

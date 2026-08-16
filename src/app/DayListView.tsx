// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day list — the month as a vertical scroll, one row per day (the
// name-day calendar look): day number in the margin, the day's names small
// beside it, the note filling the line. A small month image heads the list
// when a pack ships one. Rows are fixed-height by default; the "dynamic"
// setting lets a row grow with its text for people who write more.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { parseDayKey, toDayKey } from "@niclaslindstedt/oss-framework/calendar";

import { DayEntry } from "./DayEntry.tsx";
import { LIST_ROW_FONT } from "./entryFont.ts";
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
import { monthImageUrl } from "./monthImage.ts";
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
  doc: CalendarDoc;
  editingDay: DayKey | null;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
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
  doc,
  editingDay,
  onEditDay,
  onCommit,
}: Props) {
  const t = useT();
  const image = monthImageUrl(year, month, "small");
  const count = daysInMonth(year, month);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-6 sm:px-6">
      {/* The slim artwork band (smaller than the month view's). */}
      {image && (
        <img
          src={image}
          alt=""
          className="h-[22svh] w-full object-cover"
          loading="lazy"
        />
      )}

      <h2 className="cal-serif py-4 text-center text-2xl tracking-wide sm:text-3xl">
        {monthName(pack, month)}
        <span className="text-muted ml-3 text-lg">{year}</span>
      </h2>

      <div className="border-t border-line">
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
          // 1st), the way Swedish wall calendars badge their week rows.
          const weekMark =
            showWeekNumbers && (weekday === pack.weekStartsOn || day === 1)
              ? `${t("weekdays.weekShort")}${weekNumber(pack, key)}`
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
              <span className="text-muted w-7 shrink-0 pt-1 text-right text-[9px] leading-tight">
                {weekMark}
              </span>
              <span
                className={`cal-serif w-7 shrink-0 text-right text-lg leading-tight ${
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
              <span className="w-24 shrink-0 truncate pt-1 text-[10px] leading-tight sm:w-36">
                {holiday && (
                  <span className={holiday.red ? "cal-red" : "text-muted"}>
                    {holiday.name}
                  </span>
                )}
                {holiday && names.length > 0 && (
                  <span className="text-muted"> · </span>
                )}
                <span className="text-muted">{names.join(", ")}</span>
              </span>
              <div className="min-h-0 min-w-0 flex-1 self-stretch pt-0.5">
                <DayEntry
                  text={entry}
                  editing={editingDay === key}
                  font={LIST_ROW_FONT}
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

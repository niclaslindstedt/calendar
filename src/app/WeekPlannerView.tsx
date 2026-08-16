// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week planner — one week at a time, one generous row per weekday (the
// "Veckoplanerare" board): weekday name at the row's head, the day's date and
// name days beside it, and real room for text below.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  buildWeekStrip,
  isoWeek,
  parseDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import { DayEntry } from "./DayEntry.tsx";
import { WEEK_ROW_FONT } from "./entryFont.ts";
import { useT } from "./i18n/index.ts";
import {
  isRedWeekday,
  monthName,
  nameDaysFor,
  weekdayName,
  type LocalePack,
} from "./locale/index.ts";
import type { CalendarDoc } from "./types.ts";

type Props = {
  /** Any day inside the week on display. */
  anchor: DayKey;
  today: DayKey;
  pack: LocalePack;
  showNameDays: boolean;
  doc: CalendarDoc;
  editingDay: DayKey | null;
  onEditDay: (day: DayKey | null) => void;
  onCommit: (day: DayKey, text: string) => void;
};

export function WeekPlannerView({
  anchor,
  today,
  pack,
  showNameDays,
  doc,
  editingDay,
  onEditDay,
  onCommit,
}: Props) {
  const t = useT();
  const days = buildWeekStrip(anchor, {
    weekStartsOn: pack.weekStartsOn,
    today,
  });
  const first = parseDayKey(days[0].key);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 pb-3 sm:px-6">
      <h2 className="cal-serif py-4 text-center text-2xl tracking-wide sm:text-3xl">
        {t("topbar.week", { n: isoWeek(days[0].key) })}
        <span className="text-muted ml-3 text-lg">
          {first ? `${monthName(pack, first.month)} ${first.year}` : ""}
        </span>
      </h2>

      <div className="flex flex-1 flex-col border-t border-line">
        {days.map((cell) => {
          const parts = parseDayKey(cell.key);
          const weekday = new Date(`${cell.key}T12:00:00Z`).getUTCDay();
          const red = isRedWeekday(pack, weekday);
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
              className={`flex min-h-[5.5rem] flex-1 cursor-text flex-col border-b border-line px-2 py-1.5 focus-visible:outline-2 ${
                cell.isToday ? "bg-surface-2" : ""
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`cal-serif text-lg ${red ? "cal-red" : "text-fg"}`}
                >
                  {weekdayName(pack, weekday)}
                </span>
                <span className="text-muted cal-serif text-sm">
                  {parts?.day}
                </span>
                <span className="text-muted min-w-0 flex-1 truncate text-right text-[10px]">
                  {names.join(", ")}
                </span>
              </div>
              <div className="min-h-0 flex-1 pt-0.5">
                <DayEntry
                  text={entry}
                  editing={editingDay === cell.key}
                  font={WEEK_ROW_FONT}
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

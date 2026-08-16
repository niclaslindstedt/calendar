// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The country-pack contract. A pack bundles everything that differs between
// countries on a wall calendar: which day the week starts on, whether week
// numbers are printed, which weekday is "red", and the name-day table.
//
// Packs are deliberately SELF-CONTAINED: one file per country, no
// cross-imports between packs, no country conditionals anywhere else in the
// app. Adding a country is: copy an existing pack file, fill in the fields,
// register it in `index.ts`. Month and weekday names come from `Intl` via the
// pack's BCP-47 tag, so a pack carries no name tables beyond the name days.

import type { WeekStart } from "@niclaslindstedt/oss-framework/calendar";

/** `"MM-DD"` → the day's celebrated names, in display order. */
export type NameDayTable = Readonly<Record<string, readonly string[]>>;

export type LocalePack = {
  /** Stable id, also the persisted settings value — use the BCP-47 tag. */
  readonly id: string;
  /** Native-language display label for the country picker ("Sverige"). */
  readonly label: string;
  /** BCP-47 tag driving `Intl` month/weekday names and date formatting. */
  readonly bcp47: string;
  /** First day of the week, `Date.getDay()` numbering (1 = Monday). */
  readonly weekStartsOn: WeekStart;
  /** Whether this country's wall calendars print ISO week numbers. */
  readonly showWeekNumbersDefault: boolean;
  /** Whether this country has a name-day tradition to show. */
  readonly showNameDaysDefault: boolean;
  /** Weekdays printed in red, `Date.getDay()` numbering (0 = Sunday). */
  readonly redWeekdays: readonly number[];
  /** The name-day table, or null when the country has no tradition. */
  readonly nameDays: NameDayTable | null;
};

/** The name days for a month/day in this pack, or `[]` when there are none
 *  (no tradition, or a nameless day like 1 January in Sweden). */
export function nameDaysFor(
  pack: LocalePack,
  month: number,
  day: number,
): readonly string[] {
  if (!pack.nameDays) return [];
  const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return pack.nameDays[key] ?? [];
}

// Fixed reference week: 2023-01-01 was a Sunday, so day `d` of that week has
// `Date.getDay() === d`. Used to render weekday names via Intl without any
// name tables in the packs. Noon UTC keeps every timezone on the same date.
function referenceWeekday(weekday: number): Date {
  return new Date(Date.UTC(2023, 0, 1 + weekday, 12));
}

/** The pack-language name of a month (1-based), e.g. "januari" for sv-SE. */
export function monthName(pack: LocalePack, month: number): string {
  return new Intl.DateTimeFormat(pack.bcp47, {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2023, month - 1, 1, 12)));
}

/** The pack-language name of a weekday (`Date.getDay()` numbering). */
export function weekdayName(
  pack: LocalePack,
  weekday: number,
  style: "long" | "short" = "long",
): string {
  return new Intl.DateTimeFormat(pack.bcp47, {
    weekday: style,
    timeZone: "UTC",
  }).format(referenceWeekday(weekday));
}

/** The seven weekday indices in this pack's display order, starting from the
 *  pack's first day of week: Monday-start → [1,2,3,4,5,6,0]. */
export function weekdayOrder(pack: LocalePack): number[] {
  return Array.from({ length: 7 }, (_, i) => (pack.weekStartsOn + i) % 7);
}

/** Whether the weekday is printed red in this pack (Sundays, typically). */
export function isRedWeekday(pack: LocalePack, weekday: number): boolean {
  return pack.redWeekdays.includes(weekday);
}

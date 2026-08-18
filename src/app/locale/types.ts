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

import type {
  DayKey,
  WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";

import type { HyphenationRules } from "./hyphenate.ts";
import type { NameSpellingRules } from "./nameKey.ts";
import { isoWeek } from "@niclaslindstedt/oss-framework/calendar";

/** `"MM-DD"` → the day's celebrated names, in display order. */
export type NameDayTable = Readonly<Record<string, readonly string[]>>;

/** One holiday occurrence in a concrete year. `red` marks an official
 *  public-holiday "red day" (printed red like a Sunday); non-red entries are
 *  observances a wall calendar still names (bank-holiday substitutes, eves
 *  like Midsommarafton). Names are in the pack's own language — that's what
 *  a printed calendar does. */
export type Holiday = {
  month: number;
  day: number;
  name: string;
  red: boolean;
  /** Whether nobody works this day.
   *
   *  Separate from `red` for the same reason `restWeekdays` is separate from
   *  `redWeekdays`: `red` is ink, `off` is time. The two come apart in both
   *  directions. A UK bank holiday closes the country but is printed black, so
   *  it is `off` and not `red`. Swedish Julafton and Nyårsafton are named on
   *  every wall calendar and are workdays by law, so they are `red: false`
   *  *and* `off: false` — which is what lets the planner offer them as the
   *  cheap, high-value days they are.
   *
   *  The vacation planner reads this and never `red`. */
  off: boolean;
};

export type LocalePack = {
  /** Stable id, also the persisted settings value — use the BCP-47 tag. */
  readonly id: string;
  /** Native-language display label for the country picker ("Sverige"). */
  readonly label: string;
  /** The country's flag, as a regional-indicator emoji pair, shown beside the
   *  label in the picker. Every platform the app runs on draws these as the
   *  actual flag, so no image asset is needed. */
  readonly flag: string;
  /** BCP-47 tag driving `Intl` month/weekday names and date formatting. */
  readonly bcp47: string;
  /** First day of the week, `Date.getDay()` numbering (1 = Monday). */
  readonly weekStartsOn: WeekStart;
  /** The country's week-numbering rule. Both current packs use ISO-8601
   *  (the Swedish standard — week 1 holds the year's first Thursday); a
   *  future pack with a different rule adds its variant here and in
   *  `weekNumber` below. */
  readonly weekNumbering: "iso";
  /** Whether this country's wall calendars print week numbers by default. */
  readonly showWeekNumbersDefault: boolean;
  /** Whether this country has a name-day tradition to show. */
  readonly showNameDaysDefault: boolean;
  /** Weekdays printed in red, `Date.getDay()` numbering (0 = Sunday). */
  readonly redWeekdays: readonly number[];
  /** The weekend — weekdays nobody works, `Date.getDay()` numbering.
   *
   *  Deliberately NOT the same list as `redWeekdays`, which is about ink: a
   *  Swedish wall calendar prints Sunday red and Saturday black, but both are
   *  days off. Printing is `redWeekdays`; the vacation planner asks this. A
   *  country whose weekend is not Sat/Sun says so here rather than anywhere
   *  else in the app. */
  readonly restWeekdays: readonly number[];
  /** How the language breaks a word across lines, for names too long for a
   *  month cell's line. Shared machinery, per-language rules — see
   *  `hyphenate.ts`. */
  readonly hyphenation: HyphenationRules;
  /** How the language spells the same sound, so the name-day search finds
   *  "Niklas" for someone who writes it "Nicklas" — see `nameKey.ts`. */
  readonly nameSpelling: NameSpellingRules;
  /** The name-day table, or null when the country has no tradition. */
  readonly nameDays: NameDayTable | null;
  /** The country's holidays for a year — fixed dates plus computed rules
   *  (Easter chain, "the Saturday between…", bank-holiday substitutes). */
  readonly holidays: (year: number) => readonly Holiday[];
};

/** The week number of a day under the pack's numbering rule. */
export function weekNumber(pack: LocalePack, key: DayKey): number {
  // Only ISO-8601 exists today; new rules switch on `pack.weekNumbering`.
  void pack;
  return isoWeek(key);
}

// Per-pack, per-year holiday lookup tables, built lazily — the rules run
// once a year per pack, then day lookups are O(1).
const holidayCache = new Map<string, Map<string, Holiday>>();

/** The holiday falling on a day in this pack, or null. */
export function holidayFor(
  pack: LocalePack,
  year: number,
  month: number,
  day: number,
): Holiday | null {
  const cacheKey = `${pack.id}:${year}`;
  let table = holidayCache.get(cacheKey);
  if (!table) {
    table = new Map(pack.holidays(year).map((h) => [`${h.month}-${h.day}`, h]));
    holidayCache.set(cacheKey, table);
  }
  return table.get(`${month}-${day}`) ?? null;
}

/** Whether the day prints red in this pack: a red weekday (Sunday) or an
 *  official red-day holiday. */
export function isRedDay(
  pack: LocalePack,
  year: number,
  month: number,
  day: number,
  weekday: number,
): boolean {
  if (pack.redWeekdays.includes(weekday)) return true;
  return holidayFor(pack, year, month, day)?.red ?? false;
}

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
export function monthName(
  pack: LocalePack,
  month: number,
  style: "long" | "short" = "long",
): string {
  return new Intl.DateTimeFormat(pack.bcp47, {
    month: style,
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

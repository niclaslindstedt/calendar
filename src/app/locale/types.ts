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

import type { Eve, EveStatus } from "./eves.ts";
import type { HyphenationRules } from "./hyphenate.ts";
import type { NameSpellingRules } from "./nameKey.ts";
import {
  daysBetween,
  parseDayKey,
  startOfWeek,
  toDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

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
   *  it is `off` and not `red`. Swedish Julafton is named on every wall
   *  calendar and is a working day by law, yet almost nobody works it — so it
   *  is `red: false` and `off: true`, and a reader whose workplace differs
   *  says so in Settings (see `eves.ts`).
   *
   *  The vacation planner reads this and never `red`. */
  off: boolean;
  /** Set only on a holiday *eve* (`eves.ts`): how much of it is worked, once
   *  the reader's own workplace has had its say. Undefined on every other
   *  entry, which is also what tells the two apart when a pack's eves are
   *  rebuilt under a different set of choices. */
  eve?: EveStatus;
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
  /** The country's week-numbering rule — which week of January is week 1
   *  (see {@link WEEK_NUMBERING}). The weeks themselves always open on
   *  `weekStartsOn`, so a rule is only ever this one fact. */
  readonly weekNumbering: WeekNumbering;
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
   *  (Easter chain, "the Saturday between…", bank-holiday substitutes).
   *
   *  Includes the pack's `eves` at their collective default, so a caller with
   *  no settings to hand still gets the calendar the country prints. */
  readonly holidays: (year: number) => readonly Holiday[];
  /** The eves the country names before a holiday, and what most of its
   *  collective agreements make of each — see `eves.ts`. Empty for a country
   *  with no such tradition (the UK names none). */
  readonly eves: readonly Eve[];
};

/** The week-numbering rules the packs use, each as the day of January its
 *  week 1 always holds.
 *
 *  - `iso` — ISO-8601, the European standard: week 1 is the week holding the
 *    year's first Thursday, which is the same thing as the week holding
 *    4 January. The days of the year before it belong to the previous year's
 *    last week.
 *  - `us` — the American almanac's: week 1 is the week 1 January falls in,
 *    whatever weekday that is, so a year's first week can be a single day.
 *
 *  That one number is the whole difference (CLDR's "minimal days in the first
 *  week"); where a week opens is the pack's `weekStartsOn`. A country with
 *  another rule adds a row here and nothing else. */
export const WEEK_NUMBERING = {
  iso: 4,
  us: 1,
} as const satisfies Record<string, number>;

export type WeekNumbering = keyof typeof WEEK_NUMBERING;

/** The day a pack's week 1 of `year` opens on — which can be in December. */
export function firstWeekStart(pack: LocalePack, year: number): DayKey {
  return startOfWeek(
    toDayKey({ year, month: 1, day: WEEK_NUMBERING[pack.weekNumbering] }),
    pack.weekStartsOn,
  );
}

/** The week number of a day under the pack's numbering rule.
 *
 *  Every day of a week gets the same number — the week opens on the pack's
 *  `weekStartsOn` and is numbered from the latest week 1 it is not before —
 *  so a caller may ask with any day of the row it is printing. */
export function weekNumber(pack: LocalePack, key: DayKey): number {
  const start = startOfWeek(key, pack.weekStartsOn);
  const year = parseDayKey(key)?.year ?? 1970;
  // A week can belong to the next year (the last days of December under
  // either rule) or to the previous one (the first days of January under
  // ISO), so try the three candidates latest first.
  for (const y of [year + 1, year, year - 1]) {
    const first = firstWeekStart(pack, y);
    if (start >= first) return daysBetween(first, start) / 7 + 1;
  }
  return 1;
}

// Per-pack, per-year holiday lookup tables, built lazily — the rules run
// once a year per pack, then day lookups are O(1).
//
// Keyed by the pack OBJECT, not by `pack.id`: a pack carrying the reader's own
// eve choices (`withEveChoices`) keeps the id of the country it came from, so
// an id-keyed cache would serve one workplace's calendar to another. The
// derived packs are memoised at their end of the seam, which is what keeps
// this cache warm.
const holidayCache = new WeakMap<
  LocalePack,
  Map<number, Map<string, Holiday>>
>();

/** The holiday falling on a day in this pack, or null. */
export function holidayFor(
  pack: LocalePack,
  year: number,
  month: number,
  day: number,
): Holiday | null {
  let years = holidayCache.get(pack);
  if (!years) {
    years = new Map();
    holidayCache.set(pack, years);
  }
  let table = years.get(year);
  if (!table) {
    table = new Map(pack.holidays(year).map((h) => [`${h.month}-${h.day}`, h]));
    years.set(year, table);
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

// How a country orders a date is read off `Intl` for the pack's tag, once per
// tag, so a pack carries no date pattern of its own and a country added later
// writes its dates correctly by its tag alone. Only the ORDER and the join in
// front of the year are taken from it; the month's word is still `monthName`,
// which keeps every day-first pack printing exactly what it always has
// (`Intl`'s own long date would put a full stop after a German or a Finnish
// day, and decline the Finnish month).
type DateShape = { monthFirst: boolean; yearJoin: string };
const dateShapes = new Map<string, DateShape>();

function dateShape(pack: LocalePack): DateShape {
  let shape = dateShapes.get(pack.bcp47);
  if (!shape) {
    const parts = new Intl.DateTimeFormat(pack.bcp47, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).formatToParts(new Date(Date.UTC(2023, 7, 8, 12)));
    const at = (type: string) => parts.findIndex((p) => p.type === type);
    const year = at("year");
    const before = year > 0 ? parts[year - 1] : undefined;
    shape = {
      monthFirst: at("month") < at("day"),
      yearJoin: before?.type === "literal" ? before.value : " ",
    };
    dateShapes.set(pack.bcp47, shape);
  }
  return shape;
}

/** A day of a month the way the pack's country writes it: "25 Dec" in the UK,
 *  "Dec 25" in the US. `days` may be a run or a list the caller has already
 *  set ("20–28", "2, 5, 7") — the country decides where the month goes, not
 *  what the days look like. */
export function dayMonth(
  pack: LocalePack,
  days: number | string,
  month: number,
  style: "long" | "short" = "short",
): string {
  const name = monthName(pack, month, style);
  return dateShape(pack).monthFirst ? `${name} ${days}` : `${days} ${name}`;
}

/** A whole date, spelled out with its year: "8 August 2026" in the UK,
 *  "August 8, 2026" in the US. */
export function dayMonthYear(
  pack: LocalePack,
  day: number,
  month: number,
  year: number,
): string {
  return `${dayMonth(pack, day, month, "long")}${dateShape(pack).yearJoin}${year}`;
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

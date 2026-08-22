// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week list, and finding a week in it — what a tapped week number opens.
//
// A week number is the one thing on a wall calendar that is a *coordinate*
// rather than a name: "week 34" means nothing on its own, and neither does
// "the week of the 8th" until you have the other half. So the screen the
// number opens is a two-column table — every week of the year, the dates it
// spans beside it — and its search takes either half. Type `34` and you get
// week 34; type `8 aug` and you get the week that holds it.
//
// Which is where the interesting problem is. A date is written a dozen ways
// and half of them are ambiguous: `12/8` is the twelfth of August to most of
// Europe and the eighth of December to an American, and the calendar has no
// business deciding which of the two a reader meant. So {@link parseWeekQuery}
// returns *every* reading a query has and the screen prints them all — two
// rows, each captioned with the date it came from, which is both the answer
// and the question answered. A query that is not ambiguous simply has one
// reading; nothing about the code path differs.
//
// Everything here is pure — the month names come from the registered packs'
// own `Intl` tags and the almanac's week rule from the pack in hand — so
// `tests/week_search_test.ts` can pin every reading without a DOM.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  addDays,
  parseDayKey,
  startOfWeek,
  toDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import {
  LOCALES,
  monthName,
  weekNumber,
  type LocalePack,
} from "./locale/index.ts";

/** One row of the table: a week, and the seven days it spans. */
export type WeekRow = {
  /** The number the almanac prints for it. */
  readonly week: number;
  /** The day it opens on (the pack's start of week) … */
  readonly start: DayKey;
  /** … and the day it closes on, six days later. */
  readonly end: DayKey;
};

/** A week the query reached, and how it got there. */
export type WeekHit = WeekRow & {
  /** The day the query named, when it named one — printed beside the week so
   *  an ambiguous date can show both of its answers and say which is which.
   *  `null` for a week reached by its number, where there is nothing to
   *  explain. */
  readonly on: DayKey | null;
};

/** What a query says, before it is looked up: the weeks it names outright,
 *  the concrete days it can be read as (one per reading), the months it names
 *  without a day, and the years it names on their own. */
export type WeekQuery = {
  readonly weeks: readonly number[];
  readonly days: readonly DayKey[];
  readonly months: readonly number[];
  readonly years: readonly number[];
};

/** The highest week any year can have, and the guard on a typed number. */
const MAX_WEEK = 53;

/** How far the list will look for a year the reader typed. Four digits alone
 *  are a year rather than a week, but only inside the range a calendar app is
 *  plausibly asked about — `1999` is a year, `9999` is a typo. */
const YEAR_RANGE = { min: 1583, max: 2400 } as const;

/** How much of a month's name has to be typed before it counts. Two letters
 *  reach both "mars" and "maj", and a query that matches half the year is not
 *  an answer; three is the shortest form a calendar actually prints. */
const MIN_MONTH_LETTERS = 3;

/** The week a day belongs to. The one place the pack's start of week and its
 *  numbering rule are put together, so everything else here is arithmetic. */
export function weekOf(pack: LocalePack, key: DayKey): WeekRow {
  const start = startOfWeek(key, pack.weekStartsOn);
  return {
    // Asked of the week's middle rather than of its first day: ISO-8601 —
    // both shipped packs' rule — defines a week by the Thursday in it, which
    // is exactly `start + 3` for a Monday-start week and the nearest thing to
    // it for a pack that opens its weeks on a Sunday.
    week: weekNumber(pack, addDays(start, 3)),
    start,
    end: addDays(start, 6),
  };
}

/** Every week of a year, in order.
 *
 *  A year's weeks are the ones between its own week 1 and the next year's,
 *  and week 1 is found rather than assumed: the 4th of January is in it under
 *  ISO-8601 whatever weekday the year starts on. That is what makes the table
 *  52 rows in most years and 53 in the ones that need it, without either
 *  number appearing here. */
export function weeksInYear(pack: LocalePack, year: number): WeekRow[] {
  const first = startOfWeek(
    toDayKey({ year, month: 1, day: 4 }),
    pack.weekStartsOn,
  );
  const limit = startOfWeek(
    toDayKey({ year: year + 1, month: 1, day: 4 }),
    pack.weekStartsOn,
  );
  const rows: WeekRow[] = [];
  for (let at = first; at < limit; at = addDays(at, 7)) {
    rows.push(weekOf(pack, at));
  }
  return rows;
}

/** The days in a month — the guard that keeps `31/2` from being a reading. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Lower case, without the abbreviating full stop some locales print (`aug.`)
 *  and without the accents a keyboard may or may not have produced. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\s]/g, "");
}

/** Every word that names a month, folded for comparison and built once.
 *
 *  Every *shipped country pack's* language, plus English. Three settings pull
 *  at this — the country calendar, the language the app is read in, and the
 *  keyboard the reader is typing on — and they are routinely three different
 *  answers: a Swede running the app in English still has a Swedish calendar,
 *  and will type whichever of "aug" and "augusti" comes to hand. Accepting
 *  every registered pack's names costs nothing (they are the same twelve
 *  months) and means a country added later brings its own month names with it
 *  and needs no table here.
 *
 *  Built lazily and kept: the search runs on every keystroke, and `Intl`
 *  formatters are not cheap enough to make twelve of them per letter typed. */
let monthWords: string[][] | null = null;

function wordsForMonth(month: number): string[] {
  monthWords ??= Array.from({ length: 12 }, (_, i) => {
    const tags = [...new Set([...LOCALES.map((l) => l.bcp47), "en-GB"])];
    return tags.flatMap((tag) =>
      (["long", "short"] as const).map((style) =>
        fold(
          new Intl.DateTimeFormat(tag, {
            month: style,
            timeZone: "UTC",
          }).format(new Date(Date.UTC(2023, i, 1, 12))),
        ),
      ),
    );
  });
  return monthWords[month - 1];
}

/** The months a typed word can mean — several, where the word is short enough
 *  to be the head of more than one ("ma" would be March and May, which is why
 *  {@link MIN_MONTH_LETTERS} exists). */
export function monthsNamed(word: string): number[] {
  const typed = fold(word);
  if (typed.length < MIN_MONTH_LETTERS) return [];
  const found: number[] = [];
  for (let month = 1; month <= 12; month++) {
    if (wordsForMonth(month).some((name) => name.startsWith(typed))) {
      found.push(month);
    }
  }
  return found;
}

/** A four- or two-digit year as typed: `26` is this century's, the way every
 *  form on the web reads it. */
function yearNamed(digits: string | undefined, fallback: number): number {
  if (digits === undefined) return fallback;
  const n = Number(digits);
  return digits.length <= 2 ? 2000 + n : n;
}

/** Add a day to the readings, if it is a day at all. Silently drops the
 *  impossible ones, which is what makes `31/2` a single reading rather than
 *  two: only one of the two orders is a date. */
function addReading(
  into: DayKey[],
  year: number,
  month: number,
  day: number,
): void {
  if (month < 1 || month > 12 || day < 1) return;
  if (day > daysInMonth(year, month)) return;
  const key = toDayKey({ year, month, day });
  if (!into.includes(key)) into.push(key);
}

/** A week number as typed, with or without the letter a calendar prints in
 *  front of it. Both packs' shorthands and both languages' words. */
const WEEK_WORD = /^(?:v|vko|vecka|w|wk|week)\s*[.:]?\s*(\d{1,2})$/;
/** The bare number: on a screen listing weeks, that is a week. */
const BARE_NUMBER = /^(\d{1,2})$/;
/** A year on its own — the way to reach a table other than this year's. */
const BARE_YEAR = /^(\d{4})$/;
/** `2026-08-08`, and the same with slashes or dots. Unambiguous by
 *  construction: nothing writes the year first and then the day. */
const ISO_DATE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
/** `8/8`, `12.8`, `8-8`, `8 8` — and optionally a year after them. This is
 *  the ambiguous one: both orders are read. */
const NUMERIC_DATE =
  /^(\d{1,2})\s*[-/. ]\s*(\d{1,2})(?:\s*[-/. ]\s*(\d{2,4}))?$/;
/** `8 aug`, `8 augusti 2026`, `8. aug.` */
const DAY_FIRST =
  /^(\d{1,2})\s*[.\s]?\s*([^\d\s.,]+)\.?(?:\s*,?\s*(\d{2,4}))?$/;
/** `aug 8`, `August 8, 2026` */
const MONTH_FIRST = /^([^\d\s.,]+)\.?\s*(\d{1,2})(?:\s*,?\s*(\d{2,4}))?$/;
/** `august` — a month with no day in it. */
const MONTH_ALONE = /^([^\d\s.,]+)\.?$/;

/**
 * Every reading of what was typed.
 *
 * `year` is the year the calendar is showing, which is what a date with no
 * year of its own means: someone looking at 2026 and typing `8 aug` means
 * this August. A query that carries its own year overrules it, and the table
 * for that year is then built around the answer rather than around where the
 * reader happened to be.
 */
export function parseWeekQuery(query: string, year: number): WeekQuery {
  const typed = query.trim().toLowerCase().replace(/\s+/g, " ");
  const weeks: number[] = [];
  const days: DayKey[] = [];
  const months: number[] = [];
  const years: number[] = [];
  if (!typed) return { weeks, days, months, years };

  const week = WEEK_WORD.exec(typed) ?? BARE_NUMBER.exec(typed);
  if (week) {
    const n = Number(week[1]);
    if (n >= 1 && n <= MAX_WEEK) weeks.push(n);
  }

  const bareYear = BARE_YEAR.exec(typed);
  if (bareYear) {
    const n = Number(bareYear[1]);
    if (n >= YEAR_RANGE.min && n <= YEAR_RANGE.max) years.push(n);
  }

  const iso = ISO_DATE.exec(typed);
  if (iso) {
    addReading(days, Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const numeric = NUMERIC_DATE.exec(typed);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const on = yearNamed(numeric[3], year);
    // Both orders, day-first before month-first: the calendar is European and
    // so is the reading it offers first, but the other one is right there
    // under it rather than argued about.
    addReading(days, on, b, a);
    addReading(days, on, a, b);
  }

  for (const [pattern, dayFirst] of [
    [DAY_FIRST, true],
    [MONTH_FIRST, false],
  ] as const) {
    const named = pattern.exec(typed);
    if (!named) continue;
    const day = Number(dayFirst ? named[1] : named[2]);
    const word = dayFirst ? named[2] : named[1];
    const on = yearNamed(named[3], year);
    for (const month of monthsNamed(word)) {
      addReading(days, on, month, day);
    }
  }

  const alone = MONTH_ALONE.exec(typed);
  if (alone) months.push(...monthsNamed(alone[1]));

  return { weeks, days, months, years };
}

/**
 * The weeks a query reaches, best first.
 *
 * Ordered by how directly the query named them: a week number is the answer
 * to the question that was asked, a date is the answer to a question about a
 * date, and a bare month is a place to start reading. Within each, calendar
 * order.
 *
 * A blank query reaches nothing — it is not a question. The screen answers
 * that one with {@link weeksInYear}, which is a perfectly good thing to
 * browse.
 */
export function searchWeeks(
  pack: LocalePack,
  year: number,
  query: string,
): WeekHit[] {
  const asked = parseWeekQuery(query, year);
  const hits: WeekHit[] = [];
  const seen = new Set<string>();
  const add = (row: WeekRow, on: DayKey | null) => {
    // Keyed on the day as well as the week, so the two readings of an
    // ambiguous date both survive even in the freak case where they land in
    // the same week.
    const key = `${row.start}|${on ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ ...row, on });
  };

  const table = weeksInYear(pack, year);
  for (const n of asked.weeks) {
    for (const row of table) if (row.week === n) add(row, null);
  }
  for (const day of asked.days) {
    add(weekOf(pack, day), day);
  }
  for (const month of asked.months) {
    for (const row of table) {
      // A week belongs to a month if any of its days do — the weeks that
      // straddle the turn of a month are exactly the ones worth finding this
      // way.
      if (overlapsMonth(row, year, month)) add(row, null);
    }
  }
  for (const named of asked.years) {
    for (const row of weeksInYear(pack, named)) add(row, null);
  }
  return hits;
}

/** Whether any day of the week falls in the given month. */
function overlapsMonth(row: WeekRow, year: number, month: number): boolean {
  for (let i = 0; i < 7; i++) {
    const parts = parseDayKey(addDays(row.start, i));
    if (parts && parts.year === year && parts.month === month) return true;
  }
  return false;
}

/** "18–24 Aug", collapsing the repeated month, or "28 Dec – 3 Jan" where the
 *  week crosses one. Every year has a handful of the second kind, and the two
 *  at the turn of the year cross a year as well — which the label leaves to
 *  the heading above it to say, rather than printing 2026 twice in a row that
 *  is already two dates and two months long. */
export function weekRangeLabel(pack: LocalePack, row: WeekRow): string {
  const a = parseDayKey(row.start);
  const b = parseDayKey(row.end);
  if (!a || !b) return `${row.start} – ${row.end}`;
  const month = (m: number) => monthName(pack, m, "short");
  return a.month === b.month
    ? `${a.day}–${b.day} ${month(a.month)}`
    : `${a.day} ${month(a.month)} – ${b.day} ${month(b.month)}`;
}

/** "8 August 2026" — the date a reading was made of, spelled out under the
 *  week it landed in. Long-form and with the year, because this is the line
 *  that has to make two readings of `12/8` tell themselves apart. */
export function dayLabel(pack: LocalePack, key: DayKey): string {
  const parts = parseDayKey(key);
  if (!parts) return key;
  return `${parts.day} ${monthName(pack, parts.month)} ${parts.year}`;
}

/** The month a week is filed under in the browsing list: the one its middle
 *  day falls in, which is the same day the almanac numbers the week by. A
 *  week that straddles two months has to be under one of them, and this is
 *  the half it mostly lies in. */
export function weekMonth(row: WeekRow): { year: number; month: number } {
  const mid = parseDayKey(addDays(row.start, 3)) ??
    parseDayKey(row.start) ?? { year: 0, month: 1, day: 1 };
  return { year: mid.year, month: mid.month };
}

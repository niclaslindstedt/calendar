// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Whose day is this: the pure half of the contacts feature.
//
// Two questions, and they are answered very differently. A BIRTHDAY is a date
// the contact store already holds, so marking it is arithmetic. A NAME DAY is
// a lookup in the country pack's almanac — and the almanac prints one
// spelling per name, so a Nicklas is not in it and a Niklas is. That is the
// same problem the name-day search has, and it gets the same answer: both
// sides are folded to what the name SOUNDS like (`locale/nameKey.ts`) and
// compared there, so a contact spelled Nicklas is celebrated on Niklas's day.
//
// Everything here is pure and country-agnostic — the spelling knowledge lives
// in the packs, the contact list comes from the host — so
// `tests/celebrations_test.ts` pins the behaviour with no DOM and no device.

import { nameKey, type LocalePack } from "../locale/index.ts";
import { givenNames, type Contact } from "./types.ts";

/** One person celebrated on a day, and what for. A name day carries the name
 *  the ALMANAC prints rather than the contact's spelling, because that is the
 *  string already on the page — it is what the view marks. */
export type Celebration =
  | { readonly kind: "birthday"; readonly contact: Contact }
  | {
      readonly kind: "nameDay";
      readonly contact: Contact;
      /** As the almanac prints it — "Niklas", not the contact's "Nicklas". */
      readonly almanacName: string;
    };

/** A day's celebrations, split by kind because the two are printed
 *  differently: a birthday is text the calendar did not have before, and a
 *  name day is a name already on the page that gets marked as yours. */
export type DayCelebrations = {
  readonly birthdays: readonly Contact[];
  readonly nameDays: readonly {
    readonly contact: Contact;
    readonly almanacName: string;
  }[];
};

/** The whole answer, keyed by `"MM-DD"` — the same key shape the packs' name
 *  tables use. Built once per (pack, selected contacts) and read per day. */
export type PeopleIndex = {
  readonly days: ReadonlyMap<string, DayCelebrations>;
  /** True when nothing is marked at all — the views' fast path, and the
   *  common one: contacts are opt-in and most readers never turn them on. */
  readonly empty: boolean;
};

/** A day nobody is celebrated on — which is nearly every day, for nearly
 *  every reader. A frozen singleton for the same memoization reason
 *  {@link EMPTY_PEOPLE} is one. */
export const NO_CELEBRATIONS: DayCelebrations = { birthdays: [], nameDays: [] };

/** The index of a calendar with no contacts in it. A frozen singleton because
 *  the views are memoized on their props: a fresh empty index every render
 *  would re-render three months' worth of day cells for nothing. */
export const EMPTY_PEOPLE: PeopleIndex = { days: new Map(), empty: true };

/** `"MM-DD"` for a month and day. */
export function dateKey(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whether a year has a 29 February. Proleptic Gregorian, like every other
 *  date in this app. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The almanac folded for lookup: sound key → the dates and printed spellings
 *  that key is celebrated on. Built once per pack — the tables are static
 *  data, and a reader with a few hundred contacts would otherwise fold all
 *  627 Swedish names again on every render. */
const almanacCache = new WeakMap<
  LocalePack,
  Map<string, readonly { key: string; name: string }[]>
>();

function foldedAlmanac(
  pack: LocalePack,
): Map<string, readonly { key: string; name: string }[]> {
  const cached = almanacCache.get(pack);
  if (cached) return cached;

  const table = new Map<string, { key: string; name: string }[]>();
  for (const [date, names] of Object.entries(pack.nameDays ?? {})) {
    for (const name of names) {
      const folded = nameKey(name, pack.nameSpelling);
      if (!folded) continue;
      const bucket = table.get(folded);
      // A name can be celebrated on more than one date in the same almanac,
      // and two spellings of one sound can share a date — so this is a list,
      // and duplicates of the SAME date are dropped rather than printed twice.
      if (!bucket) table.set(folded, [{ key: date, name }]);
      else if (!bucket.some((e) => e.key === date && e.name === name))
        bucket.push({ key: date, name });
    }
  }
  // Keyed by the pack OBJECT rather than by `pack.id`, for the reason
  // `holidayFor`'s cache is: a pack carrying the reader's eve choices keeps
  // the id of the country it came from.
  almanacCache.set(pack, table);
  return table;
}

/**
 * Index a set of people against a country's almanac.
 *
 * The contacts handed in are the SELECTED ones — the opt-in is applied before
 * this, not inside it, so the index is exactly what the calendar will print.
 * A pack with no name-day tradition (en-GB) yields birthdays only, which is
 * the whole feature for a British reader and not a degraded version of it.
 */
export function indexPeople(
  pack: LocalePack,
  contacts: readonly Contact[],
): PeopleIndex {
  if (contacts.length === 0) return EMPTY_PEOPLE;

  const days = new Map<
    string,
    {
      birthdays: Contact[];
      nameDays: { contact: Contact; almanacName: string }[];
    }
  >();
  const at = (key: string) => {
    let day = days.get(key);
    if (!day) {
      day = { birthdays: [], nameDays: [] };
      days.set(key, day);
    }
    return day;
  };

  const almanac = foldedAlmanac(pack);

  for (const contact of contacts) {
    if (contact.birthday) {
      const { month, day } = contact.birthday;
      at(dateKey(month, day)).birthdays.push(contact);
    }

    // Each spelling of the given name is folded and looked up, and the DATES
    // are de-duplicated rather than the names: "Anna-Karin" reaches the table
    // whole and as both halves, and Anna's day is one day whichever route
    // found it — but Anna's day and Karin's day are two, and both are theirs.
    const seen = new Set<string>();
    for (const spelling of givenNames(contact)) {
      const folded = nameKey(spelling, pack.nameSpelling);
      if (!folded) continue;
      for (const entry of almanac.get(folded) ?? []) {
        if (seen.has(entry.key)) continue;
        seen.add(entry.key);
        at(entry.key).nameDays.push({ contact, almanacName: entry.name });
      }
    }
  }

  return { days, empty: days.size === 0 };
}

/**
 * The people celebrated on a concrete day.
 *
 * Takes the year because one birthday in the calendar needs it: someone born
 * on 29 February has no birthday at all in three years out of four, and a
 * calendar that simply skipped them would be the wrong answer three times
 * running. Sweden and the UK both settle that the same way in law and in
 * practice — the day before the leap day is the one that stands in — so a
 * common year prints them on 28 February, and a leap year prints them on the
 * 29th where they belong.
 *
 * Name days need no such rule: an almanac has no 29 February entry to miss.
 */
export function celebrationsOn(
  index: PeopleIndex,
  year: number,
  month: number,
  day: number,
): DayCelebrations {
  if (index.empty) return NO_CELEBRATIONS;

  const own = index.days.get(dateKey(month, day));
  const leapDay =
    month === 2 && day === 28 && !isLeapYear(year)
      ? index.days.get("02-29")
      : undefined;

  if (!leapDay) return own ?? NO_CELEBRATIONS;
  if (!own) return { birthdays: leapDay.birthdays, nameDays: [] };
  // The stand-in day carries only the leap day's *birthdays* — a name day is
  // the almanac's, and the almanac already said what the 28th celebrates.
  return {
    birthdays: [...own.birthdays, ...leapDay.birthdays],
    nameDays: own.nameDays,
  };
}

/** The almanac names on a day that belong to somebody — what the views mark
 *  inside the run of names they were already printing. Empty for a day with
 *  no name-day celebrant, which is almost every day. */
export function celebratedNames(
  celebrations: DayCelebrations,
): ReadonlySet<string> {
  if (celebrations.nameDays.length === 0) return EMPTY_NAMES;
  return new Set(celebrations.nameDays.map((n) => n.almanacName));
}

/** Shared empty set, for the same memoization reason as {@link EMPTY_PEOPLE}. */
const EMPTY_NAMES: ReadonlySet<string> = new Set();

/** How old they turn on this year's birthday, or null when the contact store
 *  holds no birth year — which is common, and not a failure. */
export function turningAge(contact: Contact, year: number): number | null {
  const born = contact.birthday?.year;
  if (born === undefined || born > year) return null;
  return year - born;
}

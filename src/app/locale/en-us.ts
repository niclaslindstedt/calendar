// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// United States country pack. A US wall calendar starts the week on Sunday,
// numbers its weeks from the one 1 January falls in (when it numbers them at
// all — it usually does not, so they ship off), names the federal holidays
// and the weekdays they are observed on, and has no name-day tradition.
//
// The holidays are a table rather than code: each federal holiday is either a
// fixed date or "the nth weekday of a month", and one rule — the observed day
// — applies to every fixed one. A country built the same way (most are) is
// this file with its own table.

import {
  addToMonthDay,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
  weekdayOfMonthDay,
} from "@niclaslindstedt/oss-framework/calendar";
import type { HyphenationRules } from "./hyphenate.ts";
import type { NameSpellingRules } from "./nameKey.ts";
import type { Holiday, LocalePack } from "./types.ts";

const MON = 1;
const THU = 4;

/** One federal holiday (5 U.S.C. § 6103(a)), by the name a US wall calendar
 *  prints — "Presidents' Day" rather than the statute's "Washington's
 *  Birthday", "Juneteenth" rather than "Juneteenth National Independence
 *  Day" — and the rule that places it. `since` is the first year it was
 *  observed. */
type FederalHoliday = {
  name: string;
  since?: number;
} & (
  | { fixed: readonly [month: number, day: number] }
  | { nth: readonly [month: number, weekday: number, n: number] }
  | { last: readonly [month: number, weekday: number] }
);

const FEDERAL: readonly FederalHoliday[] = [
  { name: "New Year's Day", fixed: [1, 1] },
  { name: "Martin Luther King Jr. Day", nth: [1, MON, 3], since: 1986 },
  { name: "Presidents' Day", nth: [2, MON, 3] },
  { name: "Memorial Day", last: [5, MON] },
  { name: "Juneteenth", fixed: [6, 19], since: 2021 },
  { name: "Independence Day", fixed: [7, 4] },
  { name: "Labor Day", nth: [9, MON, 1] },
  { name: "Columbus Day", nth: [10, MON, 2] },
  { name: "Veterans Day", fixed: [11, 11] },
  { name: "Thanksgiving", nth: [11, THU, 4] },
  { name: "Christmas Day", fixed: [12, 25] },
];

/** What the calendar prints on the weekday a weekend holiday is observed. */
function observed(name: string): string {
  return `${name} (observed)`;
}

/** The weekday a fixed holiday is observed on when it falls on a weekend
 *  (5 U.S.C. § 6103(b), Executive Order 11582): a Saturday's holiday on the
 *  Friday before, a Sunday's on the Monday after. As an offset in days, 0 on
 *  a weekday. */
function observedShift(year: number, month: number, day: number): number {
  const weekday = weekdayOfMonthDay(year, month, day);
  return weekday === 6 ? -1 : weekday === 0 ? 1 : 0;
}

// Federal holidays. The weekday ones are named where they fall. A fixed one
// that lands on a weekend keeps its name on its own date — a US calendar
// still prints "Independence Day" on a Saturday 4 July — and the weekday it
// is observed on is named too, "(observed)", and is the day off. That is the
// shape the UK pack's "(substitute)" days have, with the date itself kept,
// because a US calendar keeps it.
//
// The one observed day that leaves its year is New Year's: 1 January on a
// Saturday is observed on Friday 31 December, so this year's table carries
// next year's observed New Year's Day, and a Saturday New Year's Day has no
// weekday of its own in January.
//
// Federal holidays are named in black, like UK bank holidays: an American
// calendar keeps red for Sundays, if it uses it at all, so `red` is false and
// `off` is what the vacation planner reads.
function holidays(year: number): readonly Holiday[] {
  const list: Holiday[] = [];
  const add = (month: number, day: number, name: string): void => {
    list.push({ month, day, name, red: false, off: true });
  };

  for (const h of FEDERAL) {
    if (h.since !== undefined && year < h.since) continue;
    if ("nth" in h) {
      const [month, weekday, n] = h.nth;
      const at = nthWeekdayOfMonth(year, month, weekday, n);
      add(at.month, at.day, h.name);
    } else if ("last" in h) {
      const [month, weekday] = h.last;
      const at = lastWeekdayOfMonth(year, month, weekday);
      add(at.month, at.day, h.name);
    } else {
      const [month, day] = h.fixed;
      add(month, day, h.name);
      const shift = observedShift(year, month, day);
      // Friday 31 December is next year's, added below.
      if (shift !== 0 && !(month === 1 && day === 1 && shift < 0)) {
        const at = addToMonthDay(year, month, day, shift);
        add(at.month, at.day, observed(h.name));
      }
    }
  }

  const newYear = FEDERAL[0];
  if (observedShift(year + 1, 1, 1) < 0) add(12, 31, observed(newYear.name));

  return list.sort((a, b) => a.month - b.month || a.day - b.day);
}

// American hyphenation is English hyphenation — the same rules as the UK
// pack, repeated here because packs never import one another.
const hyphenation: HyphenationRules = {
  vowels: "aeiouy",
  diphthongs: [
    "ai",
    "au",
    "ay",
    "ea",
    "ee",
    "ei",
    "eu",
    "ey",
    "ie",
    "oa",
    "oe",
    "oi",
    "oo",
    "ou",
    "oy",
    "ue",
    "ui",
  ],
  onsets: [
    "bl",
    "br",
    "cl",
    "cr",
    "dr",
    "dw",
    "fl",
    "fr",
    "gl",
    "gr",
    "pl",
    "pr",
    "sc",
    "sk",
    "sl",
    "sm",
    "sn",
    "sp",
    "st",
    "sw",
    "tr",
    "tw",
    "ch",
    "gh",
    "ph",
    "sh",
    "th",
    "wh",
    "wr",
    "qu",
    "scr",
    "shr",
    "spl",
    "spr",
    "str",
    "thr",
    "squ",
  ],
  inseparable: ["ch", "ph", "sh", "th", "wh"],
  neverOnset: "x",
  minLeading: 2,
  minTrailing: 3,
};

// English name spelling, as in the UK pack. Nothing searches it (there are no
// name days), but the rules are part of the pack contract.
const nameSpelling: NameSpellingRules = {
  softVowels: "eiy",
  softC: "s",
  hardC: "k",
  softensG: true,
  jOnsets: [],
  digraphs: { ch: "k", ph: "f", th: "t", gh: "g", wh: "v", qu: "kv" },
  letters: { q: "k", w: "v", x: "ks", z: "s", y: "i" },
  fold: {},
};

export const enUS: LocalePack = {
  id: "en-US",
  label: "United States",
  flag: "🇺🇸",
  bcp47: "en-US",
  weekStartsOn: 0,
  weekNumbering: "us",
  showWeekNumbersDefault: false,
  showNameDaysDefault: false,
  redWeekdays: [0],
  restWeekdays: [0, 6],
  hyphenation,
  nameSpelling,
  nameDays: null,
  holidays,
  // The US names no holiday eves: Christmas Eve and New Year's Eve are
  // ordinary working days, with no nationwide agreement handing them back.
  // (A 31 December off is New Year's Day observed, and comes from the table.)
  eves: [],
};

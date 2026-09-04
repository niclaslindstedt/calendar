// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Netherlands country pack. Dutch calendars start the week on Monday and
// print weeknummers — "week 32" is how the country schedules — so those are
// on by default. There is no name-day tradition, so `nameDays` is null, the
// way it is for the UK.
//
// **This pack is the clearest case of `red` and `off` coming apart.** The
// Netherlands has no statutory right to a day off on a feestdag: whether you
// work one is written in your cao, not in law. Goede Vrijdag and
// Bevrijdingsdag are officially recognised feestdagen and are printed on the
// calendar — and most people work both. So they are `red: true, off: false`:
// the calendar names them in red ink, and the vacation planner does not hand
// the reader a day their employer never gave them. Sinterklaas is the
// opposite end of the same scale: the biggest day on the Dutch calendar and
// not a feestdag at all, so it is named and neither.

import {
  addToMonthDay,
  easterSunday,
  weekdayOfMonthDay,
} from "@niclaslindstedt/oss-framework/calendar";
import { eveHolidays, type Eve } from "./eves.ts";
import type { HyphenationRules } from "./hyphenate.ts";
import type { NameSpellingRules } from "./nameKey.ts";
import type { Holiday, LocalePack } from "./types.ts";

/** Koningsdag is 27 April, moved back to the 26th when the 27th is a Sunday —
 *  the King's birthday is not celebrated on a Sunday. */
function koningsdag(year: number): { month: number; day: number } {
  return weekdayOfMonthDay(year, 4, 27) === 0
    ? { month: 4, day: 26 }
    : { month: 4, day: 27 };
}

// The two half days Dutch cao's commonly give. Neither is a feestdag, and
// neither is a full day off in most of them: work stops at midday, which is
// exactly what `"half"` is for.
const EVES: readonly Eve[] = [
  {
    id: "kerstavond",
    name: "Kerstavond",
    date: () => ({ month: 12, day: 24 }),
    collective: "half",
  },
  {
    id: "oudejaarsdag",
    name: "Oudejaarsdag",
    date: () => ({ month: 12, day: 31 }),
    collective: "half",
  },
];

// The Dutch holidays for a year. See the header for why two of them are red
// without being off.
function holidays(year: number): readonly Holiday[] {
  const easter = easterSunday(year);
  const chain = (offset: number, name: string, off = true): Holiday => ({
    ...addToMonthDay(year, easter.month, easter.day, offset),
    name,
    red: true,
    off,
  });
  return [
    { month: 1, day: 1, name: "Nieuwjaarsdag", red: true, off: true },
    chain(-2, "Goede Vrijdag", false),
    chain(0, "Eerste Paasdag"),
    chain(1, "Tweede Paasdag"),
    { ...koningsdag(year), name: "Koningsdag", red: true, off: true },
    { month: 5, day: 4, name: "Dodenherdenking", red: false, off: false },
    { month: 5, day: 5, name: "Bevrijdingsdag", red: true, off: false },
    chain(39, "Hemelvaartsdag"),
    chain(49, "Eerste Pinksterdag"),
    chain(50, "Tweede Pinksterdag"),
    { month: 12, day: 5, name: "Sinterklaas", red: false, off: false },
    { month: 12, day: 25, name: "Eerste Kerstdag", red: true, off: true },
    { month: 12, day: 26, name: "Tweede Kerstdag", red: true, off: true },
    ...eveHolidays(EVES, year),
  ];
}

// Dutch hyphenation. The vowel-pair list is the longest of any pack here,
// because Dutch writes nearly every long vowel with two letters ("Paasdag",
// "Kerstdag", "Bevrijdingsdag") and splitting one would read as a
// misspelling. "sch" is a single onset — "Ne-der-land-sche", never
// "Nederlands-che".
const hyphenation: HyphenationRules = {
  vowels: "aeiouy",
  diphthongs: [
    "aa",
    "ae",
    "ai",
    "au",
    "ee",
    "ei",
    "eu",
    "ie",
    "ij",
    "oe",
    "oi",
    "oo",
    "ou",
    "ui",
    "uu",
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
    "kl",
    "kn",
    "kr",
    "kw",
    "pl",
    "pr",
    "sl",
    "sm",
    "sn",
    "sp",
    "st",
    "tr",
    "tw",
    "vl",
    "vr",
    "wr",
    "zw",
    "ch",
    "ph",
    "th",
    "chr",
    "sch",
    "spl",
    "spr",
    "str",
    "schr",
  ],
  inseparable: ["ch", "ph", "th"],
  neverOnset: "x",
  minLeading: 2,
  minTrailing: 2,
};

// Dutch name spelling. `ij` and `y` are the same sound and were the same
// letter for centuries — "Wijnand"/"Wynand", "Thijs"/"Thys" — which is the
// one rule Dutch needs that no other pack here does. `g` stays hard: a Dutch
// `g` is a fricative, never a `j`.
const nameSpelling: NameSpellingRules = {
  softVowels: "eiy",
  softC: "s",
  hardC: "k",
  softensG: false,
  jOnsets: [],
  digraphs: { ch: "k", ph: "f", th: "t", sch: "s", ij: "i", qu: "kv" },
  letters: { w: "v", x: "ks", y: "i", z: "s" },
  fold: { é: "e", ë: "e", ï: "i", ö: "o", ü: "u", ĳ: "i" },
};

export const nlNL: LocalePack = {
  id: "nl-NL",
  label: "Nederland",
  flag: "\u{1F1F3}\u{1F1F1}",
  bcp47: "nl-NL",
  weekStartsOn: 1,
  weekNumbering: "iso",
  showWeekNumbersDefault: true,
  showNameDaysDefault: false,
  redWeekdays: [0],
  restWeekdays: [0, 6],
  hyphenation,
  nameSpelling,
  nameDays: null,
  holidays,
  eves: EVES,
};

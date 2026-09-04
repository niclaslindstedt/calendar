// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Germany country pack. German wall calendars start the week on Monday and
// print the Kalenderwoche — the week number is not a business-diary extra
// here, it is how appointments are made ("in KW 32"), so it is on by default.
//
// Two things about this pack are worth reading before changing it.
//
// **The holidays are federal, the calendar is not.** Only nine days are
// bundeseinheitlich; the rest are each Land's own, and this app has one pack
// per country with no sub-region. So a Land holiday is *named* and neither
// red nor off: a calendar in Bavaria prints Fronleichnam, and marking it off
// for the whole country would have the vacation planner hand a Hamburger a
// day nobody gave them. A reader in a Land that keeps one takes it as a
// normal booked day, which is the safe direction to be wrong in.
//
// **There is no name-day table.** Germany has a Namenstag tradition, but it
// is regional and Catholic rather than national — there is no single list a
// German calendar prints the way the Swedish almanac is printed. Adding one
// means picking a diocese's list and saying which; until then this pack is
// like `en-gb.ts` and carries none.

import {
  addToMonthDay,
  easterSunday,
  weekdayOnOrAfter,
} from "@niclaslindstedt/oss-framework/calendar";
import { eveHolidays, type Eve } from "./eves.ts";
import type { HyphenationRules } from "./hyphenate.ts";
import type { NameSpellingRules } from "./nameKey.ts";
import type { Holiday, LocalePack } from "./types.ts";

/** Buß- und Bettag: the Wednesday before 23 November, so always the Wednesday
 *  falling 16–22 November. A Land holiday (Sachsen), named but not off. */
function bussUndBettag(year: number): { month: number; day: number } {
  return weekdayOnOrAfter(year, 11, 16, 3);
}

// The eves German agreements hand back. Neither is a gesetzlicher Feiertag —
// by law both are ordinary working days — but the TVöD and most Tarifverträge
// that follow it give the whole day, which is what `off` says here. A reader
// whose shop stays open until 14:00 says so in Settings.
const EVES: readonly Eve[] = [
  {
    id: "heiligabend",
    name: "Heiligabend",
    date: () => ({ month: 12, day: 24 }),
    collective: "off",
  },
  {
    id: "silvester",
    name: "Silvester",
    date: () => ({ month: 12, day: 31 }),
    collective: "off",
  },
];

// The German holidays for a year: the nine bundeseinheitliche Feiertage as
// red days, the two high Sundays a calendar names anyway, the Land holidays
// as names only (see the header), and the eves above.
function holidays(year: number): readonly Holiday[] {
  const easter = easterSunday(year);
  const chain = (offset: number, name: string, red = true): Holiday => ({
    ...addToMonthDay(year, easter.month, easter.day, offset),
    name,
    red,
    off: red,
  });
  return [
    { month: 1, day: 1, name: "Neujahr", red: true, off: true },
    // Named on every German calendar; a Feiertag only in BW, BY and ST.
    { month: 1, day: 6, name: "Heilige Drei Könige", red: false, off: false },
    {
      month: 3,
      day: 8,
      name: "Internationaler Frauentag",
      red: false,
      off: false,
    },
    chain(-2, "Karfreitag"),
    chain(0, "Ostersonntag"),
    chain(1, "Ostermontag"),
    { month: 5, day: 1, name: "Tag der Arbeit", red: true, off: true },
    chain(39, "Christi Himmelfahrt"),
    chain(49, "Pfingstsonntag"),
    chain(50, "Pfingstmontag"),
    chain(60, "Fronleichnam", false),
    { month: 8, day: 15, name: "Mariä Himmelfahrt", red: false, off: false },
    {
      month: 10,
      day: 3,
      name: "Tag der Deutschen Einheit",
      red: true,
      off: true,
    },
    { month: 10, day: 31, name: "Reformationstag", red: false, off: false },
    { month: 11, day: 1, name: "Allerheiligen", red: false, off: false },
    {
      ...bussUndBettag(year),
      name: "Buß- und Bettag",
      red: false,
      off: false,
    },
    { month: 12, day: 25, name: "1. Weihnachtstag", red: true, off: true },
    { month: 12, day: 26, name: "2. Weihnachtstag", red: true, off: true },
    ...eveHolidays(EVES, year),
  ];
}

// German hyphenation. The onset list carries the clusters German spells with
// three and four letters ("sch", "schl", "str"), because a compound like
// "Weihnachtstag" has to break at a boundary a reader recognises. "ck" and
// "ch" travel whole: modern German sets "Zu-cker", never "Zuc-ker".
const hyphenation: HyphenationRules = {
  vowels: "aeiouyäöü",
  diphthongs: ["ai", "au", "äu", "ei", "eu", "ie", "oi", "ui"],
  onsets: [
    "bl",
    "br",
    "dr",
    "fl",
    "fr",
    "gl",
    "gn",
    "gr",
    "kl",
    "kn",
    "kr",
    "kw",
    "pf",
    "pl",
    "pr",
    "qu",
    "sl",
    "sp",
    "st",
    "tr",
    "tw",
    "vl",
    "vr",
    "zw",
    "ch",
    "ck",
    "ph",
    "sch",
    "th",
    "chl",
    "chr",
    "pfl",
    "pfr",
    "phl",
    "phr",
    "spl",
    "spr",
    "str",
    "thr",
  ],
  inseparable: ["ch", "ck", "ph", "th"],
  neverOnset: "x",
  minLeading: 2,
  minTrailing: 2,
};

// German name spelling. The pairs a German list could have picked between:
// "Cäcilia"/"Zäzilia", "Christoph"/"Kristof", "Sophie"/"Sofie",
// "Theodor"/"Teodor", "Meier"/"Maier"/"Mayer". `g` stays hard — German has no
// soft `g`, which is the one rule that differs from Swedish and English.
const nameSpelling: NameSpellingRules = {
  softVowels: "eiyäö",
  softC: "z",
  hardC: "k",
  softensG: false,
  jOnsets: [],
  digraphs: { ch: "k", ck: "k", ph: "f", th: "t", qu: "kv", tz: "z" },
  letters: { v: "f", w: "v", x: "ks", y: "i", ß: "s" },
  fold: { ä: "a", ö: "o", ü: "u", ß: "s" },
};

export const deDE: LocalePack = {
  id: "de-DE",
  label: "Deutschland",
  flag: "\u{1F1E9}\u{1F1EA}",
  bcp47: "de-DE",
  weekStartsOn: 1,
  weekNumbering: "iso",
  // The Kalenderwoche is how Germany schedules; a calendar without it is the
  // odd one out here, not the other way round.
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

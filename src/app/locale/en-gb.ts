// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// United Kingdom country pack. UK wall calendars start the week on Monday,
// use ISO week numbers when they print them at all (business diaries — off
// by default here), mark Sundays red, name the bank holidays, and have no
// name-day tradition.
//
// This file is the template for new country packs: copy it, adjust the
// fields, and register the export in `./index.ts`.

import {
  addToDate,
  easterSunday,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
  weekdayOf,
} from "./computus.ts";
import type { HyphenationRules } from "./hyphenate.ts";
import type { Holiday, LocalePack } from "./types.ts";

// England & Wales bank holidays. Fixed-date holidays falling on a weekend
// are observed on a substitute weekday (Christmas/Boxing Day roll to the
// next Monday + Tuesday; New Year's Day to the next Monday). Bank holidays
// are named on the calendar but — unlike Swedish red days — UK calendars
// keep only Sundays red, so `red` stays false.
function holidays(year: number): readonly Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [];

  const newYear = { month: 1, day: 1 };
  const nyWeekday = weekdayOf(year, 1, 1);
  if (nyWeekday === 6 || nyWeekday === 0) {
    list.push({
      ...addToDate(year, 1, 1, nyWeekday === 6 ? 2 : 1),
      name: "New Year's Day (substitute)",
      red: false,
      off: true,
    });
  } else {
    list.push({ ...newYear, name: "New Year's Day", red: false, off: true });
  }

  list.push(
    {
      ...addToDate(year, easter.month, easter.day, -2),
      name: "Good Friday",
      red: false,
      off: true,
    },
    {
      ...addToDate(year, easter.month, easter.day, 1),
      name: "Easter Monday",
      red: false,
      off: true,
    },
    {
      ...nthWeekdayOfMonth(year, 5, 1, 1),
      name: "Early May bank holiday",
      red: false,
      off: true,
    },
    {
      ...lastWeekdayOfMonth(year, 5, 1),
      name: "Spring bank holiday",
      red: false,
      off: true,
    },
    {
      ...lastWeekdayOfMonth(year, 8, 1),
      name: "Summer bank holiday",
      red: false,
      off: true,
    },
  );

  // Christmas Day + Boxing Day, with weekend substitutes: whichever of the
  // two lands on a weekend rolls onto the next free weekday(s).
  const xmasWeekday = weekdayOf(year, 12, 25);
  if (xmasWeekday === 5) {
    // Fri 25 + Sat 26 → Boxing Day substitute Monday 28.
    list.push(
      { month: 12, day: 25, name: "Christmas Day", red: false, off: true },
      {
        month: 12,
        day: 28,
        name: "Boxing Day (substitute)",
        red: false,
        off: true,
      },
    );
  } else if (xmasWeekday === 6) {
    // Sat 25 + Sun 26 → substitutes Monday 27 + Tuesday 28.
    list.push(
      {
        month: 12,
        day: 27,
        name: "Christmas Day (substitute)",
        red: false,
        off: true,
      },
      {
        month: 12,
        day: 28,
        name: "Boxing Day (substitute)",
        red: false,
        off: true,
      },
    );
  } else if (xmasWeekday === 0) {
    // Sun 25 → Boxing Day Monday 26, Christmas substitute Tuesday 27.
    list.push(
      { month: 12, day: 26, name: "Boxing Day", red: false, off: true },
      {
        month: 12,
        day: 27,
        name: "Christmas Day (substitute)",
        red: false,
        off: true,
      },
    );
  } else {
    list.push(
      { month: 12, day: 25, name: "Christmas Day", red: false, off: true },
      { month: 12, day: 26, name: "Boxing Day", red: false, off: true },
    );
  }

  return list;
}

// English hyphenation. The vowel-pair list is longer than Swedish because
// English spells most of its long vowels with digraphs ("Easter", "Boxing"),
// and splitting those would read as a misspelling.
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

export const enGB: LocalePack = {
  id: "en-GB",
  label: "United Kingdom",
  bcp47: "en-GB",
  weekStartsOn: 1,
  weekNumbering: "iso",
  showWeekNumbersDefault: false,
  showNameDaysDefault: false,
  redWeekdays: [0],
  restWeekdays: [0, 6],
  hyphenation,
  nameDays: null,
  holidays,
};

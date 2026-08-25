// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// France country pack. French wall calendars start the week on Monday, mark
// Sundays red, and name the eleven jours fériés. Week numbers are a working
// habit rather than something the almanac prints, so they ship off and the
// reader turns them on.
//
// **There is no name-day table yet, and that is a gap rather than a
// decision.** The fête du jour is printed on every French calendar and is the
// reason a French reader would want this app — but it is a specific list (the
// calendrier des postes' sanctoral), and the sources reachable when this pack
// was written disagreed with each other on enough days that shipping one
// would have meant shipping days that are wrong. A pack carries `null` rather
// than a table that is nearly right; fill this in from one named almanac,
// whole, the way `sv-se.ts` and `fi-fi.ts` carry theirs.
//
// What France *does* have that this app already answers is the pont: a jour
// férié on a Tuesday or a Thursday is a four-day weekend for one booked day,
// which is exactly the arithmetic the vacation planner does.

import { addToDate, easterSunday } from "./computus.ts";
import type { HyphenationRules } from "./hyphenate.ts";
import type { NameSpellingRules } from "./nameKey.ts";
import type { Holiday, LocalePack } from "./types.ts";

// The French holidays for a year: the eleven jours fériés as red days, the
// two high Sundays a calendar names anyway, and the two days that are férié
// only in Alsace-Moselle — named, and neither red nor off, for the same
// reason the German pack treats its Land holidays that way.
function holidays(year: number): readonly Holiday[] {
  const easter = easterSunday(year);
  const chain = (offset: number, name: string, red = true): Holiday => ({
    ...addToDate(year, easter.month, easter.day, offset),
    name,
    red,
    off: red,
  });
  return [
    { month: 1, day: 1, name: "Jour de l'An", red: true, off: true },
    chain(-2, "Vendredi saint", false),
    chain(0, "Pâques"),
    chain(1, "Lundi de Pâques"),
    { month: 5, day: 1, name: "Fête du Travail", red: true, off: true },
    { month: 5, day: 8, name: "Victoire 1945", red: true, off: true },
    chain(39, "Ascension"),
    chain(49, "Pentecôte"),
    chain(50, "Lundi de Pentecôte"),
    { month: 7, day: 14, name: "Fête nationale", red: true, off: true },
    { month: 8, day: 15, name: "Assomption", red: true, off: true },
    { month: 11, day: 1, name: "Toussaint", red: true, off: true },
    { month: 11, day: 11, name: "Armistice 1918", red: true, off: true },
    { month: 12, day: 25, name: "Noël", red: true, off: true },
    { month: 12, day: 26, name: "Saint-Étienne", red: false, off: false },
  ];
}

// French hyphenation. `ch`, `ph` and `th` each spell one sound and travel to
// the next syllable whole ("Chris-tophe"), and the vowel pairs are long
// because French writes most of its vowels with two letters — splitting "eau"
// or "oi" would read as a misspelling.
const hyphenation: HyphenationRules = {
  vowels: "aeiouyàâéèêëîïôöùûü",
  diphthongs: [
    "ai",
    "au",
    "ay",
    "ea",
    "eau",
    "ei",
    "eu",
    "ey",
    "ie",
    "oe",
    "oi",
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
    "fl",
    "fr",
    "gl",
    "gn",
    "gr",
    "pl",
    "pr",
    "tr",
    "vr",
    "ch",
    "ph",
    "th",
    "qu",
    "chr",
    "phl",
    "phr",
    "thr",
  ],
  inseparable: ["ch", "ph", "th", "gn"],
  neverOnset: "x",
  minLeading: 2,
  minTrailing: 3,
};

// French name spelling. The variant pairs a French list chooses between:
// "Sophie"/"Sofie", "Catherine"/"Katherine", "Cécile" sounding its `c` twice
// over, "Théo"/"Téo", "Yvon"/"Ivon".
const nameSpelling: NameSpellingRules = {
  softVowels: "eiy",
  softC: "s",
  hardC: "k",
  softensG: true,
  jOnsets: [],
  digraphs: { ch: "s", ph: "f", th: "t", qu: "k", gu: "g" },
  letters: { w: "v", x: "ks", y: "i", z: "s", ç: "s" },
  fold: {
    à: "a",
    â: "a",
    é: "e",
    è: "e",
    ê: "e",
    ë: "e",
    î: "i",
    ï: "i",
    ô: "o",
    ö: "o",
    ù: "u",
    û: "u",
    ü: "u",
    ÿ: "i",
    œ: "e",
    æ: "e",
  },
};

export const frFR: LocalePack = {
  id: "fr-FR",
  label: "France",
  flag: "\u{1F1EB}\u{1F1F7}",
  bcp47: "fr-FR",
  weekStartsOn: 1,
  weekNumbering: "iso",
  showWeekNumbersDefault: false,
  showNameDaysDefault: false,
  redWeekdays: [0],
  restWeekdays: [0, 6],
  hyphenation,
  nameSpelling,
  nameDays: null,
  holidays,
  // France names no holiday eve the way the Nordics do: the 24th and the 31st
  // are ordinary working days and no agreement hands them back as a class.
  // The French institution is the pont, and the vacation planner is where
  // that gets answered.
  eves: [],
};

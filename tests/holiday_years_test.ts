// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Five-year verification of the holiday rule engine against externally
// published calendars — the engine computes from rules, these tables came
// from the sources below, and every date must agree.
//
// Sweden (all 13 röda dagar per year):
//   https://kalender.se/helgdagar/2027/  https://kalender.se/helgdagar/2028/
//   https://kalender.se/helgdagar/2029/  https://www.rodadagarna.se/roda-dagar-2030/
// United Kingdom (England & Wales bank holidays incl. substitute days):
//   https://www.gov.uk/bank-holidays (published through 2027; 2028–2030
//   follow the same statutory pattern the engine implements).
//
// The five packs added after those two are checked the same way but on the
// dates that are *computed* rather than fixed — the ones a rule can get
// wrong. A fixed date needs no five-year table to prove it: 3 October is
// 3 October. What moves is the Easter chain, "the Wednesday before 23
// November", "the Saturday between 20 and 26 June", and the one rule that
// depends on the weekday a fixed date lands on (Koningsdag).

import { describe, expect, it } from "vitest";

import { getLocale, holidayFor } from "../src/app/locale/index.ts";

const sv = getLocale("sv-SE");
const en = getLocale("en-GB");
const de = getLocale("de-DE");
const fr = getLocale("fr-FR");
const nl = getLocale("nl-NL");
const fi = getLocale("fi-FI");
const nb = getLocale("nb-NO");

// [year, month, day, name] — the thirteen official Swedish red days for each
// of the next five years, as published.
const SWEDISH_RED_DAYS: ReadonlyArray<
  readonly [number, number, number, string]
> = [
  // 2026
  [2026, 1, 1, "Nyårsdagen"],
  [2026, 1, 6, "Trettondedag jul"],
  [2026, 4, 3, "Långfredagen"],
  [2026, 4, 5, "Påskdagen"],
  [2026, 4, 6, "Annandag påsk"],
  [2026, 5, 1, "Första maj"],
  [2026, 5, 14, "Kristi himmelsfärdsdag"],
  [2026, 5, 24, "Pingstdagen"],
  [2026, 6, 6, "Sveriges nationaldag"],
  [2026, 6, 20, "Midsommardagen"],
  [2026, 10, 31, "Alla helgons dag"],
  [2026, 12, 25, "Juldagen"],
  [2026, 12, 26, "Annandag jul"],
  // 2027
  [2027, 1, 1, "Nyårsdagen"],
  [2027, 1, 6, "Trettondedag jul"],
  [2027, 3, 26, "Långfredagen"],
  [2027, 3, 28, "Påskdagen"],
  [2027, 3, 29, "Annandag påsk"],
  [2027, 5, 1, "Första maj"],
  [2027, 5, 6, "Kristi himmelsfärdsdag"],
  [2027, 5, 16, "Pingstdagen"],
  [2027, 6, 6, "Sveriges nationaldag"],
  [2027, 6, 26, "Midsommardagen"],
  [2027, 11, 6, "Alla helgons dag"],
  [2027, 12, 25, "Juldagen"],
  [2027, 12, 26, "Annandag jul"],
  // 2028
  [2028, 1, 1, "Nyårsdagen"],
  [2028, 1, 6, "Trettondedag jul"],
  [2028, 4, 14, "Långfredagen"],
  [2028, 4, 16, "Påskdagen"],
  [2028, 4, 17, "Annandag påsk"],
  [2028, 5, 1, "Första maj"],
  [2028, 5, 25, "Kristi himmelsfärdsdag"],
  [2028, 6, 4, "Pingstdagen"],
  [2028, 6, 6, "Sveriges nationaldag"],
  [2028, 6, 24, "Midsommardagen"],
  [2028, 11, 4, "Alla helgons dag"],
  [2028, 12, 25, "Juldagen"],
  [2028, 12, 26, "Annandag jul"],
  // 2029
  [2029, 1, 1, "Nyårsdagen"],
  [2029, 1, 6, "Trettondedag jul"],
  [2029, 3, 30, "Långfredagen"],
  [2029, 4, 1, "Påskdagen"],
  [2029, 4, 2, "Annandag påsk"],
  [2029, 5, 1, "Första maj"],
  [2029, 5, 10, "Kristi himmelsfärdsdag"],
  [2029, 5, 20, "Pingstdagen"],
  [2029, 6, 6, "Sveriges nationaldag"],
  [2029, 6, 23, "Midsommardagen"],
  [2029, 11, 3, "Alla helgons dag"],
  [2029, 12, 25, "Juldagen"],
  [2029, 12, 26, "Annandag jul"],
  // 2030
  [2030, 1, 1, "Nyårsdagen"],
  [2030, 1, 6, "Trettondedag jul"],
  [2030, 4, 19, "Långfredagen"],
  [2030, 4, 21, "Påskdagen"],
  [2030, 4, 22, "Annandag påsk"],
  [2030, 5, 1, "Första maj"],
  [2030, 5, 30, "Kristi himmelsfärdsdag"],
  [2030, 6, 9, "Pingstdagen"],
  [2030, 6, 6, "Sveriges nationaldag"],
  [2030, 6, 22, "Midsommardagen"],
  [2030, 11, 2, "Alla helgons dag"],
  [2030, 12, 25, "Juldagen"],
  [2030, 12, 26, "Annandag jul"],
];

// The eves every Swedish wall calendar names (not red by law). Midsommarafton
// is always the Friday before Midsommardagen.
const SWEDISH_EVES: ReadonlyArray<readonly [number, number, number, string]> = [
  [2026, 6, 19, "Midsommarafton"],
  [2027, 6, 25, "Midsommarafton"],
  [2028, 6, 23, "Midsommarafton"],
  [2029, 6, 22, "Midsommarafton"],
  [2030, 6, 21, "Midsommarafton"],
  [2026, 12, 24, "Julafton"],
  [2030, 12, 24, "Julafton"],
  [2026, 12, 31, "Nyårsafton"],
  [2030, 12, 31, "Nyårsafton"],
];

// England & Wales bank holidays. 2026–2027 as published on gov.uk
// (including the substitute days); 2028–2030 from the same statutory rules.
const UK_BANK_HOLIDAYS: ReadonlyArray<
  readonly [number, number, number, string]
> = [
  // 2026 (gov.uk)
  [2026, 1, 1, "New Year's Day"],
  [2026, 4, 3, "Good Friday"],
  [2026, 4, 6, "Easter Monday"],
  [2026, 5, 4, "Early May bank holiday"],
  [2026, 5, 25, "Spring bank holiday"],
  [2026, 8, 31, "Summer bank holiday"],
  [2026, 12, 25, "Christmas Day"],
  [2026, 12, 28, "Boxing Day (substitute)"],
  // 2027 (gov.uk)
  [2027, 1, 1, "New Year's Day"],
  [2027, 3, 26, "Good Friday"],
  [2027, 3, 29, "Easter Monday"],
  [2027, 5, 3, "Early May bank holiday"],
  [2027, 5, 31, "Spring bank holiday"],
  [2027, 8, 30, "Summer bank holiday"],
  [2027, 12, 27, "Christmas Day (substitute)"],
  [2027, 12, 28, "Boxing Day (substitute)"],
  // 2028 (1 Jan is a Saturday → substitute Monday 3 Jan)
  [2028, 1, 3, "New Year's Day (substitute)"],
  [2028, 4, 14, "Good Friday"],
  [2028, 4, 17, "Easter Monday"],
  [2028, 5, 1, "Early May bank holiday"],
  [2028, 5, 29, "Spring bank holiday"],
  [2028, 8, 28, "Summer bank holiday"],
  [2028, 12, 25, "Christmas Day"],
  [2028, 12, 26, "Boxing Day"],
  // 2029
  [2029, 1, 1, "New Year's Day"],
  [2029, 3, 30, "Good Friday"],
  [2029, 4, 2, "Easter Monday"],
  [2029, 5, 7, "Early May bank holiday"],
  [2029, 5, 28, "Spring bank holiday"],
  [2029, 8, 27, "Summer bank holiday"],
  [2029, 12, 25, "Christmas Day"],
  [2029, 12, 26, "Boxing Day"],
  // 2030
  [2030, 1, 1, "New Year's Day"],
  [2030, 4, 19, "Good Friday"],
  [2030, 4, 22, "Easter Monday"],
  [2030, 5, 6, "Early May bank holiday"],
  [2030, 5, 27, "Spring bank holiday"],
  [2030, 8, 26, "Summer bank holiday"],
  [2030, 12, 25, "Christmas Day"],
  [2030, 12, 26, "Boxing Day"],
];

describe("Swedish red days 2026–2030 (published calendars)", () => {
  it.each(SWEDISH_RED_DAYS)("%i-%i-%i is %s", (year, month, day, name) => {
    const holiday = holidayFor(sv, year, month, day);
    expect(holiday?.name).toBe(name);
    expect(holiday?.red).toBe(true);
  });

  it("produces exactly thirteen red days every year", () => {
    for (let year = 2026; year <= 2030; year++) {
      const red = sv.holidays(year).filter((h) => h.red);
      expect(red.length, String(year)).toBe(13);
    }
  });

  it.each(SWEDISH_EVES)(
    "%i-%i-%i is %s (named, not red)",
    (year, month, day, name) => {
      const holiday = holidayFor(sv, year, month, day);
      expect(holiday?.name).toBe(name);
      expect(holiday?.red).toBe(false);
    },
  );
});

describe("UK bank holidays 2026–2030 (gov.uk pattern)", () => {
  it.each(UK_BANK_HOLIDAYS)("%i-%i-%i is %s", (year, month, day, name) => {
    expect(holidayFor(en, year, month, day)?.name).toBe(name);
  });

  it("produces exactly eight bank holidays every year", () => {
    for (let year = 2026; year <= 2030; year++) {
      expect(en.holidays(year).length, String(year)).toBe(8);
    }
  });

  it("has no phantom holiday on the displaced weekend days", () => {
    // 2028: New Year fell on Saturday 1 Jan — the 1st itself carries nothing.
    expect(holidayFor(en, 2028, 1, 1)).toBeNull();
    // 2027: Christmas fell on Saturday 25 Dec — the 25th itself carries
    // nothing (the substitute Monday does).
    expect(holidayFor(en, 2027, 12, 25)).toBeNull();
  });
});

// --- the packs whose dates are computed rather than fixed --------------------

/** [year, month, day] the rule must produce. */
type Occurrence = readonly [number, number, number];

/** Every listed year names the holiday on the listed day, and on no other. */
function checksOut(
  pack: ReturnType<typeof getLocale>,
  name: string,
  occurrences: readonly Occurrence[],
) {
  for (const [year, month, day] of occurrences) {
    const key = `${name} ${year}`;
    expect([key, holidayFor(pack, year, month, day)?.name]).toEqual([
      key,
      name,
    ]);
    // And the rule fired exactly once that year — a rule that returned two
    // dates would still pass the lookup above.
    const hits = pack.holidays(year).filter((h) => h.name === name);
    expect([key, hits.length]).toEqual([key, 1]);
  }
}

describe("German holidays 2025–2030", () => {
  it("puts Buß- und Bettag on the Wednesday before 23 November", () => {
    checksOut(de, "Buß- und Bettag", [
      [2025, 11, 19],
      [2026, 11, 18],
      [2027, 11, 17],
      [2028, 11, 22],
      [2029, 11, 21],
      [2030, 11, 20],
    ]);
  });

  it("walks the Easter chain to Fronleichnam", () => {
    checksOut(de, "Fronleichnam", [
      [2025, 6, 19],
      [2026, 6, 4],
      [2027, 5, 27],
      [2028, 6, 15],
      [2029, 5, 31],
      [2030, 6, 20],
    ]);
  });

  it("keeps the nine bundeseinheitliche Feiertage off every year", () => {
    // Nine federal holidays plus the two eves the Tarifverträge give back.
    // The Land holidays are named and neither red nor off, which is what
    // keeps this number steady while the calendar names sixteen things.
    for (let year = 2025; year <= 2030; year++) {
      const off = de.holidays(year).filter((h) => h.off);
      expect(off.length, String(year)).toBe(13);
    }
  });

  it("names the Land holidays without giving them away", () => {
    for (const name of [
      "Heilige Drei Könige",
      "Fronleichnam",
      "Mariä Himmelfahrt",
      "Reformationstag",
      "Allerheiligen",
      "Buß- und Bettag",
    ]) {
      const found = de.holidays(2026).find((h) => h.name === name);
      expect([name, found?.red, found?.off]).toEqual([name, false, false]);
    }
  });
});

describe("French jours fériés 2025–2030", () => {
  it("walks the Easter chain", () => {
    checksOut(fr, "Ascension", [
      [2025, 5, 29],
      [2026, 5, 14],
      [2027, 5, 6],
      [2028, 5, 25],
      [2029, 5, 10],
      [2030, 5, 30],
    ]);
    checksOut(fr, "Lundi de Pentecôte", [
      [2025, 6, 9],
      [2026, 5, 25],
      [2027, 5, 17],
      [2028, 6, 5],
      [2029, 5, 21],
      [2030, 6, 10],
    ]);
  });

  it("names the two Alsace-Moselle days without giving them away", () => {
    for (const name of ["Vendredi saint", "Saint-Étienne"]) {
      const found = fr.holidays(2026).find((h) => h.name === name);
      expect([name, found?.red, found?.off]).toEqual([name, false, false]);
    }
  });

  it("keeps the eleven jours fériés off every year", () => {
    // Thirteen red entries: the eleven jours fériés plus Pâques and Pentecôte,
    // which are Sundays the calendar names anyway.
    for (let year = 2025; year <= 2030; year++) {
      const off = fr.holidays(year).filter((h) => h.off);
      expect(off.length, String(year)).toBe(13);
    }
  });
});

describe("Dutch feestdagen 2025–2030", () => {
  it("moves Koningsdag off a Sunday and leaves it alone otherwise", () => {
    // 27 April 2025 was a Sunday, so the King's birthday was kept on the
    // Saturday. It falls on a weekday in every other year here.
    checksOut(nl, "Koningsdag", [
      [2025, 4, 26],
      [2026, 4, 27],
      [2027, 4, 27],
      [2028, 4, 27],
      [2029, 4, 27],
      [2030, 4, 27],
    ]);
  });

  it("prints Goede Vrijdag and Bevrijdingsdag red without giving them away", () => {
    // The Netherlands has no statutory right to a day off on a feestdag, and
    // most cao's work both of these — so the calendar names them in red and
    // the vacation planner does not count them.
    for (const name of ["Goede Vrijdag", "Bevrijdingsdag"]) {
      const found = nl.holidays(2026).find((h) => h.name === name);
      expect([name, found?.red, found?.off]).toEqual([name, true, false]);
    }
  });

  it("keeps the nine days people are actually off steady", () => {
    for (let year = 2025; year <= 2030; year++) {
      const off = nl.holidays(year).filter((h) => h.off);
      expect(off.length, String(year)).toBe(9);
    }
  });
});

describe("Finnish pyhäpäivät 2025–2030", () => {
  it("puts juhannus on the Saturday between 20 and 26 June", () => {
    checksOut(fi, "Juhannuspäivä", [
      [2025, 6, 21],
      [2026, 6, 20],
      [2027, 6, 26],
      [2028, 6, 24],
      [2029, 6, 23],
      [2030, 6, 22],
    ]);
    // And the eve is the Friday before it, whichever Saturday that was.
    checksOut(fi, "Juhannusaatto", [
      [2025, 6, 20],
      [2026, 6, 19],
      [2027, 6, 25],
      [2028, 6, 23],
      [2029, 6, 22],
      [2030, 6, 21],
    ]);
  });

  it("puts pyhäinpäivä on the Saturday between 31 Oct and 6 Nov", () => {
    checksOut(fi, "Pyhäinpäivä", [
      [2025, 11, 1],
      [2026, 10, 31],
      [2027, 11, 6],
      [2028, 11, 4],
      [2029, 11, 3],
      [2030, 11, 2],
    ]);
  });

  it("produces exactly thirteen red days every year", () => {
    for (let year = 2025; year <= 2030; year++) {
      const red = fi.holidays(year).filter((h) => h.red);
      expect(red.length, String(year)).toBe(13);
    }
  });
});

describe("Norwegian røde dager 2025–2030", () => {
  it("makes Skjærtorsdag red, unlike the Swedish pack next door", () => {
    checksOut(nb, "Skjærtorsdag", [
      [2025, 4, 17],
      [2026, 4, 2],
      [2027, 3, 25],
      [2028, 4, 13],
      [2029, 3, 29],
      [2030, 4, 18],
    ]);
    for (let year = 2025; year <= 2030; year++) {
      const day = nb.holidays(year).find((h) => h.name === "Skjærtorsdag");
      expect([year, day?.red, day?.off]).toEqual([year, true, true]);
      // Sweden works that Thursday and calls it Skärtorsdagen.
      expect([year, holidayFor(sv, year, day!.month, day!.day)?.red]).toEqual([
        year,
        false,
      ]);
    }
  });

  it("produces exactly twelve red days every year", () => {
    for (let year = 2025; year <= 2030; year++) {
      const red = nb.holidays(year).filter((h) => h.red);
      expect(red.length, String(year)).toBe(12);
    }
  });
});

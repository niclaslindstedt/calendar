// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  addDays,
  isoWeek,
  toDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import {
  FALLBACK_LOCALE_ID,
  LOCALES,
  dayMonth,
  dayMonthYear,
  getLocale,
  matchLocaleId,
  isRedWeekday,
  monthName,
  nameDaysFor,
  weekNumber,
  weekdayName,
  weekdayOrder,
} from "../src/app/locale/index.ts";

const sv = getLocale("sv-SE");
const en = getLocale("en-GB");
const de = getLocale("de-DE");
const fr = getLocale("fr-FR");
const nl = getLocale("nl-NL");
const fi = getLocale("fi-FI");
const nb = getLocale("nb-NO");
const us = getLocale("en-US");

/** The days of each month, February at its leap length — the shape a
 *  name-day table has to cover. */
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** `"MM-DD"` for every day a name-day table could carry. */
function everyDay(): string[] {
  const keys: string[] = [];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= MONTH_LENGTHS[month - 1]; day++) {
      keys.push(
        `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
    }
  }
  return keys;
}

describe("locale registry", () => {
  it("resolves known packs and falls back for unknown ids", () => {
    expect(getLocale("sv-SE").id).toBe("sv-SE");
    expect(getLocale("nope").id).toBe(FALLBACK_LOCALE_ID);
  });

  it("every pack carries a flag for the picker", () => {
    for (const pack of LOCALES) {
      // A regional-indicator pair — what every platform draws as a flag.
      expect(pack.flag).toMatch(/^[\u{1F1E6}-\u{1F1FF}]{2}$/u);
    }
  });

  it("every pack declares its holiday eves", () => {
    // Part of the pack contract, and an empty list is a real answer (the UK
    // names none) — but it has to be *declared*, or the settings section and
    // the vacation planner both read `undefined`.
    for (const pack of LOCALES) {
      expect(Array.isArray(pack.eves)).toBe(true);
      // Ids are the persisted settings key, so they have to be unique.
      const ids = pack.eves.map((eve) => eve.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every pack carries name-spelling rules", () => {
    // Part of the pack contract, like `hyphenation`: the name-day search
    // folds spellings with these, and a pack that forgot them would quietly
    // match nothing but exact spellings.
    for (const pack of LOCALES) {
      expect(pack.nameSpelling.softVowels.length).toBeGreaterThan(0);
      expect(pack.nameSpelling.hardC).toBeTruthy();
      expect(pack.nameSpelling.softC).toBeTruthy();
    }
  });

  it("packs have unique ids", () => {
    const ids = LOCALES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("matching the device's locale", () => {
  it("takes an exact pack id", () => {
    expect(matchLocaleId(["sv-SE"])).toBe("sv-SE");
    expect(matchLocaleId(["en-GB"])).toBe("en-GB");
  });

  it("matches on country before language", () => {
    // An English-speaking resident of Sweden gets the Swedish calendar.
    expect(matchLocaleId(["en-SE"])).toBe("sv-SE");
    // And the rule bites where the two genuinely pull apart: a
    // Swedish-speaking Finn is in Finland, and it is Finland's red days and
    // Finland's almanac they are living by.
    expect(matchLocaleId(["sv-FI"])).toBe("fi-FI");
    // Norwegian asks under two language tags; both land on the same pack.
    expect(matchLocaleId(["no-NO"])).toBe("nb-NO");
    expect(matchLocaleId(["nb-NO"])).toBe("nb-NO");
  });

  it("matches a bare language tag", () => {
    expect(matchLocaleId(["sv"])).toBe("sv-SE");
    // Two packs speak English; a bare `en` says nothing about which country,
    // and it stays on the pack it always had.
    expect(matchLocaleId(["en"])).toBe("en-GB");
  });

  it("gives an American device the American calendar", () => {
    // What an iPhone set up in the US reports, and what the UK pack used to
    // catch by language — Monday weeks and bank holidays for an American.
    expect(matchLocaleId(["en-US"])).toBe("en-US");
    expect(matchLocaleId(["en-US", "en"])).toBe("en-US");
    // The region decides, whatever the language: a Spanish-speaking
    // American lives by the federal holidays too.
    expect(matchLocaleId(["es-US"])).toBe("en-US");
    expect(matchLocaleId(["zh-Hant-US"])).toBe("en-US");
    // An American abroad asks by region too, and gets that region's pack.
    expect(matchLocaleId(["en-SE"])).toBe("sv-SE");
  });

  it("falls back to the language pack for an unknown country", () => {
    // English-speaking countries without a pack of their own keep the UK's.
    expect(matchLocaleId(["en-AU"])).toBe("en-GB");
    expect(matchLocaleId(["en-IE"])).toBe("en-GB");
    expect(matchLocaleId(["sv-DK"])).toBe("sv-SE");
    // German-speaking Austria and Switzerland have no pack of their own, so
    // they get the German calendar rather than the English one.
    expect(matchLocaleId(["de-AT"])).toBe("de-DE");
    expect(matchLocaleId(["de-CH"])).toBe("de-DE");
    // Belgium speaks two of the app's languages and is neither pack's
    // country; whichever the device asks for first decides.
    expect(matchLocaleId(["nl-BE"])).toBe("nl-NL");
    expect(matchLocaleId(["fr-BE"])).toBe("fr-FR");
  });

  it("honours the preference order and ignores script subtags", () => {
    expect(matchLocaleId(["sv-SE", "en-GB"])).toBe("sv-SE");
    expect(matchLocaleId(["es-ES", "sv-SE"])).toBe("sv-SE");
    expect(matchLocaleId(["de-DE", "sv-SE"])).toBe("de-DE");
    expect(matchLocaleId(["sr-Latn-SE"])).toBe("sv-SE");
  });

  it("falls back when nothing matches", () => {
    expect(matchLocaleId([])).toBe(FALLBACK_LOCALE_ID);
    expect(matchLocaleId(["es-ES", "pt-PT"])).toBe(FALLBACK_LOCALE_ID);
    expect(matchLocaleId(["", "  "])).toBe(FALLBACK_LOCALE_ID);
  });
});

describe("week conventions", () => {
  it("every European country starts the week on Monday", () => {
    // Worth asserting rather than assuming: the day list's column count and
    // the month grid's template both read this.
    for (const pack of LOCALES.filter((p) => p !== us)) {
      expect([pack.id, pack.weekStartsOn]).toEqual([pack.id, 1]);
    }
    expect(weekdayOrder(sv)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("an American week starts on Sunday", () => {
    expect(us.weekStartsOn).toBe(0);
    expect(weekdayOrder(us)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekdayName(us, weekdayOrder(us)[0], "short")).toBe("Sun");
  });

  it("week numbers ship on where the country schedules by them", () => {
    // Sweden's veckonummer, Germany's Kalenderwoche, the Dutch weeknummer,
    // Finland's viikko and Norway's uke are all how appointments get made.
    // The UK prints them in business diaries only, and a French almanac sets
    // saints rather than weeks — so those two ship off.
    for (const pack of [sv, de, nl, fi, nb]) {
      expect([pack.id, pack.showWeekNumbersDefault]).toEqual([pack.id, true]);
    }
    // An American wall calendar does not print them either.
    for (const pack of [en, fr, us]) {
      expect([pack.id, pack.showWeekNumbersDefault]).toEqual([pack.id, false]);
    }
  });

  it("Sundays are red, and nothing else is, in every pack", () => {
    for (const pack of LOCALES) {
      expect([pack.id, [...pack.redWeekdays]]).toEqual([pack.id, [0]]);
      expect([pack.id, [...pack.restWeekdays]]).toEqual([pack.id, [0, 6]]);
    }
    expect(isRedWeekday(sv, 0)).toBe(true);
    expect(isRedWeekday(sv, 1)).toBe(false);
  });
});

describe("Finnish name days", () => {
  it("knows the days the almanac is known for", () => {
    expect(nameDaysFor(fi, 1, 13)).toEqual(["Nuutti"]);
    expect(nameDaysFor(fi, 5, 1)).toEqual(["Vappu", "Valpuri"]);
    expect(nameDaysFor(fi, 12, 26)).toEqual(["Tapani", "Teppo", "Tahvo"]);
    expect(nameDaysFor(fi, 12, 24)).toContain("Eeva");
    expect(nameDaysFor(fi, 6, 24)).toContain("Johannes");
  });

  it("carries the whole official list, not a trimmed one", () => {
    // The point of keeping every name: the search and the contacts matching
    // read this table, so a trimmed one would make most Finnish names
    // unfindable. Midsummer alone celebrates nine.
    expect(nameDaysFor(fi, 6, 24).length).toBeGreaterThan(5);
    const names = new Set(Object.values(fi.nameDays ?? {}).flat());
    expect(names.size).toBeGreaterThan(900);
  });

  it("leaves nameless exactly the three days the almanac does", () => {
    const nameless = new Set(["01-01", "02-29", "12-25"]);
    for (const key of everyDay()) {
      const [month, day] = key.split("-").map(Number);
      const names = nameDaysFor(fi, month, day);
      if (nameless.has(key)) expect(names, key).toEqual([]);
      else expect(names.length, key).toBeGreaterThan(0);
    }
  });
});

describe("Norwegian name days", () => {
  it("knows the days the calendar is known for", () => {
    expect(nameDaysFor(nb, 12, 24)).toEqual(["Adam", "Eva"]);
    expect(nameDaysFor(nb, 5, 17)).toEqual(["Harald", "Ragnhild"]);
    expect(nameDaysFor(nb, 12, 4)).toEqual(["Barbara", "Barbro"]);
    expect(nameDaysFor(nb, 11, 11)).toContain("Morten");
  });

  it("prints two or three names a day, the way the calendar does", () => {
    for (const [key, names] of Object.entries(nb.nameDays ?? {})) {
      expect([key, names.length >= 2 && names.length <= 4]).toEqual([
        key,
        true,
      ]);
    }
  });

  it("leaves nameless exactly the three days the calendar does", () => {
    const nameless = new Set(["01-01", "02-29", "12-25"]);
    for (const key of everyDay()) {
      const [month, day] = key.split("-").map(Number);
      const names = nameDaysFor(nb, month, day);
      if (nameless.has(key)) expect(names, key).toEqual([]);
      else expect(names.length, key).toBeGreaterThan(0);
    }
  });
});

describe("packs without a name-day tradition to print", () => {
  it("carry null rather than an empty table", () => {
    // Three different reasons, one answer: the UK and the Netherlands have no
    // tradition at all, Germany's Namenstag is regional rather than national,
    // and France's fête du jour is a specific almanac this pack does not yet
    // carry. What matters downstream is that `nameDays` is null, which is
    // what turns the setting, the search and the contacts tab off.
    for (const pack of [en, us, nl, de, fr]) {
      expect([pack.id, pack.nameDays]).toEqual([pack.id, null]);
      expect([pack.id, pack.showNameDaysDefault]).toEqual([pack.id, false]);
      expect(nameDaysFor(pack, 1, 13)).toEqual([]);
    }
  });

  it("the packs that do have one turn it on", () => {
    for (const pack of [sv, fi, nb]) {
      expect([pack.id, pack.showNameDaysDefault]).toEqual([pack.id, true]);
      expect(pack.nameDays).not.toBeNull();
    }
  });
});

describe("Swedish name days", () => {
  it("knows the classic days", () => {
    expect(nameDaysFor(sv, 1, 13)).toEqual(["Knut"]);
    expect(nameDaysFor(sv, 12, 13)).toEqual(["Lucia"]);
    expect(nameDaysFor(sv, 5, 18)).toEqual(["Erik"]);
    expect(nameDaysFor(sv, 1, 6)).toEqual(["Kasper", "Melker", "Baltsar"]);
  });

  it("carries the 2022 additions", () => {
    expect(nameDaysFor(sv, 2, 28)).toContain("Maja");
    expect(nameDaysFor(sv, 3, 8)).toContain("Saga");
    expect(nameDaysFor(sv, 4, 6)).toContain("William");
    expect(nameDaysFor(sv, 8, 28)).toEqual(["Fatima", "Leila"]);
    expect(nameDaysFor(sv, 9, 7)).toEqual(["Kevin", "Roy"]);
    expect(nameDaysFor(sv, 11, 2)).toEqual(["Tobias", "Tim"]);
    expect(nameDaysFor(sv, 12, 3)).toEqual(["Lydia", "Cornelia"]);
  });

  it("leaves the nameless days empty", () => {
    for (const [month, day] of [
      [1, 1],
      [2, 2],
      [2, 29],
      [3, 25],
      [6, 24],
      [11, 1],
      [12, 25],
    ]) {
      expect(nameDaysFor(sv, month, day)).toEqual([]);
    }
  });

  it("covers every other day of the year", () => {
    const nameless = new Set([
      "01-01",
      "02-02",
      "03-25",
      "06-24",
      "11-01",
      "12-25",
    ]);
    const lengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= lengths[month - 1]; day++) {
        const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const names = nameDaysFor(sv, month, day);
        if (nameless.has(key) || key === "02-29") {
          expect(names, key).toEqual([]);
        } else {
          expect(names.length, key).toBeGreaterThan(0);
        }
      }
    }
  });

  it("the UK pack has no name days", () => {
    expect(en.nameDays).toBeNull();
    expect(nameDaysFor(en, 1, 13)).toEqual([]);
    expect(en.showNameDaysDefault).toBe(false);
  });
});

describe("Intl-derived names", () => {
  it("renders month names in the pack language", () => {
    expect(monthName(sv, 1).toLowerCase()).toBe("januari");
    expect(monthName(en, 1)).toBe("January");
  });

  it("renders weekday names in the pack language", () => {
    expect(weekdayName(sv, 1).toLowerCase()).toBe("måndag");
    expect(weekdayName(en, 0)).toBe("Sunday");
    expect(weekdayName(en, 6, "short")).toBe("Sat");
  });
});

describe("week numbering", () => {
  /** Every day from 1 January `from` to 31 December `to`. */
  function* days(from: number, to: number): Generator<string> {
    const end = toDayKey({ year: to, month: 12, day: 31 });
    for (let at = toDayKey({ year: from, month: 1, day: 1 }); at <= end;) {
      yield at;
      at = addDays(at, 1);
    }
  }

  it("is ISO-8601 in every European pack, day for day", () => {
    for (const pack of LOCALES.filter((p) => p.weekNumbering === "iso")) {
      for (const day of days(2019, 2033)) {
        if (weekNumber(pack, day) !== isoWeek(day)) {
          expect([pack.id, day, weekNumber(pack, day)]).toEqual([
            pack.id,
            day,
            isoWeek(day),
          ]);
        }
      }
    }
  });

  it("numbers an American week from the one 1 January is in", () => {
    expect(us.weekNumbering).toBe("us");
    // 1 January 2026 is a Thursday: its Sunday-to-Saturday week is week 1
    // even though four of its days are 2025's, and the Sunday after opens
    // week 2 — which ISO would still call week 1.
    expect(weekNumber(us, "2025-12-28")).toBe(1);
    expect(weekNumber(us, "2026-01-01")).toBe(1);
    expect(weekNumber(us, "2026-01-03")).toBe(1);
    expect(weekNumber(us, "2026-01-04")).toBe(2);
    expect(isoWeek("2026-01-04")).toBe(1);
    // And the last days of December are already next year's week 1.
    expect(weekNumber(us, "2026-12-31")).toBe(1);
    expect(weekNumber(us, "2026-12-26")).toBe(52);
    // 2022 opened on a Saturday, a one-day week 1, so it runs to 53.
    expect(weekNumber(us, "2022-01-01")).toBe(1);
    expect(weekNumber(us, "2022-01-02")).toBe(2);
    expect(weekNumber(us, "2022-12-31")).toBe(53);
    expect(weekNumber(us, "2023-01-01")).toBe(1);
  });

  it("gives every day of a Sunday-to-Saturday row the same number", () => {
    for (const day of days(2024, 2030)) {
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      if (weekday === 0) continue;
      expect([day, weekNumber(us, day)]).toEqual([
        day,
        weekNumber(us, addDays(day, -weekday)),
      ]);
    }
  });

  it("never numbers an American week past 53", () => {
    for (const day of days(2000, 2040)) {
      const n = weekNumber(us, day);
      expect(n >= 1 && n <= 53).toBe(true);
    }
  });
});

describe("how a country writes a date", () => {
  it("puts the month first in the US and after the day everywhere else", () => {
    expect(dayMonth(us, 25, 12)).toBe("Dec 25");
    expect(dayMonth(en, 25, 12)).toBe("25 Dec");
    expect(dayMonth(us, "20–28", 12)).toBe("Dec 20–28");
    expect(dayMonth(us, 8, 8, "long")).toBe("August 8");
  });

  it("writes a whole date the country's way", () => {
    expect(dayMonthYear(us, 8, 8, 2026)).toBe("August 8, 2026");
    expect(dayMonthYear(en, 8, 8, 2026)).toBe("8 August 2026");
  });

  it("leaves every day-first pack exactly as it printed before", () => {
    for (const pack of LOCALES.filter((p) => p !== us)) {
      expect(dayMonth(pack, 8, 8)).toBe(`8 ${monthName(pack, 8, "short")}`);
      expect(dayMonthYear(pack, 8, 8, 2026)).toBe(
        `8 ${monthName(pack, 8)} 2026`,
      );
    }
  });
});

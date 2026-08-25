// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  FALLBACK_LOCALE_ID,
  LOCALES,
  getLocale,
  matchLocaleId,
  isRedWeekday,
  monthName,
  nameDaysFor,
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
    expect(matchLocaleId(["en"])).toBe("en-GB");
  });

  it("falls back to the language pack for an unknown country", () => {
    expect(matchLocaleId(["en-US"])).toBe("en-GB");
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
  it("every shipped country starts the week on Monday", () => {
    // True of all seven, and worth asserting rather than assuming: the pack
    // contract allows any weekday, and the day list's column count and the
    // month grid's template both read this.
    for (const pack of LOCALES) {
      expect([pack.id, pack.weekStartsOn]).toEqual([pack.id, 1]);
    }
    expect(weekdayOrder(sv)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("week numbers ship on where the country schedules by them", () => {
    // Sweden's veckonummer, Germany's Kalenderwoche, the Dutch weeknummer,
    // Finland's viikko and Norway's uke are all how appointments get made.
    // The UK prints them in business diaries only, and a French almanac sets
    // saints rather than weeks — so those two ship off.
    for (const pack of [sv, de, nl, fi, nb]) {
      expect([pack.id, pack.showWeekNumbersDefault]).toEqual([pack.id, true]);
    }
    for (const pack of [en, fr]) {
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
    for (const pack of [en, nl, de, fr]) {
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

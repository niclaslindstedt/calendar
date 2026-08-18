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
  });

  it("matches a bare language tag", () => {
    expect(matchLocaleId(["sv"])).toBe("sv-SE");
    expect(matchLocaleId(["en"])).toBe("en-GB");
  });

  it("falls back to the language pack for an unknown country", () => {
    expect(matchLocaleId(["en-US"])).toBe("en-GB");
    expect(matchLocaleId(["sv-FI"])).toBe("sv-SE");
  });

  it("honours the preference order and ignores script subtags", () => {
    expect(matchLocaleId(["sv-SE", "en-GB"])).toBe("sv-SE");
    expect(matchLocaleId(["de-DE", "sv-SE"])).toBe("sv-SE");
    expect(matchLocaleId(["sr-Latn-SE"])).toBe("sv-SE");
  });

  it("falls back when nothing matches", () => {
    expect(matchLocaleId([])).toBe(FALLBACK_LOCALE_ID);
    expect(matchLocaleId(["de-DE", "fr-FR"])).toBe(FALLBACK_LOCALE_ID);
    expect(matchLocaleId(["", "  "])).toBe(FALLBACK_LOCALE_ID);
  });
});

describe("week conventions", () => {
  it("both countries start the week on Monday", () => {
    expect(sv.weekStartsOn).toBe(1);
    expect(en.weekStartsOn).toBe(1);
    expect(weekdayOrder(sv)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("Sweden shows week numbers by default; the UK does not", () => {
    expect(sv.showWeekNumbersDefault).toBe(true);
    expect(en.showWeekNumbersDefault).toBe(false);
  });

  it("Sundays are red in both packs", () => {
    expect(isRedWeekday(sv, 0)).toBe(true);
    expect(isRedWeekday(en, 0)).toBe(true);
    expect(isRedWeekday(sv, 1)).toBe(false);
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

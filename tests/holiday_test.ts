// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  easterSunday,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
  weekdayOnOrAfter,
} from "../src/app/locale/computus.ts";
import { getLocale, holidayFor, isRedDay } from "../src/app/locale/index.ts";

const sv = getLocale("sv-SE");
const en = getLocale("en-GB");

describe("computus", () => {
  it("computes Easter Sunday across years", () => {
    expect(easterSunday(2024)).toEqual({ month: 3, day: 31 });
    expect(easterSunday(2025)).toEqual({ month: 4, day: 20 });
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
    expect(easterSunday(2038)).toEqual({ month: 4, day: 25 }); // latest possible
  });

  it("weekday rules", () => {
    // First Monday of May 2026 is the 4th; last Monday of August the 31st.
    expect(nthWeekdayOfMonth(2026, 5, 1, 1)).toEqual({ month: 5, day: 4 });
    expect(lastWeekdayOfMonth(2026, 8, 1)).toEqual({ month: 8, day: 31 });
    // Saturday on or after 20 June 2026 is the 20th itself.
    expect(weekdayOnOrAfter(2026, 6, 20, 6)).toEqual({ month: 6, day: 20 });
  });
});

describe("Swedish red days (rule engine, not year tables)", () => {
  it("computes the fixed red days", () => {
    for (const year of [2025, 2026, 2030]) {
      expect(holidayFor(sv, year, 1, 1)?.name).toBe("Nyårsdagen");
      expect(holidayFor(sv, year, 6, 6)?.name).toBe("Sveriges nationaldag");
      expect(holidayFor(sv, year, 12, 25)?.red).toBe(true);
      expect(holidayFor(sv, year, 12, 26)?.red).toBe(true);
    }
  });

  it("computes the Easter chain for 2026 (Easter = 5 April)", () => {
    expect(holidayFor(sv, 2026, 4, 3)?.name).toBe("Långfredagen");
    expect(holidayFor(sv, 2026, 4, 5)?.name).toBe("Påskdagen");
    expect(holidayFor(sv, 2026, 4, 6)?.name).toBe("Annandag påsk");
    expect(holidayFor(sv, 2026, 5, 14)?.name).toBe("Kristi himmelsfärdsdag");
    expect(holidayFor(sv, 2026, 5, 24)?.name).toBe("Pingstdagen");
  });

  it("computes the Saturday rules", () => {
    // 2026: Midsommardagen 20 June, Alla helgons dag 31 October.
    expect(holidayFor(sv, 2026, 6, 20)?.name).toBe("Midsommardagen");
    expect(holidayFor(sv, 2026, 6, 19)?.name).toBe("Midsommarafton");
    expect(holidayFor(sv, 2026, 10, 31)?.name).toBe("Alla helgons dag");
    // 2025: Midsommardagen 21 June, Alla helgons dag 1 November.
    expect(holidayFor(sv, 2025, 6, 21)?.name).toBe("Midsommardagen");
    expect(holidayFor(sv, 2025, 11, 1)?.name).toBe("Alla helgons dag");
  });

  it("keeps the eves named, never red, and off per the agreements", () => {
    // Julafton is a working day by LAW and a day off under almost every
    // kollektivavtal, which is the whole reason the eve is a setting: the pack
    // ships the agreements' answer, not the statute's.
    expect(holidayFor(sv, 2026, 12, 24)).toEqual({
      month: 12,
      day: 24,
      name: "Julafton",
      red: false,
      off: true,
      eve: "off",
    });
    expect(holidayFor(sv, 2026, 12, 31)?.red).toBe(false);
    expect(holidayFor(sv, 2026, 6, 19)?.red).toBe(false);
    // The three the agreements hand back whole.
    for (const [m, d] of [
      [12, 24],
      [12, 31],
      [6, 19],
    ]) {
      expect(holidayFor(sv, 2026, m, d)?.off).toBe(true);
    }
    // …and the ones they do not: Valborgsmässoafton is worked, and
    // Trettondagsafton is a half day, which is a workday all the same.
    expect(holidayFor(sv, 2026, 4, 30)?.eve).toBe("work");
    expect(holidayFor(sv, 2026, 1, 5)?.eve).toBe("half");
    expect(holidayFor(sv, 2026, 4, 30)?.off).toBe(false);
    expect(holidayFor(sv, 2026, 1, 5)?.off).toBe(false);
  });

  it("separates ink from time off across the packs", () => {
    // `red` is what the calendar prints, `off` is whether anyone works. Sweden
    // prints its public holidays red; the UK prints none of them red but shuts
    // for all of them. A planner reading `red` would find no UK holidays.
    //
    // The eves are where the two come apart inside Sweden too: never red,
    // sometimes off. Every other entry keeps ink and time in step.
    for (const h of sv.holidays(2026)) {
      if (h.eve !== undefined) {
        expect(h.red).toBe(false);
        continue;
      }
      expect(h.off).toBe(h.red);
    }
    const uk = en.holidays(2026);
    expect(uk.length).toBeGreaterThan(0);
    for (const h of uk) {
      expect(h.red).toBe(false);
      expect(h.off).toBe(true);
    }
  });

  it("red-day resolution combines Sundays and holidays", () => {
    // 6 June 2026 is a Saturday — red through the holiday, not the weekday.
    expect(isRedDay(sv, 2026, 6, 6, 6)).toBe(true);
    // An ordinary Saturday is not red.
    expect(isRedDay(sv, 2026, 8, 15, 6)).toBe(false);
    // Any Sunday is red.
    expect(isRedDay(sv, 2026, 8, 16, 0)).toBe(true);
  });
});

describe("UK bank holidays", () => {
  it("computes the movable Mondays for 2026", () => {
    expect(holidayFor(en, 2026, 5, 4)?.name).toBe("Early May bank holiday");
    expect(holidayFor(en, 2026, 5, 25)?.name).toBe("Spring bank holiday");
    expect(holidayFor(en, 2026, 8, 31)?.name).toBe("Summer bank holiday");
    expect(holidayFor(en, 2026, 4, 3)?.name).toBe("Good Friday");
    expect(holidayFor(en, 2026, 4, 6)?.name).toBe("Easter Monday");
  });

  it("applies Christmas substitute rules", () => {
    // 2026: 25 Dec is a Friday, 26 Dec a Saturday → Boxing Day observed Mon 28.
    expect(holidayFor(en, 2026, 12, 25)?.name).toBe("Christmas Day");
    expect(holidayFor(en, 2026, 12, 28)?.name).toBe("Boxing Day (substitute)");
    // 2021: 25 Sat, 26 Sun → substitutes Mon 27 + Tue 28.
    expect(holidayFor(en, 2021, 12, 27)?.name).toBe(
      "Christmas Day (substitute)",
    );
    expect(holidayFor(en, 2021, 12, 28)?.name).toBe("Boxing Day (substitute)");
    // 2022: 25 Sun → Boxing Day Mon 26, Christmas substitute Tue 27.
    expect(holidayFor(en, 2022, 12, 26)?.name).toBe("Boxing Day");
    expect(holidayFor(en, 2022, 12, 27)?.name).toBe(
      "Christmas Day (substitute)",
    );
  });

  it("New Year substitute when 1 January is a weekend", () => {
    // 2022: 1 Jan was a Saturday → observed Monday 3 January.
    expect(holidayFor(en, 2022, 1, 3)?.name).toBe(
      "New Year's Day (substitute)",
    );
    expect(holidayFor(en, 2022, 1, 1)).toBeNull();
  });

  it("UK bank holidays are named but not red", () => {
    expect(holidayFor(en, 2026, 12, 25)?.red).toBe(false);
    expect(isRedDay(en, 2026, 12, 25, 5)).toBe(false);
  });
});

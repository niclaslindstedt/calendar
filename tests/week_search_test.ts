// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week list and its search. Pure, so every reading of an ambiguous date
// is pinned here rather than discovered on a phone: `12/8` has to mean both
// things, `31/2` has to mean only one, and `8 aug` has to work in a Swedish
// calendar read in English and an English one read in Swedish.

import { describe, expect, it } from "vitest";

import { getLocale } from "../src/app/locale/index.ts";
import {
  monthsNamed,
  parseWeekQuery,
  searchWeeks,
  weekOf,
  weekRangeLabel,
  weeksInYear,
} from "../src/app/weekSearch.ts";

const sv = getLocale("sv-SE");
const gb = getLocale("en-GB");

/** The year the readings below are made in, unless one carries its own. */
const YEAR = 2026;

describe("the year's weeks", () => {
  it("runs from the week holding 4 January to the next year's", () => {
    const rows = weeksInYear(sv, 2026);
    expect(rows[0].week).toBe(1);
    // 2026 opens on a Thursday, so its week 1 opens on the Monday before.
    expect(rows[0].start).toBe("2025-12-29");
    expect(rows[0].end).toBe("2026-01-04");
    expect(rows[rows.length - 1].week).toBe(rows.length);
  });

  it("is 53 weeks long in a year that needs it", () => {
    // 2026 ends on a Thursday, which is what makes it a 53-week year.
    expect(weeksInYear(sv, 2026)).toHaveLength(53);
    expect(weeksInYear(sv, 2027)).toHaveLength(52);
  });

  it("numbers every week once, in order", () => {
    const rows = weeksInYear(gb, 2027);
    expect(rows.map((r) => r.week)).toEqual(rows.map((_, i) => i + 1));
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].start > rows[i - 1].start).toBe(true);
    }
  });

  it("spans seven days from the pack's start of week", () => {
    for (const row of weeksInYear(sv, 2026)) {
      const days = (Date.parse(row.end) - Date.parse(row.start)) / 86_400_000;
      expect(days).toBe(6);
      expect(new Date(`${row.start}T12:00:00Z`).getUTCDay()).toBe(
        sv.weekStartsOn,
      );
    }
  });
});

describe("the week a day is in", () => {
  it("is the almanac's own answer", () => {
    expect(weekOf(sv, "2026-08-12").week).toBe(33);
    expect(weekOf(sv, "2026-08-12").start).toBe("2026-08-10");
    expect(weekOf(sv, "2026-08-12").end).toBe("2026-08-16");
  });

  it("belongs to the year its Thursday is in, at the turn of one", () => {
    // 31 December 2025 is a Wednesday in the week whose Thursday is 1 January
    // — the week the *next* year calls its first.
    expect(weekOf(sv, "2025-12-31").week).toBe(1);
  });
});

describe("what a query can mean", () => {
  const read = (query: string, year = YEAR) => parseWeekQuery(query, year);

  it("takes a bare number as a week", () => {
    expect(read("34").weeks).toEqual([34]);
    expect(read("1").weeks).toEqual([1]);
    // Nothing has a week 54, so it is not a reading.
    expect(read("54").weeks).toEqual([]);
  });

  it("takes the letter a calendar prints in front of one", () => {
    for (const typed of [
      "v34",
      "v 34",
      "v.34",
      "vecka 34",
      "w 34",
      "week 34",
    ]) {
      expect(read(typed).weeks, typed).toEqual([34]);
    }
  });

  it("reads an ambiguous numeric date both ways round", () => {
    // The whole reason this screen exists in the shape it does.
    expect(read("12/8").days).toEqual(["2026-08-12", "2026-12-08"]);
    expect(read("12.8").days).toEqual(["2026-08-12", "2026-12-08"]);
    expect(read("12-8").days).toEqual(["2026-08-12", "2026-12-08"]);
  });

  it("has only one reading where only one is a date", () => {
    // There is no 31st month, so `31/2` is the 31st of February — which is
    // not a day either. Nothing is guessed in its place.
    expect(read("31/2").days).toEqual([]);
    expect(read("25/12").days).toEqual(["2026-12-25"]);
    // …and the same day either way round is one reading, not two.
    expect(read("8/8").days).toEqual(["2026-08-08"]);
  });

  it("reads an ISO date, which cannot be ambiguous", () => {
    expect(read("2026-08-08").days).toEqual(["2026-08-08"]);
    expect(read("2027-01-04").days).toEqual(["2027-01-04"]);
  });

  it("reads a month by name, in either order and either language", () => {
    expect(read("8 aug").days).toEqual(["2026-08-08"]);
    expect(read("aug 8").days).toEqual(["2026-08-08"]);
    expect(read("8 augusti").days).toEqual(["2026-08-08"]);
    expect(read("8 august").days).toEqual(["2026-08-08"]);
    expect(read("8. aug.").days).toEqual(["2026-08-08"]);
  });

  it("takes the year a query carries, over the one on display", () => {
    expect(read("8/8/2027").days).toEqual(["2027-08-08"]);
    expect(read("8 aug 2027").days).toEqual(["2027-08-08"]);
    // Two digits are this century's, the way every form on the web reads it.
    expect(read("8/8/27").days).toEqual(["2027-08-08"]);
  });

  it("takes a bare month as the weeks it covers", () => {
    expect(read("augusti").months).toEqual([8]);
    expect(read("august").months).toEqual([8]);
    // Two letters would be March and May at once, which is not an answer.
    expect(read("ma").months).toEqual([]);
    expect(read("mar").months).toEqual([3]);
  });

  it("takes four digits as a year of its own", () => {
    expect(read("2027").years).toEqual([2027]);
    expect(read("2027").weeks).toEqual([]);
    expect(read("9999").years).toEqual([]);
  });

  it("reads nothing out of nothing", () => {
    expect(read("")).toEqual({ weeks: [], days: [], months: [], years: [] });
    expect(read("   ")).toEqual({ weeks: [], days: [], months: [], years: [] });
    expect(read("qwerty")).toEqual({
      weeks: [],
      days: [],
      months: [],
      years: [],
    });
  });
});

describe("naming a month", () => {
  it("takes every shipped country's language, and English", () => {
    expect(monthsNamed("maj")).toEqual([5]);
    expect(monthsNamed("may")).toEqual([5]);
    expect(monthsNamed("oktober")).toEqual([10]);
    expect(monthsNamed("october")).toEqual([10]);
  });

  it("ignores the full stop an abbreviation carries", () => {
    expect(monthsNamed("okt.")).toEqual([10]);
  });

  it("is nothing for a word that is not a month", () => {
    expect(monthsNamed("vecka")).toEqual([]);
    expect(monthsNamed("")).toEqual([]);
  });
});

describe("the weeks a query reaches", () => {
  it("finds a week by its number", () => {
    const hits = searchWeeks(sv, YEAR, "34");
    expect(hits).toHaveLength(1);
    expect(hits[0].week).toBe(34);
    expect(hits[0].on).toBeNull();
  });

  it("finds the week around a date, and says which date", () => {
    const hits = searchWeeks(sv, YEAR, "8 aug");
    expect(hits).toHaveLength(1);
    expect(hits[0].week).toBe(32);
    expect(hits[0].on).toBe("2026-08-08");
  });

  it("offers both readings of an ambiguous date, each with its own", () => {
    const hits = searchWeeks(sv, YEAR, "12/8");
    expect(hits.map((h) => h.on)).toEqual(["2026-08-12", "2026-12-08"]);
    expect(hits.map((h) => h.week)).toEqual([33, 50]);
  });

  it("reaches a week in another year through a date that names it", () => {
    const hits = searchWeeks(sv, YEAR, "2027-08-08");
    expect(hits).toHaveLength(1);
    expect(hits[0].start).toBe("2027-08-02");
  });

  it("gives a whole year for a year, and a month's weeks for a month", () => {
    expect(searchWeeks(sv, YEAR, "2027")).toHaveLength(52);
    const august = searchWeeks(sv, YEAR, "augusti");
    // Every week with a day in August — the ones straddling its two ends
    // included, which are exactly the ones worth finding this way.
    expect(august.length).toBe(6);
    expect(august[0].start).toBe("2026-07-27");
    expect(august[august.length - 1].end).toBe("2026-09-06");
  });

  it("answers a question nobody asked with nothing", () => {
    expect(searchWeeks(sv, YEAR, "")).toEqual([]);
    expect(searchWeeks(sv, YEAR, "qwerty")).toEqual([]);
  });
});

describe("the range beside a week", () => {
  it("collapses the month where both ends share one", () => {
    expect(weekRangeLabel(gb, weekOf(gb, "2026-08-12"))).toBe("10–16 Aug");
  });

  it("names both where the week crosses one", () => {
    expect(weekRangeLabel(gb, weekOf(gb, "2026-09-01"))).toBe(
      "31 Aug – 6 Sept",
    );
  });
});

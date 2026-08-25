// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How much of a day's names a bounded surface prints. The table is the
// country's and stays whole; the cell decides what it can set.
import { describe, expect, it } from "vitest";

import { getLocale, nameDaysFor } from "../src/app/locale/index.ts";
import { MAX_PRINTED_NAMES, namesThatFit } from "../src/app/nameDayFit.ts";

const fi = getLocale("fi-FI");
const sv = getLocale("sv-SE");
const nb = getLocale("nb-NO");

describe("namesThatFit", () => {
  it("passes a short day through untouched", () => {
    const names = ["Kasper", "Melker", "Baltsar"];
    const fit = namesThatFit(names, 3);
    expect(fit.shown).toBe(names);
    expect(fit.hidden).toBe(0);
  });

  it("cuts a long day and says how much it cut", () => {
    const fit = namesThatFit(["a", "b", "c", "d", "e"], 3);
    expect(fit.shown).toEqual(["a", "b", "c"]);
    expect(fit.hidden).toBe(2);
  });

  it("treats a limit of zero as no limit, not as no names", () => {
    // How an unbounded surface asks: `DayZoom` prints the day in full, and
    // "print nothing" is what the name-day toggle is for.
    const names = ["a", "b", "c", "d"];
    expect(namesThatFit(names, 0).shown).toBe(names);
    expect(namesThatFit(names, -1).hidden).toBe(0);
  });

  it("keeps the day's own order", () => {
    // The almanac's order is the order the calendar prints, so the names that
    // survive are the first ones rather than a sorted pick.
    expect(namesThatFit(["Zoe", "Adam", "Bo", "Cy"], 2).shown).toEqual([
      "Zoe",
      "Adam",
    ]);
  });
});

describe("the cap against the real almanacs", () => {
  it("leaves the Swedish table whole", () => {
    // The Swedish almanac maxes out at three names, which is what the cap was
    // measured against — so a reader on that calendar never sees an ellipsis
    // and the cap is invisible to them.
    for (const [key, names] of Object.entries(sv.nameDays ?? {})) {
      expect([key, namesThatFit(names).hidden]).toEqual([key, 0]);
    }
  });

  it("touches the Norwegian table on exactly one day", () => {
    // 2 February is the only Norwegian day with a fourth name. Worth pinning
    // rather than rounding off: it is the one day the cap is visible on that
    // calendar, so if a table revision makes it several, the cap wants
    // re-measuring rather than quietly cutting more.
    const cut = Object.entries(nb.nameDays ?? {}).filter(
      ([, names]) => namesThatFit(names).hidden > 0,
    );
    expect(cut.map(([key]) => key)).toEqual(["02-02"]);
  });

  it("cuts the Finnish days that no cell could hold", () => {
    // 15 August celebrates thirteen names. The cell shows three and says so;
    // the whole list is still in the table for the search and the contacts
    // matching, and `DayZoom` prints it.
    const august15 = nameDaysFor(fi, 8, 15);
    expect(august15.length).toBeGreaterThan(MAX_PRINTED_NAMES);
    const fit = namesThatFit(august15);
    expect(fit.shown.length).toBe(MAX_PRINTED_NAMES);
    expect(fit.hidden).toBe(august15.length - MAX_PRINTED_NAMES);
  });

  it("leaves most Finnish days alone even so", () => {
    // The cap is for the tail, not the norm: a majority of the Finnish year
    // fits three names, so the ellipsis is the exception it looks like.
    const days = Object.values(fi.nameDays ?? {});
    const whole = days.filter((names) => namesThatFit(names).hidden === 0);
    expect(whole.length / days.length).toBeGreaterThan(0.75);
  });
});

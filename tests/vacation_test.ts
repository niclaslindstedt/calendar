// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The vacation planner is pure domain logic over a locale pack, so it is
// covered here end to end: what counts as a free day, which bridges the year
// offers, and that a budget never buys more than the calendar actually gives.

import { describe, expect, it } from "vitest";

import { getLocale } from "../src/app/locale/index.ts";
import {
  bridgeBlocks,
  holidaysInYear,
  isFreeDay,
  planVacation,
  type BridgeBlock,
} from "../src/app/vacation.ts";

const sv = getLocale("sv-SE");
const gb = getLocale("en-GB");

/** The block that books exactly these days, if the planner offers one. */
function blockFor(
  blocks: readonly BridgeBlock[],
  ...days: string[]
): BridgeBlock | undefined {
  return blocks.find(
    (b) =>
      b.days.length === days.length && days.every((d, i) => b.days[i] === d),
  );
}

describe("isFreeDay", () => {
  it("treats the weekend as free in both packs", () => {
    // 2026-08-22 is a Saturday, 2026-08-23 a Sunday.
    for (const pack of [sv, gb]) {
      expect(isFreeDay(pack, "2026-08-22")).toBe(true);
      expect(isFreeDay(pack, "2026-08-23")).toBe(true);
      expect(isFreeDay(pack, "2026-08-24")).toBe(false);
    }
  });

  it("treats a public holiday as free", () => {
    // Midsummer's Eve 2026 falls on Friday 19 June; Midsummer Day on the 20th.
    expect(isFreeDay(sv, "2026-06-06")).toBe(true); // Sveriges nationaldag
    expect(isFreeDay(sv, "2026-01-01")).toBe(true); // Nyårsdagen
  });

  it("leaves a non-red observance bookable", () => {
    // Julafton and Nyårsafton are workdays by law — the planner must be able
    // to suggest spending a vacation day on them.
    expect(isFreeDay(sv, "2026-12-24")).toBe(false);
    expect(isFreeDay(sv, "2026-12-31")).toBe(false);
  });
});

describe("holidaysInYear", () => {
  it("returns the pack's year in date order with weekdays attached", () => {
    const list = holidaysInYear(sv, 2026);
    expect(list.length).toBe(sv.holidays(2026).length);
    const keys = list.map((h) => h.key);
    expect([...keys].sort()).toEqual(keys);
    expect(list[0]).toMatchObject({
      key: "2026-01-01",
      name: "Nyårsdagen",
      red: true,
      off: true,
      weekday: 4, // a Thursday
    });
  });

  it("moves the Easter chain with the year", () => {
    const good = (year: number) =>
      holidaysInYear(sv, year).find((h) => h.name === "Långfredagen")?.key;
    expect(good(2026)).toBe("2026-04-03");
    expect(good(2027)).toBe("2027-03-26");
  });
});

describe("bridgeBlocks", () => {
  const blocks = bridgeBlocks(sv, 2026);

  it("only offers blocks that return more than they cost", () => {
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.length).toBeGreaterThan(b.cost);
      expect(b.cost).toBe(b.days.length);
    }
  });

  it("turns the Friday after a Thursday holiday into four days off", () => {
    // Kristi himmelsfärdsdag 2026 is Thursday 14 May. Booking Friday the 15th
    // buys Thu–Sun: the user's own example.
    expect(
      holidaysInYear(sv, 2026).find((h) => h.name === "Kristi himmelsfärdsdag"),
    ).toMatchObject({ key: "2026-05-14", weekday: 4 });
    const friday = blockFor(blocks, "2026-05-15");
    expect(friday).toBeDefined();
    expect(friday).toMatchObject({
      cost: 1,
      start: "2026-05-14",
      end: "2026-05-17",
      length: 4,
    });
  });

  it("turns Thursday+Friday after a Wednesday holiday into five days off", () => {
    // The other half of the example. 2026-06-06 (nationaldagen) is a Saturday,
    // so build the case on a year where it lands midweek: 2029-06-06 is a
    // Wednesday, and booking the Thursday and Friday buys Wed–Sun.
    const y = 2029;
    expect(
      holidaysInYear(sv, y).find((h) => h.name === "Sveriges nationaldag"),
    ).toMatchObject({ key: "2029-06-06", weekday: 3 });
    const pair = blockFor(bridgeBlocks(sv, y), "2029-06-07", "2029-06-08");
    expect(pair).toMatchObject({
      cost: 2,
      start: "2029-06-06",
      end: "2029-06-10",
      length: 5,
    });
  });

  it("ranks the best return first", () => {
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const cur = blocks[i];
      expect(prev.length / prev.cost).toBeGreaterThanOrEqual(
        cur.length / cur.cost,
      );
    }
  });

  it("measures a break across the new year rather than clipping at 31 Dec", () => {
    // Christmas 2026: the 25th and 26th are red, the 24th and 31st are not.
    // A block booked in late December must count the January days it reaches.
    const christmas = bridgeBlocks(sv, 2026).filter((b) =>
      b.start.startsWith("2026-12"),
    );
    const crossing = christmas.filter((b) => b.end.startsWith("2027-01"));
    expect(crossing.length).toBeGreaterThan(0);
    for (const b of crossing) expect(b.length).toBeGreaterThan(b.cost);
  });

  it("offers nothing longer than a working week to bridge", () => {
    for (const b of bridgeBlocks(sv, 2026))
      expect(b.cost).toBeLessThanOrEqual(5);
    for (const b of bridgeBlocks(gb, 2026))
      expect(b.cost).toBeLessThanOrEqual(5);
  });

  it("works for a pack with different holidays", () => {
    const uk = bridgeBlocks(gb, 2026);
    expect(uk.length).toBeGreaterThan(0);
    for (const b of uk) expect(b.length).toBeGreaterThan(b.cost);
  });
});

describe("planVacation", () => {
  it("never spends more than the budget, and accounts for every day", () => {
    for (const budget of [0, 1, 3, 7, 12, 25, 40]) {
      const plan = planVacation(sv, 2026, budget);
      expect(plan.spent).toBeLessThanOrEqual(budget);
      expect(plan.spent).toBe(plan.breaks.reduce((sum, b) => sum + b.cost, 0));
      expect(plan.spent + plan.unspent).toBe(budget);
    }
  });

  it("buys nothing with no budget", () => {
    const plan = planVacation(sv, 2026, 0);
    expect(plan).toMatchObject({
      breaks: [],
      spent: 0,
      unspent: 0,
      daysOff: 0,
      longest: 0,
    });
  });

  it("spends a single day on the year's best bridge", () => {
    const plan = planVacation(sv, 2026, 1);
    expect(plan.spent).toBe(1);
    expect(plan.breaks.length).toBe(1);
    expect(plan.daysOff).toBe(plan.breaks[0].length);
    expect(plan.daysOff).toBeGreaterThanOrEqual(4);
  });

  it("returns breaks in date order and never books a day twice", () => {
    const plan = planVacation(sv, 2026, 25);
    const keys = plan.breaks.map((b) => b.start);
    expect([...keys].sort()).toEqual(keys);
    const all = plan.breaks.flatMap((b) => b.days);
    expect(new Set(all).size).toBe(all.length);
  });

  it("merges picks that share a weekend into one break", () => {
    // The honesty check, and the reason the plan reports breaks rather than
    // the blocks it chose. Every reported break must be a genuine unbroken
    // stretch: no two may touch or overlap, and the total is their sum.
    const plan = planVacation(sv, 2026, 25);
    expect(plan.daysOff).toBe(
      plan.breaks.reduce((sum, b) => sum + b.length, 0),
    );
    for (let i = 1; i < plan.breaks.length; i++) {
      // A full day must separate them, else they were the same break.
      expect(plan.breaks[i].start > plan.breaks[i - 1].end).toBe(true);
    }
    expect(plan.daysOff).toBeLessThanOrEqual(366);
  });

  it("delivers a break longer than any single suggestion could", () => {
    // Booking around New Year and Epiphany chains into one long break — the
    // merge is the point, so at least one break must beat the 5-day cap on an
    // individual block.
    const plan = planVacation(sv, 2026, 25);
    expect(plan.longest).toBeGreaterThan(5);
    const long = plan.breaks.find((b) => b.length === plan.longest);
    expect(long).toBeDefined();
    expect(long!.length).toBeGreaterThan(long!.cost);
  });

  it("hands back budget it cannot usefully spend", () => {
    // A full Swedish allowance outlasts the year's holidays; padding the plan
    // with days that buy nothing would be worse than saying so.
    const plan = planVacation(sv, 2026, 40);
    expect(plan.unspent).toBeGreaterThan(0);
    expect(plan.spent).toBeLessThan(40);
  });

  it("only suggests days that hang off a public holiday", () => {
    // The rule that keeps 52 ordinary Fridays out of the plan.
    const plan = planVacation(sv, 2026, 25);
    for (const b of plan.breaks) {
      const holidays = holidaysInYear(sv, Number(b.start.slice(0, 4)))
        .concat(holidaysInYear(sv, Number(b.end.slice(0, 4))))
        .filter((h) => h.off && h.key >= b.start && h.key <= b.end);
      expect(holidays.length).toBeGreaterThan(0);
    }
  });

  it("gets more time off as the budget grows, never less", () => {
    let previous = -1;
    for (const budget of [0, 1, 2, 3, 5, 8, 12, 20, 25]) {
      const plan = planVacation(sv, 2026, budget);
      expect(plan.daysOff).toBeGreaterThanOrEqual(previous);
      previous = plan.daysOff;
    }
  });

  it("beats spending the same days at random", () => {
    // A 25-day plan should comfortably clear 1.5 free days per day booked;
    // taking 25 arbitrary workdays off would return exactly 25.
    const plan = planVacation(sv, 2026, 25);
    expect(plan.daysOff / plan.spent).toBeGreaterThan(1.5);
  });

  it("holds up across packs and years", () => {
    for (const pack of [sv, gb]) {
      for (const year of [2026, 2027, 2028, 2029, 2030]) {
        const plan = planVacation(pack, year, 25);
        expect(plan.spent).toBeLessThanOrEqual(25);
        expect(plan.daysOff).toBeGreaterThan(plan.spent);
        expect(plan.longest).toBeGreaterThan(0);
      }
    }
  });
});

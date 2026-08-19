// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The strip row's arrangement — the four slots the week planner and the day
// list share, and the rule that decides whether a margin is drawn at all.
import { describe, expect, it } from "vitest";

import {
  DEFAULT_STRIP_LAYOUT,
  STRIP_PIECES,
  STRIP_SLOTS,
  inMargin,
  marginReserved,
  piecesInMargin,
  piecesInSlot,
  stripEnd,
  stripMargin,
  stripSlotOf,
} from "../src/app/stripLayout.ts";
import {
  DEFAULT_LOOK,
  LOOK_KEYS,
  STRIP_PIECE_KEY,
  stripLayoutOf,
  updateLook,
} from "../src/app/useAppSettings.ts";

const ALL = { day: true, holidays: true, nameDays: true, week: true };

describe("the four slots", () => {
  it("is two margins, each with two ends", () => {
    expect(STRIP_SLOTS).toHaveLength(4);
    expect(STRIP_SLOTS.filter((s) => stripMargin(s) === "lane")).toHaveLength(
      2,
    );
    expect(STRIP_SLOTS.filter((s) => stripMargin(s) === "rail")).toHaveLength(
      2,
    );
    for (const margin of ["lane", "rail"] as const) {
      const ends = STRIP_SLOTS.filter((s) => stripMargin(s) === margin).map(
        stripEnd,
      );
      expect(ends.sort()).toEqual(["bottom", "top"]);
    }
  });

  it("defaults to the printed column calendar's own arrangement", () => {
    // The date at the head of the lane with the names under it; the week
    // number at the top of the rail, the holiday along the bottom.
    expect(DEFAULT_STRIP_LAYOUT).toEqual({
      day: "lane-top",
      nameDays: "lane-bottom",
      week: "rail-top",
      holidays: "rail-bottom",
    });
  });

  it("holds a hand-edited slot to one that exists", () => {
    // A piece assigned to a slot the row does not have would simply vanish
    // from both views.
    for (const slot of STRIP_SLOTS) expect(stripSlotOf(slot)).toBe(slot);
    expect(STRIP_SLOTS).toContain(stripSlotOf("middle"));
    expect(STRIP_SLOTS).toContain(stripSlotOf(undefined));
  });
});

describe("reading a margin", () => {
  it("stacks a slot's pieces in the order a day reads them", () => {
    const layout = {
      ...DEFAULT_STRIP_LAYOUT,
      holidays: "lane-bottom",
    } as const;
    expect(piecesInSlot(layout, "lane-bottom")).toEqual([
      "holidays",
      "nameDays",
    ]);
    expect(piecesInMargin(layout, "lane")).toEqual([
      "day",
      "holidays",
      "nameDays",
    ]);
    expect(piecesInMargin(layout, "rail")).toEqual(["week"]);
  });

  it("answers which margin a piece is printed in", () => {
    expect(inMargin(DEFAULT_STRIP_LAYOUT, "lane", "day")).toBe(true);
    expect(inMargin(DEFAULT_STRIP_LAYOUT, "rail", "day")).toBe(false);
  });
});

describe("marginReserved", () => {
  it("reserves a margin the period has something to print in", () => {
    expect(marginReserved(DEFAULT_STRIP_LAYOUT, "lane", ALL)).toBe(true);
    expect(marginReserved(DEFAULT_STRIP_LAYOUT, "rail", ALL)).toBe(true);
  });

  it("drops a margin whose pieces are all absent", () => {
    // A plain English month: no name days, no week numbers, no holidays. The
    // rail would be 64 px of dead gutter down ninety rows.
    const has = { ...ALL, nameDays: false, week: false, holidays: false };
    expect(marginReserved(DEFAULT_STRIP_LAYOUT, "rail", has)).toBe(false);
    // The lane still carries the date, which every day has.
    expect(marginReserved(DEFAULT_STRIP_LAYOUT, "lane", has)).toBe(true);
  });

  it("follows the pieces when they move", () => {
    const layout = { ...DEFAULT_STRIP_LAYOUT, day: "rail-top" } as const;
    const has = { ...ALL, nameDays: false, week: false, holidays: false };
    expect(marginReserved(layout, "lane", has)).toBe(false);
    expect(marginReserved(layout, "rail", has)).toBe(true);
  });
});

describe("the arrangement as a setting", () => {
  it("names the look key that parks each piece", () => {
    for (const piece of STRIP_PIECES) {
      expect(LOOK_KEYS).toContain(STRIP_PIECE_KEY[piece]);
    }
  });

  it("previews a move rather than saving it straight away", () => {
    expect(stripLayoutOf(DEFAULT_LOOK)).toEqual(DEFAULT_STRIP_LAYOUT);
    const moved = updateLook(DEFAULT_LOOK, "stripHolidaySlot", "lane-bottom");
    expect(stripLayoutOf(moved).holidays).toBe("lane-bottom");
    expect(stripLayoutOf(moved).day).toBe("lane-top");
  });
});

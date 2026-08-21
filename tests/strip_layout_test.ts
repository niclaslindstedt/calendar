// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The strip row's arrangement — the four slots the week planner and the day
// list share, the rule that decides whether a margin is drawn at all, and how
// much of the row those margins leave the note.
import { describe, expect, it } from "vitest";

import {
  DEFAULT_STRIP_LAYOUT,
  DEFAULT_STRIP_NOTE_FLOW,
  STRIP_PIECES,
  STRIP_SLOTS,
  inMargin,
  marginReserved,
  piecesInMargin,
  piecesInSlot,
  piecesPrinted,
  stripEnd,
  stripMargin,
  stripSlotOf,
} from "../src/app/stripLayout.ts";
import {
  DEFAULT_LOOK,
  LOOK_KEYS,
  STRIP_PIECE_KEY,
  stripLayoutOf,
  stripNoteFlows,
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

describe("piecesPrinted", () => {
  it("prints what the day has, in the slot's own order", () => {
    expect(piecesPrinted(DEFAULT_STRIP_LAYOUT, "lane-top", ALL)).toEqual([
      "day",
    ]);
    expect(piecesPrinted(DEFAULT_STRIP_LAYOUT, "rail-top", ALL)).toEqual([
      "week",
    ]);
  });

  it("leaves out a piece this day has nothing for", () => {
    // Six days of seven open no week, and the margin is a float: an absent
    // piece costs nothing, so those days get their first lines back rather
    // than carrying an empty column.
    const has = { ...ALL, week: false };
    expect(piecesPrinted(DEFAULT_STRIP_LAYOUT, "rail-top", has)).toEqual([]);
    expect(piecesPrinted(DEFAULT_STRIP_LAYOUT, "rail-bottom", has)).toEqual([
      "holidays",
    ]);
  });

  it("follows a piece the reader has moved", () => {
    const layout = { ...DEFAULT_STRIP_LAYOUT, week: "rail-bottom" } as const;
    expect(piecesPrinted(layout, "rail-top", ALL)).toEqual([]);
    expect(piecesPrinted(layout, "rail-bottom", ALL)).toEqual([
      "holidays",
      "week",
    ]);
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

describe("how much of the row the margins leave the note", () => {
  it("ships the column, not the flow", () => {
    // A note that runs under the date and the week number is more room to
    // write in and a different calendar to look at, so it is opt-in: an
    // install nobody has been into prints the strip both views always drew.
    expect(DEFAULT_STRIP_NOTE_FLOW).toBe(false);
    expect(DEFAULT_LOOK.stripNoteFlow).toBe(false);
    expect(stripNoteFlows(DEFAULT_LOOK)).toBe(false);
  });

  it("previews the choice rather than saving it straight away", () => {
    // The whole point of the setting is what the row *looks* like, so it is
    // judged against the calendar behind the dialog like every other look key.
    expect(LOOK_KEYS).toContain("stripNoteFlow");
    expect(
      stripNoteFlows(updateLook(DEFAULT_LOOK, "stripNoteFlow", true)),
    ).toBe(true);
  });

  it("holds a hand-edited value to the quieter arrangement", () => {
    // The two arrangements are a class on the row rather than a value, so
    // anything that is not the flow has to land on the column rather than on
    // neither.
    for (const value of [undefined, null, 0, "yes", {}]) {
      expect(
        stripNoteFlows({ stripNoteFlow: value as unknown as boolean }),
      ).toBe(false);
    }
  });
});

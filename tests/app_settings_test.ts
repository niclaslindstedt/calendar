// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The pure half of the settings store: the look subset the Settings dialog
// edits against a draft, and the rules that apply to an edit of it.
import { describe, expect, it } from "vitest";

import {
  CELL_PIECES,
  CELL_PIECE_KEY,
  DEFAULT_LOOK,
  DEFAULT_SETTINGS,
  LOOK_KEYS,
  effectiveToggles,
  headerColorFor,
  headerInkOf,
  monthCellLayout,
  pickLook,
  updateLook,
  weekRowsOf,
} from "../src/app/useAppSettings.ts";
import { HEADER_COLOR_HEX } from "../src/app/headerColor.ts";
import { monthNoteFlows } from "../src/app/monthCell.tsx";
import { getLocale } from "../src/app/locale/index.ts";

describe("the look draft", () => {
  it("carries exactly the previewed keys", () => {
    expect(Object.keys(pickLook(DEFAULT_SETTINGS)).sort()).toEqual(
      [...LOOK_KEYS].sort(),
    );
  });

  it("defaults the entry text to shrink-to-fit, in both views", () => {
    expect(DEFAULT_LOOK.styles.month.entry.size).toBe("dynamic");
    expect(DEFAULT_LOOK.styles.strip.entry.size).toBe("dynamic");
  });

  it("defaults the month cell to the printed wall-calendar arrangement", () => {
    // The number in the top-right corner, the holiday and the day's names
    // stacked in the bottom-right one, the note under the number.
    expect(monthCellLayout(DEFAULT_LOOK)).toEqual({
      day: "top-right",
      nameDays: "bottom-right",
      holidays: "bottom-right",
      note: "top",
    });
  });

  it("previews the cell layout rather than saving it straight away", () => {
    // The arrangement is judged against the grid behind the dialog, so every
    // one of its keys has to travel in the draft.
    for (const key of [
      "monthDayCorner",
      "monthNameDayCorner",
      "monthHolidayCorner",
      "monthNote",
    ] as const) {
      expect(LOOK_KEYS).toContain(key);
    }
    const moved = updateLook(DEFAULT_LOOK, "monthDayCorner", "top-left");
    expect(monthCellLayout(moved).day).toBe("top-left");
  });

  it("lets the note flow around the day number where it is set to the top", () => {
    // The default arrangement, and the one where the note can start on the
    // same line as the date rather than under it.
    expect(monthNoteFlows(monthCellLayout(DEFAULT_LOOK))).toBe(true);
  });

  it("keeps the bands where the reader has pushed the note down the cell", () => {
    // A note asked to sit in the middle or at the bottom wants the leftover
    // room as a *box*, and a box cannot be an L: it goes back to the three
    // bands the cell has always had.
    for (const where of ["middle", "bottom"] as const) {
      const look = updateLook(DEFAULT_LOOK, "monthNote", where);
      expect(monthNoteFlows(monthCellLayout(look))).toBe(false);
    }
  });

  it("names the look key that parks each piece", () => {
    // The settings grid moves a piece by name; the map has to cover them all.
    for (const piece of CELL_PIECES) {
      expect(LOOK_KEYS).toContain(CELL_PIECE_KEY[piece]);
    }
  });

  it("re-seats the display toggles when the country changes", () => {
    const pinned = updateLook(
      updateLook(DEFAULT_LOOK, "weekNumbers", false),
      "nameDays",
      false,
    );
    expect(pinned.weekNumbers).toBe(false);

    const switched = updateLook(pinned, "localeId", "en-GB");
    expect(switched.localeId).toBe("en-GB");
    expect(switched.weekNumbers).toBeNull();
    expect(switched.nameDays).toBeNull();
  });

  it("leaves the other look settings alone on an ordinary edit", () => {
    const next = updateLook(DEFAULT_LOOK, "listRows", "dynamic");
    expect(next.listRows).toBe("dynamic");
    expect(next.localeId).toBe(DEFAULT_LOOK.localeId);
    expect(next.headerColor).toBe(DEFAULT_LOOK.headerColor);
  });

  it("ships the week planner as the printed strip it is", () => {
    // The whole week on one screen and no year-day numbers, both opt-in —
    // but the heading is banded in the masthead red a printed calendar uses,
    // which the strip views spend again on their week numbers.
    expect(DEFAULT_LOOK.weekRows).toBe("fixed");
    expect(DEFAULT_LOOK.weekDayOfYear).toBe(false);
    expect(DEFAULT_LOOK.headerColor).toBe("red");
    expect(headerInkOf(DEFAULT_LOOK)).toBe(HEADER_COLOR_HEX.red);
  });

  it("previews the heading band and the week strip rather than saving them", () => {
    // All three are judged against the calendar behind the dialog, so they
    // have to travel in the draft.
    for (const key of [
      "headerColor",
      "weekRows",
      "weekDayOfYear",
      "weekFormat",
      "weekDateSize",
    ] as const) {
      expect(LOOK_KEYS).toContain(key);
    }
    const banded = updateLook(DEFAULT_LOOK, "headerColor", "blue");
    expect(headerColorFor(banded)).toBe("blue");
    expect(headerInkOf(banded)).toBe(HEADER_COLOR_HEX.blue);
    expect(weekRowsOf(updateLook(DEFAULT_LOOK, "weekRows", "dynamic"))).toBe(
      "dynamic",
    );
  });

  it("resolves the toggles from the draft, override before pack default", () => {
    const pack = getLocale(DEFAULT_LOOK.localeId);
    expect(effectiveToggles(DEFAULT_LOOK).weekNumbers).toBe(
      pack.showWeekNumbersDefault,
    );
    expect(
      effectiveToggles(updateLook(DEFAULT_LOOK, "weekNumbers", false))
        .weekNumbers,
    ).toBe(false);
  });
});

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
  monthCellLayout,
  pickLook,
  updateLook,
} from "../src/app/useAppSettings.ts";
import { getLocale } from "../src/app/locale/index.ts";

describe("the look draft", () => {
  it("carries exactly the previewed keys", () => {
    expect(Object.keys(pickLook(DEFAULT_SETTINGS)).sort()).toEqual(
      [...LOOK_KEYS].sort(),
    );
  });

  it("defaults the entry text to shrink-to-fit", () => {
    expect(DEFAULT_LOOK.textSize).toBe("dynamic");
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
    const next = updateLook(DEFAULT_LOOK, "textSize", "large");
    expect(next.textSize).toBe("large");
    expect(next.localeId).toBe(DEFAULT_LOOK.localeId);
    expect(next.listRows).toBe(DEFAULT_LOOK.listRows);
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

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  CAL_FONTS,
  CAL_FONT_PIECES,
  CAL_FONT_VAR,
  CAPTION_SCALE,
  DATE_COLUMN_EM,
  DEFAULT_CAL_FONTS,
  calFontStack,
  calFontVars,
  captionScale,
  dateColumnEm,
  isCalFont,
  type CalFontId,
} from "../src/app/fonts.ts";
import {
  CAL_FONT_KEY,
  DEFAULT_SETTINGS,
  LOOK_KEYS,
  calFonts,
  pickLook,
} from "../src/app/useAppSettings.ts";

const IDS = CAL_FONTS.map((f) => f.id);

describe("the calendar's faces", () => {
  it("offers the printed serif plus the framework's families", () => {
    expect(IDS).toEqual(["print", "mono", "sans", "serif", "dyslexic"]);
  });

  it("recognises exactly the faces it offers", () => {
    for (const id of IDS) expect(isCalFont(id)).toBe(true);
    expect(isCalFont("comic")).toBe(false);
    expect(isCalFont(null)).toBe(false);
  });

  it("resolves the printed face through the app's own display stack", () => {
    expect(calFontStack("print")).toBe("var(--cal-serif)");
  });

  it("falls back to the printed face for an unknown stored value", () => {
    expect(calFontStack("comic" as CalFontId)).toBe("var(--cal-serif)");
  });

  it("names a real font stack for every face", () => {
    for (const font of CAL_FONTS) expect(font.stack.length).toBeGreaterThan(0);
  });
});

describe("caption scales", () => {
  // The month cell clips rather than shrinks, so a face that is wider than
  // the mono baseline has to be measured and given a scale — a new face
  // without one would silently truncate the longest name day.
  it("carries a measured scale for every face", () => {
    for (const id of IDS) expect(CAPTION_SCALE[id]).toBeGreaterThan(0);
    expect(Object.keys(CAPTION_SCALE).sort()).toEqual([...IDS].sort());
  });

  it("never widens a caption past the measured baseline", () => {
    for (const id of IDS) expect(captionScale(id)).toBeLessThanOrEqual(1);
  });

  it("gives OpenDyslexic back the width it overruns by", () => {
    // 63.2px at 7.5px against mono's 49.5px line — see fonts.ts.
    expect(captionScale("dyslexic")).toBeCloseTo(0.78, 2);
    expect(63.2 * captionScale("dyslexic")).toBeLessThanOrEqual(49.5);
  });

  it("leaves an unknown face unscaled rather than shrinking it away", () => {
    expect(captionScale("comic" as CalFontId)).toBe(1);
  });
});

describe("the strip row's date column", () => {
  // The column is a width the weekday lines up against down a whole month, so
  // it has to hold the widest day the face sets — a face without a measured
  // number would put its two digits into the weekday beside them.
  it("carries a measured width for every face", () => {
    for (const id of IDS) expect(DATE_COLUMN_EM[id]).toBeGreaterThan(0);
    expect(Object.keys(DATE_COLUMN_EM).sort()).toEqual([...IDS].sort());
  });

  it("never asks for less than the two digits it is holding", () => {
    // Half an em a digit is the printed serif's tabular figure, and the
    // narrowest any of the shipped faces sets one at — so a face billed under
    // one em would be billed under its own digits.
    for (const id of IDS) expect(dateColumnEm(id)).toBeGreaterThanOrEqual(1);
  });

  it("bills the widest face for the most", () => {
    // OpenDyslexic's "28" is 1.32 em against the printed serif's 1.00 — see
    // the measurements in fonts.ts.
    expect(dateColumnEm("dyslexic")).toBeCloseTo(1.32, 2);
    expect(dateColumnEm("print")).toBeCloseTo(1, 2);
    for (const id of IDS) {
      expect(dateColumnEm(id)).toBeLessThanOrEqual(dateColumnEm("dyslexic"));
    }
  });

  it("bills an unknown face generously rather than tightly", () => {
    // A face we can't measure is better given room it doesn't need than sent
    // into the weekday: the fallback clears every face the app ships.
    const unknown = dateColumnEm("comic" as CalFontId);
    for (const id of IDS)
      expect(unknown).toBeGreaterThanOrEqual(dateColumnEm(id));
  });
});

describe("calFontVars", () => {
  it("writes a stack for every piece, plus the caption scales", () => {
    const vars = calFontVars(DEFAULT_CAL_FONTS);
    for (const piece of CAL_FONT_PIECES) {
      expect(vars[CAL_FONT_VAR[piece]]).toBe(
        calFontStack(DEFAULT_CAL_FONTS[piece]),
      );
    }
    expect(vars["--cal-nameday-scale"]).toBe("1");
    expect(vars["--cal-holiday-scale"]).toBe("1");
    expect(vars["--cal-date-em"]).toBe("1");
  });

  it("bills the date column from the face the date is set in", () => {
    const vars = calFontVars({ ...DEFAULT_CAL_FONTS, day: "dyslexic" });
    expect(vars["--cal-date-em"]).toBe("1.32");
  });

  it("scales the caption bands from the faces they are set in", () => {
    const vars = calFontVars({
      ...DEFAULT_CAL_FONTS,
      nameDays: "dyslexic",
      entry: "dyslexic",
    });
    expect(vars["--cal-nameday-scale"]).toBe("0.78");
    // Your own text shrinks to fit on its own curve, so it takes no scale.
    expect(vars["--cal-holiday-scale"]).toBe("1");
  });

  it("gives each piece its own variable", () => {
    const names = CAL_FONT_PIECES.map((p) => CAL_FONT_VAR[p]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("the faces as settings", () => {
  it("defaults to the printed look: the date in serif, the rest in the app font", () => {
    expect(DEFAULT_CAL_FONTS).toEqual({
      day: "print",
      holidays: "mono",
      nameDays: "mono",
      entry: "mono",
    });
  });

  it("seeds the app settings from those defaults", () => {
    expect(calFonts(pickLook(DEFAULT_SETTINGS))).toEqual(DEFAULT_CAL_FONTS);
  });

  it("keeps every face in the previewed look, so Cancel drops it", () => {
    for (const piece of CAL_FONT_PIECES) {
      expect(LOOK_KEYS).toContain(CAL_FONT_KEY[piece]);
    }
  });

  it("reads each piece back off the look it was written to", () => {
    const look = pickLook({
      ...DEFAULT_SETTINGS,
      fontDay: "sans",
      fontHolidays: "serif",
      fontNameDays: "dyslexic",
      fontEntry: "print",
    });
    expect(calFonts(look)).toEqual({
      day: "sans",
      holidays: "serif",
      nameDays: "dyslexic",
      entry: "print",
    });
  });
});

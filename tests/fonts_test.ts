// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  CAL_FONTS,
  CAPTION_SCALE,
  calFontStack,
  captionScale,
  isCalFont,
  type CalFontId,
} from "../src/app/fonts.ts";

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

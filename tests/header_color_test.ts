// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The heading band's colour: a short named list, because the value is painted
// into a `style` attribute and printed as ink on the page.
import { describe, expect, it } from "vitest";

import {
  DEFAULT_HEADER_COLOR,
  HEADER_COLORS,
  HEADER_COLOR_HEX,
  headerColorOf,
  headerInk,
} from "../src/app/headerColor.ts";

describe("the heading colour", () => {
  it("ships the printed masthead's red", () => {
    expect(DEFAULT_HEADER_COLOR).toBe("red");
    expect(headerInk(DEFAULT_HEADER_COLOR)).toBe(HEADER_COLOR_HEX.red);
  });

  it("still has an off, and lands there rather than on the default", () => {
    // A value we don't recognise leaves the heading alone; it does not fall
    // back on the shipped colour and paint a band nobody asked for.
    expect(HEADER_COLORS).toContain("none");
    expect(headerColorOf(undefined)).toBe("none");
    expect(headerInk(undefined)).toBeNull();
    expect(headerInk("none")).toBeNull();
  });

  it("names a colour for every choice but off", () => {
    for (const color of HEADER_COLORS) {
      if (color === "none") continue;
      expect(HEADER_COLOR_HEX[color]).toMatch(/^#[0-9a-f]{6}$/);
      expect(headerInk(color)).toBe(HEADER_COLOR_HEX[color]);
    }
  });

  it("prints the red in the calendar's own red", () => {
    // `--cal-red` in `src/styles.css` — the band and the red days are the
    // same print red, not two nearly-equal ones.
    expect(HEADER_COLOR_HEX.red).toBe("#c12c26");
  });

  it("refuses anything a hand-edited setting might carry", () => {
    // The value reaches a `style` attribute, so an unknown one has to land on
    // "off" rather than on the page.
    expect(headerColorOf("chartreuse")).toBe("none");
    expect(headerColorOf("#ff0000")).toBe("none");
    expect(headerColorOf({})).toBe("none");
    expect(headerInk("javascript:alert(1)")).toBeNull();
  });
});

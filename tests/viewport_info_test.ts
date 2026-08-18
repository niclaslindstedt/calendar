// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  displayModeOf,
  formatInsets,
  formatSize,
  pxOf,
  readViewportInfo,
} from "../src/app/viewportInfo.ts";

describe("pxOf", () => {
  it("reads a computed pixel length", () => {
    expect(pxOf("34px")).toBe(34);
    expect(pxOf("0px")).toBe(0);
    expect(pxOf("59.5px")).toBe(59.5);
  });

  it("is zero when the engine resolved nothing", () => {
    expect(pxOf("")).toBe(0);
    expect(pxOf("auto")).toBe(0);
  });
});

describe("formatInsets", () => {
  it("prints top / right / bottom / left, the CSS order", () => {
    expect(formatInsets({ top: 59, right: 0, bottom: 34, left: 0 })).toBe(
      "59 / 0 / 34 / 0",
    );
  });

  it("rounds — the fractional part of an inset is never the story", () => {
    expect(formatInsets({ top: 47.33, right: 0, bottom: 20.5, left: 0 })).toBe(
      "47 / 0 / 21 / 0",
    );
  });

  it("shows the all-zero case a letterboxed viewport reports", () => {
    expect(formatInsets({ top: 0, right: 0, bottom: 0, left: 0 })).toBe(
      "0 / 0 / 0 / 0",
    );
  });
});

describe("formatSize", () => {
  it("prints the portrait phone budget", () => {
    expect(formatSize(393, 852)).toBe("393 × 852");
  });

  it("rounds a fractional viewport", () => {
    expect(formatSize(392.5, 851.2)).toBe("393 × 851");
  });
});

describe("displayModeOf", () => {
  it("names the installed app", () => {
    expect(displayModeOf((q) => q === "(display-mode: standalone)")).toBe(
      "standalone",
    );
  });

  it("names a browser tab", () => {
    expect(displayModeOf((q) => q === "(display-mode: browser)")).toBe(
      "browser",
    );
  });

  it("prefers the most app-like mode a device claims", () => {
    // iOS matches `standalone` and `minimal-ui` at once; the layout follows
    // the first, so that is what the readout has to say.
    expect(
      displayModeOf((q) =>
        ["(display-mode: standalone)", "(display-mode: minimal-ui)"].includes(
          q,
        ),
      ),
    ).toBe("standalone");
  });

  it("says so rather than guessing when nothing matches", () => {
    expect(displayModeOf(() => false)).toBe("unknown");
  });
});

describe("readViewportInfo", () => {
  it("is a no-op without a document — the tests run in node", () => {
    expect(readViewportInfo()).toBeNull();
  });
});

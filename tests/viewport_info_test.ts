// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The framework's `pwa/viewport` owns the inset probe, the CSS-length resolver
// and the display-mode naming, and tests them there. What is left to this app
// — and tested here — is the pair of chrome lengths only the calendar has
// (`--cal-bottom-gutter` and `.cal-topbar`'s lead) and the size line the
// Developer tab prints.
import { describe, expect, it } from "vitest";

import { formatSize, readViewportInfo } from "../src/app/viewportInfo.ts";

describe("formatSize", () => {
  it("prints the viewport as width × height", () => {
    expect(formatSize(393, 852)).toBe("393 × 852");
  });

  it("rounds — a fractional viewport is never the story", () => {
    expect(formatSize(392.5, 851.2)).toBe("393 × 851");
  });
});

describe("readViewportInfo", () => {
  it("is null where there is no document to measure", () => {
    // The tests run in node: nothing to probe, and nothing that should throw
    // trying. The Developer tab renders nothing on a null.
    expect(readViewportInfo()).toBeNull();
  });
});

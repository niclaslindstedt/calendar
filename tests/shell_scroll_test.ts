// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { driftPx, shouldPin } from "../src/app/shellScroll.ts";

describe("driftPx", () => {
  it("is zero for a shell sitting where it belongs", () => {
    expect(driftPx(0, 0)).toBe(0);
  });

  it("reads a document scroll", () => {
    expect(driftPx(64, 0)).toBe(64);
  });

  it("reads a visual-viewport offset — iOS expresses it either way", () => {
    expect(driftPx(0, 47)).toBe(47);
  });

  it("takes the larger when both report a shift", () => {
    expect(driftPx(20, 47)).toBe(47);
    expect(driftPx(80, 47)).toBe(80);
  });
});

describe("shouldPin", () => {
  it("pins a shell that has been pushed off the top", () => {
    expect(shouldPin(47, false)).toBe(true);
  });

  it("leaves a settled shell alone", () => {
    expect(shouldPin(0, false)).toBe(false);
  });

  it("ignores sub-pixel drift, which is rounding rather than a shift", () => {
    expect(shouldPin(0.5, false)).toBe(false);
  });

  // While a field has focus the offset is iOS holding it above the keyboard —
  // scrolling back would hide the day cell the user is typing into.
  it("never fights the keyboard while a field is focused", () => {
    expect(shouldPin(200, true)).toBe(false);
  });
});

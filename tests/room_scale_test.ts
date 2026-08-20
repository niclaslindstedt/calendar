// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The second factor in every printed size: how much more room the screen has
// than the 393 × 852 portrait phone every length in the app was measured on.
// The reader's own ladder is `text_size_test.ts`.
import { describe, expect, it } from "vitest";

import {
  MEASURED_HEIGHT,
  MEASURED_WIDTH,
  ROOM_MAX,
  SCOPE_MAX_WIDTH,
  roomScale,
  roomVars,
  scopeRoom,
} from "../src/app/roomScale.ts";
import { STYLE_SCOPES } from "../src/app/viewStyle.ts";

/** The screen the measurements were taken on. */
const PHONE = [MEASURED_WIDTH, MEASURED_HEIGHT] as const;

describe("the room factor", () => {
  it("is exactly 1 on the phone the app was measured on", () => {
    expect(roomScale(...PHONE)).toBe(1);
  });

  it("never shrinks the measurements", () => {
    // A smaller screen keeps them: shrinking is what the reader's Small step
    // is for, and a caption under 7.5 px is not type.
    for (const [w, h] of [
      [320, 568],
      [360, 640],
      [280, 653],
    ] as const) {
      expect(roomScale(w, h)).toBe(1);
    }
  });

  it("grows the almanac on a desk monitor", () => {
    // The report this exists for: a 1440p screen printed the ladder's largest
    // step at 9.4 px because 7.5 px is what a 47 px month cell can set.
    expect(roomScale(2560, 1440)).toBe(ROOM_MAX);
    // …and a laptop is not a phone either.
    expect(roomScale(1440, 900)).toBeGreaterThan(1.5);
  });

  it("never grows past its cap", () => {
    for (const [w, h] of [
      [2560, 1440],
      [3840, 2160],
      [5120, 2880],
      [1600, 2560],
    ] as const) {
      expect(roomScale(w, h)).toBeLessThanOrEqual(ROOM_MAX);
    }
  });

  it("prints a rotated phone at exactly the size it prints in portrait", () => {
    // The property that catches this being re-derived from one dimension: a
    // rotation trades height for width and leaves the area alone, and six
    // week rows on a 393 px-tall screen have no room for bigger type.
    expect(roomScale(MEASURED_HEIGHT, MEASURED_WIDTH)).toBe(1);
    // …and a bigger phone rotates without changing size either, whatever
    // size it prints at upright.
    expect(roomScale(430, 932)).toBe(roomScale(932, 430));
  });

  it("answers on the area rather than on either dimension", () => {
    // Width alone would grow a landscape phone's type by half again; height
    // alone would tell a 1440 × 900 laptop it has no more room than a phone,
    // when its month cell is four times as wide.
    const laptop = roomScale(1440, 900);
    expect(laptop).toBeGreaterThan(900 / MEASURED_HEIGHT);
    expect(laptop).toBeLessThan(Math.sqrt(1440 / MEASURED_WIDTH) * 1.1);
    // Double the area, set at √2.
    expect(roomScale(MEASURED_WIDTH * 2, MEASURED_HEIGHT)).toBeCloseTo(
      Math.SQRT2,
      2,
    );
  });

  it("rounds, so a scrolling URL bar does not restate every font size", () => {
    for (const w of [1000, 1234, 1600]) {
      const room = roomScale(w, 2000);
      expect(room).toBe(Math.round(room * 100) / 100);
    }
  });

  it("falls back to the measured screen for a number that is not one", () => {
    expect(roomScale(NaN, NaN)).toBe(1);
    expect(roomScale(0, 0)).toBe(1);
    expect(roomScale(-100, -100)).toBe(1);
  });
});

describe("the room a scope has", () => {
  it("stops the strip views where their column stops", () => {
    // The week planner and the day list are `max-w-3xl` and centred, so a
    // 1440p monitor gives them a 768 px row and not one pixel more.
    expect(scopeRoom("strip", 2560, 1000)).toBe(
      scopeRoom("strip", SCOPE_MAX_WIDTH.strip, 1000),
    );
  });

  it("lets the month grid keep growing, because it spans the window", () => {
    expect(scopeRoom("month", 2560, 1000)).toBeGreaterThan(
      scopeRoom("strip", 2560, 1000),
    );
  });

  it("gives both scopes the same answer on the measured phone", () => {
    for (const scope of STYLE_SCOPES)
      expect(scopeRoom(scope, ...PHONE)).toBe(1);
  });
});

describe("the published variables", () => {
  it("names one per scope, as the scope classes read them", () => {
    const vars = roomVars(2560, 1440);
    expect(Object.keys(vars).sort()).toEqual([
      "--cal-month-room",
      "--cal-strip-room",
    ]);
    for (const scope of STYLE_SCOPES) {
      expect(vars[`--cal-${scope}-room`]).toBe(
        String(scopeRoom(scope, 2560, 1440)),
      );
    }
  });

  it("publishes a bare number — the stylesheet multiplies lengths by it", () => {
    for (const value of Object.values(roomVars(1440, 900))) {
      expect(value).toMatch(/^\d+(\.\d+)?$/);
    }
  });
});

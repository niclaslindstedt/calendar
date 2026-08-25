// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The second factor in every printed size: how much more room the screen has
// than the 393 × 852 portrait phone every length in the app was measured on.
// The reader's own ladder is `text_size_test.ts`.
import { describe, expect, it } from "vitest";

import {
  DESK_HEIGHT,
  DESK_ROOM,
  DESK_WIDTH,
  MEASURED_HEIGHT,
  MEASURED_WIDTH,
  ROOM_MAX,
  SCOPE_MAX_WIDTH,
  roomScale,
  roomVars,
  scopeRoom,
} from "../src/app/roomScale.ts";
import { DEFAULT_TEXT_SCALE } from "../src/app/textSize.ts";
import { STYLE_SCOPES } from "../src/app/viewStyle.ts";

/** The screen the measurements were taken on. */
const PHONE = [MEASURED_WIDTH, MEASURED_HEIGHT] as const;

/** The other screen the curve is anchored on. */
const DESK = [DESK_WIDTH, DESK_HEIGHT] as const;

/** The desk screens between them and past them — the three the report this
 *  curve exists for named, which under the √area curve were one number. */
const LAPTOP = [1512, 880] as const;
const SCREEN_1080P = [1920, 1080] as const;
const SCREEN_1440P = [2560, 1440] as const;
const SCREEN_4K = [3840, 2160] as const;

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
    expect(roomScale(...SCREEN_1440P)).toBeGreaterThan(1.4);
    // …and a laptop is not a phone either.
    expect(roomScale(...LAPTOP)).toBeGreaterThan(1.2);
  });

  it("is exactly the measured factor on the desk screen it was measured on", () => {
    // The curve's second anchor. The phone's end is forced — 7.5 px is what a
    // 47 px cell can set — and this end is chosen, so it is the one that has
    // to be pinned to the number a reader actually picked.
    expect(roomScale(...DESK)).toBe(DESK_ROOM);
  });

  it("prints a desk month cell at twice the phone's measurements", () => {
    // What the anchor was chosen to mean, and the thing that regressed when
    // the reader's ladder shifted up a rung underneath it: the *default* step
    // and the desk's room together are 2, not the 3 that shipped.
    expect(DEFAULT_TEXT_SCALE * roomScale(...DESK)).toBeCloseTo(2, 1);
  });

  it("gives a laptop, a 1440p and a 4K each their own answer", () => {
    // The √area curve put all three on ROOM_MAX, so a laptop and a 5K printed
    // the same size and the cap was doing the sizing rather than backstopping
    // it. A screen with more area is set bigger, all the way up.
    const rooms = [LAPTOP, SCREEN_1080P, SCREEN_1440P, SCREEN_4K].map(
      ([w, h]) => roomScale(w, h),
    );
    for (let i = 1; i < rooms.length; i += 1) {
      expect(rooms[i]).toBeGreaterThan(rooms[i - 1] as number);
    }
  });

  it("keeps the cap a backstop rather than a working value", () => {
    // No screen anybody reads a calendar on may sit on the ceiling: a value
    // that is clamped is a value the curve is no longer answering.
    for (const [w, h] of [LAPTOP, SCREEN_1080P, SCREEN_1440P, SCREEN_4K]) {
      expect(roomScale(w, h)).toBeLessThan(ROOM_MAX);
    }
  });

  it("never grows past its cap", () => {
    for (const [w, h] of [
      [2560, 1440],
      [3840, 2160],
      [5120, 2880],
      [8192, 4608],
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
    expect(laptop).toBeLessThan(1440 / MEASURED_WIDTH);
    // Two screens of the same area are set the same, however that area is
    // shaped — the whole of what "answers on the area" means.
    expect(roomScale(MEASURED_WIDTH * 4, MEASURED_HEIGHT)).toBe(
      roomScale(MEASURED_WIDTH * 2, MEASURED_HEIGHT * 2),
    );
  });

  it("grows far slower than the screen's area does", () => {
    // The √area curve's mistake, and the one this curve is shaped against: it
    // scaled the phone's caption as though 7.5 px were a size somebody chose,
    // when it is the floor a 47 px cell forced. Five times the area is a
    // third bigger, not 2.2 times bigger.
    const fiveFold = roomScale(MEASURED_WIDTH * 5, MEASURED_HEIGHT);
    expect(fiveFold).toBeLessThan(Math.sqrt(5));
    expect(fiveFold).toBeGreaterThan(1);
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

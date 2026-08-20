// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which way a swipe turns the page. Pure, so the coercion a stored blob goes
// through is a test rather than a hope — settings are hand-editable JSON, and
// a value nobody recognises must land on the shipped default rather than on a
// deck that pages nowhere.
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SWIPE_DIRECTION,
  SWIPE_DIRECTIONS,
  showsArrows,
  swipeAxis,
  swipeDirectionOf,
} from "../src/app/navSwipe.ts";
import {
  DEFAULT_LOOK,
  DEFAULT_SETTINGS,
  LOOK_KEYS,
  swipeDirectionFor,
  updateLook,
} from "../src/app/useAppSettings.ts";

describe("the swipe direction", () => {
  it("ships paging left and right, the way the arrows point", () => {
    expect(DEFAULT_SWIPE_DIRECTION).toBe("horizontal");
    expect(DEFAULT_SETTINGS.swipeDirection).toBe("horizontal");
    expect(swipeDirectionFor(DEFAULT_LOOK)).toBe("horizontal");
  });

  it("holds a stored value to the two known directions", () => {
    for (const direction of SWIPE_DIRECTIONS) {
      expect(swipeDirectionOf(direction)).toBe(direction);
    }
    for (const junk of ["sideways", "", null, undefined, 1, {}]) {
      expect(swipeDirectionOf(junk)).toBe(DEFAULT_SWIPE_DIRECTION);
    }
  });

  it("reads out as the deck's own axis", () => {
    expect(swipeAxis("horizontal")).toBe("x");
    expect(swipeAxis("vertical")).toBe("y");
  });

  it("prints the heading's arrows only where they point the way it turns", () => {
    // Two chevrons pointing sideways over a calendar that pages up and down
    // are worse than no chevrons at all.
    expect(showsArrows("horizontal")).toBe(true);
    expect(showsArrows("vertical")).toBe(false);
  });

  it("is previewed rather than saved straight away", () => {
    // The arrows come and go with it, which is exactly the kind of answer you
    // want to see against the calendar before committing to it.
    expect(LOOK_KEYS).toContain("swipeDirection");
    const turned = updateLook(DEFAULT_LOOK, "swipeDirection", "vertical");
    expect(swipeDirectionFor(turned)).toBe("vertical");
    expect(showsArrows(swipeDirectionFor(turned))).toBe(false);
  });
});

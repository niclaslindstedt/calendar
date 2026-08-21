// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The chrome's two safe-area measurements. They were CSS arithmetic until the
// installed iOS app declined to compute it; as plain functions they can be
// asserted on a machine that has no safe areas at all, which is the point.
import { describe, expect, it } from "vitest";

import {
  bottomGutter,
  GUTTER_FLOOR,
  GUTTER_MARGIN,
  HEADER_PAD,
  HOME_INDICATOR,
  listGutter,
  LIST_EXTRA,
  safeAreaVars,
  topbarLead,
} from "../src/app/safeArea.ts";
import type { Insets } from "../src/app/viewportInfo.ts";

/** What an installed app reports on a Dynamic Island phone in portrait: the
 *  whole status-bar band on top, the home indicator's own band below. */
const ISLAND: Insets = { top: 59, right: 0, bottom: 34, left: 0 };

/** The same phone with the bottom inset reporting nothing — the shape of the
 *  bug that put the last week row under the swipe bar twice. */
const LYING: Insets = { ...ISLAND, bottom: 0 };

/** A browser tab, and a desktop window: no bands reserved anywhere. */
const FLAT: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

describe("topbarLead", () => {
  it("adds the pad to the inset in a browser tab", () => {
    // Portrait in a tab reserves nothing, so the bar just gets its `py-3`…
    expect(topbarLead(0, false)).toBe(HEADER_PAD);
    // …and a notched phone in landscape still clears the notch.
    expect(topbarLead(59, false)).toBe(59 + HEADER_PAD);
  });

  it("lets the status-bar band be the whole lead in an installed app", () => {
    // The inset already leaves room below the island; stacking the pad on top
    // of it is what put twice as much air over the buttons as under them.
    expect(topbarLead(59, true)).toBe(59);
    expect(topbarLead(20, true)).toBe(20);
  });

  it("floors an installed app on a device that reserves nothing", () => {
    // An Android PWA, a desktop window: the buttons still need their pad.
    expect(topbarLead(0, true)).toBe(HEADER_PAD);
  });
});

describe("bottomGutter", () => {
  it("clears the home indicator and adds the visible margin", () => {
    expect(bottomGutter(ISLAND, true)).toBe(HOME_INDICATOR + GUTTER_MARGIN);
  });

  it("does not take a notched phone's word for a bottom inset of 0", () => {
    // The inset is the thing that could not be trusted: a device reporting a
    // status-bar band this deep has a home indicator whatever it says about
    // the bottom, so the band's own 34 px is the floor.
    expect(bottomGutter(LYING, true)).toBe(HOME_INDICATOR + GUTTER_MARGIN);
  });

  it("keeps a floor where nothing is reserved at all", () => {
    expect(bottomGutter(FLAT, false)).toBe(GUTTER_FLOOR);
    expect(bottomGutter(FLAT, true)).toBe(GUTTER_FLOOR);
  });

  it("does not invent a home indicator for a device without a notch", () => {
    // An installed app on a phone with a 20 px status bar and no gesture bar
    // pays for neither.
    const plain: Insets = { top: 20, right: 0, bottom: 0, left: 0 };
    expect(bottomGutter(plain, true)).toBe(GUTTER_FLOOR);
  });

  it("passes a browser tab's own inset through", () => {
    // Safari in a tab reports what its chrome leaves; there is no home
    // indicator to second-guess because the toolbar is already over it.
    const tab: Insets = { top: 0, right: 0, bottom: 21, left: 0 };
    expect(bottomGutter(tab, false)).toBe(21 + GUTTER_MARGIN);
  });
});

describe("listGutter", () => {
  it("is taller than the shared gutter, by the scroller's share", () => {
    expect(listGutter(50)).toBe(50 + LIST_EXTRA);
  });
});

describe("safeAreaVars", () => {
  it("publishes the installed island phone's geometry as plain lengths", () => {
    // No `calc()`, no `env()`, no `max()` — the whole reason the values are
    // resolved here is that the device would not compute those.
    expect(safeAreaVars(ISLAND, true)).toEqual({
      "--cal-topbar-lead": "59px",
      "--cal-bottom-gutter": "58px",
      "--cal-list-gutter": "78px",
    });
  });

  it("publishes a browser tab's geometry", () => {
    expect(safeAreaVars(FLAT, false)).toEqual({
      "--cal-topbar-lead": "12px",
      "--cal-bottom-gutter": "25px",
      "--cal-list-gutter": "45px",
    });
  });
});

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The pure half of the settings store: the look subset the Settings dialog
// edits against a draft, and the rules that apply to an edit of it.
import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOOK,
  DEFAULT_SETTINGS,
  LOOK_KEYS,
  effectiveToggles,
  pickLook,
  updateLook,
} from "../src/app/useAppSettings.ts";
import { getLocale } from "../src/app/locale/index.ts";

describe("the look draft", () => {
  it("carries exactly the previewed keys", () => {
    expect(Object.keys(pickLook(DEFAULT_SETTINGS)).sort()).toEqual(
      [...LOOK_KEYS].sort(),
    );
  });

  it("defaults the entry text to shrink-to-fit", () => {
    expect(DEFAULT_LOOK.textSize).toBe("dynamic");
  });

  it("re-seats the display toggles when the country changes", () => {
    const pinned = updateLook(
      updateLook(DEFAULT_LOOK, "weekNumbers", false),
      "nameDays",
      false,
    );
    expect(pinned.weekNumbers).toBe(false);

    const switched = updateLook(pinned, "localeId", "en-GB");
    expect(switched.localeId).toBe("en-GB");
    expect(switched.weekNumbers).toBeNull();
    expect(switched.nameDays).toBeNull();
  });

  it("leaves the other look settings alone on an ordinary edit", () => {
    const next = updateLook(DEFAULT_LOOK, "textSize", "large");
    expect(next.textSize).toBe("large");
    expect(next.localeId).toBe(DEFAULT_LOOK.localeId);
    expect(next.listRows).toBe(DEFAULT_LOOK.listRows);
  });

  it("resolves the toggles from the draft, override before pack default", () => {
    const pack = getLocale(DEFAULT_LOOK.localeId);
    expect(effectiveToggles(DEFAULT_LOOK).weekNumbers).toBe(
      pack.showWeekNumbersDefault,
    );
    expect(
      effectiveToggles(updateLook(DEFAULT_LOOK, "weekNumbers", false))
        .weekNumbers,
    ).toBe(false);
  });
});

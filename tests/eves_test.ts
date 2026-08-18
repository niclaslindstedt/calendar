// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Holiday eves: what the country's collective agreements say by default, and
// what happens when the reader's own workplace says otherwise.
import { describe, expect, it } from "vitest";

import {
  EVE_STATUSES,
  coerceEveChoices,
  eveHolidays,
  eveStatus,
  getLocale,
  hasEveOverrides,
  holidayFor,
  withEveChoices,
  type Eve,
} from "../src/app/locale/index.ts";
import {
  DEFAULT_LOOK,
  LOOK_KEYS,
  eveChoices,
  updateLook,
} from "../src/app/useAppSettings.ts";

const sv = getLocale("sv-SE");
const en = getLocale("en-GB");

const eve = (id: string): Eve => {
  const found = sv.eves.find((e) => e.id === id);
  if (!found) throw new Error(`no eve ${id}`);
  return found;
};

describe("the eve list", () => {
  it("names every Swedish eve exactly once", () => {
    expect(sv.eves.map((e) => e.id)).toEqual([
      "trettondagsafton",
      "skartorsdagen",
      "valborgsmassoafton",
      "midsommarafton",
      "allhelgonaafton",
      "julafton",
      "nyarsafton",
    ]);
  });

  it("ships what most collective agreements say", () => {
    // The three the agreements hand back whole, the one that is usually a
    // half day, and the three that are simply worked.
    expect(eve("julafton").collective).toBe("off");
    expect(eve("nyarsafton").collective).toBe("off");
    expect(eve("midsommarafton").collective).toBe("off");
    expect(eve("trettondagsafton").collective).toBe("half");
    expect(eve("valborgsmassoafton").collective).toBe("work");
    expect(eve("skartorsdagen").collective).toBe("work");
    expect(eve("allhelgonaafton").collective).toBe("work");
  });

  it("gives a country without the tradition nothing to configure", () => {
    // Christmas Eve is an ordinary UK working day with no agreement handing it
    // back, so the section disappears rather than offering an empty choice.
    expect(en.eves).toEqual([]);
  });

  it("puts each eve the day before its holiday", () => {
    // 2026: Midsommardagen 20 June, Alla helgons dag 31 October, Easter 5
    // April. The fixed ones speak for themselves.
    const at = (id: string) => eve(id).date(2026);
    expect(at("midsommarafton")).toEqual({ month: 6, day: 19 });
    expect(at("allhelgonaafton")).toEqual({ month: 10, day: 30 });
    expect(at("skartorsdagen")).toEqual({ month: 4, day: 2 });
    expect(at("trettondagsafton")).toEqual({ month: 1, day: 5 });
    expect(at("valborgsmassoafton")).toEqual({ month: 4, day: 30 });
    expect(at("julafton")).toEqual({ month: 12, day: 24 });
    expect(at("nyarsafton")).toEqual({ month: 12, day: 31 });
  });

  it("never collides with a red day", () => {
    // An eve that landed on its own holiday would silently replace it in the
    // per-day lookup table, which is how a red day goes missing.
    for (const year of [2024, 2025, 2026, 2027, 2028, 2030, 2035]) {
      const red = new Set(
        sv
          .holidays(year)
          .filter((h) => h.red)
          .map((h) => `${h.month}-${h.day}`),
      );
      for (const e of sv.eves) {
        const at = e.date(year);
        expect(red.has(`${at.month}-${at.day}`)).toBe(false);
      }
    }
  });

  it("is never printed red, whatever it is worked as", () => {
    for (const h of eveHolidays(sv.eves, 2026, { julafton: "work" })) {
      expect(h.red).toBe(false);
    }
  });
});

describe("eveStatus", () => {
  it("falls back to the collective default", () => {
    expect(eveStatus(eve("julafton"), {})).toBe("off");
    expect(eveStatus(eve("valborgsmassoafton"), {})).toBe("work");
  });

  it("takes the reader's override", () => {
    expect(eveStatus(eve("julafton"), { julafton: "work" })).toBe("work");
  });

  it("reports whether anything has actually been overridden", () => {
    expect(hasEveOverrides(sv.eves, {})).toBe(false);
    // Choosing the shipped answer again is not an override — the settings
    // section offers to reset only when there is something to undo.
    expect(hasEveOverrides(sv.eves, { julafton: "off" })).toBe(false);
    expect(hasEveOverrides(sv.eves, { julafton: "half" })).toBe(true);
  });
});

describe("coerceEveChoices", () => {
  it("keeps only known ids and known statuses", () => {
    // Settings are a plain JSON blob in localStorage and a pack can lose an
    // eve between builds, so a stored map is never trusted as-is.
    expect(
      coerceEveChoices(
        { julafton: "work", gone: "off", nyarsafton: "sometimes" },
        sv.eves,
      ),
    ).toEqual({ julafton: "work" });
  });

  it("survives junk", () => {
    expect(coerceEveChoices(null, sv.eves)).toEqual({});
    expect(coerceEveChoices("nope", sv.eves)).toEqual({});
    expect(coerceEveChoices(42, sv.eves)).toEqual({});
  });

  it("covers every status it accepts", () => {
    for (const status of EVE_STATUSES) {
      expect(coerceEveChoices({ julafton: status }, sv.eves)).toEqual({
        julafton: status,
      });
    }
  });
});

describe("withEveChoices", () => {
  it("hands back the same pack when nothing differs", () => {
    // A reader who never opens the setting reads the country's own calendar,
    // and the per-year holiday tables cached against it stay warm.
    expect(withEveChoices(sv, {})).toBe(sv);
    expect(withEveChoices(sv, { julafton: "off" })).toBe(sv);
    expect(withEveChoices(en, { julafton: "work" })).toBe(en);
  });

  it("memoises a derived pack so its holiday cache survives a render", () => {
    expect(withEveChoices(sv, { julafton: "work" })).toBe(
      withEveChoices(sv, { julafton: "work" }),
    );
  });

  it("rewrites only the eves", () => {
    const worked = withEveChoices(sv, { julafton: "work" });
    expect(holidayFor(worked, 2026, 12, 24)?.off).toBe(false);
    expect(holidayFor(worked, 2026, 12, 24)?.eve).toBe("work");
    // Everything else the year names is untouched, including the other eves.
    expect(holidayFor(worked, 2026, 12, 25)?.off).toBe(true);
    expect(holidayFor(worked, 2026, 12, 31)?.off).toBe(true);
    expect(worked.holidays(2026).length).toBe(sv.holidays(2026).length);
  });

  it("does not leak one workplace's calendar into another's", () => {
    // Both packs answer to `id: "sv-SE"`, so a lookup cache keyed by the id
    // rather than the pack would serve whichever was asked first.
    const worked = withEveChoices(sv, { julafton: "work" });
    const free = withEveChoices(sv, { valborgsmassoafton: "off" });
    expect(holidayFor(worked, 2026, 12, 24)?.off).toBe(false);
    expect(holidayFor(free, 2026, 12, 24)?.off).toBe(true);
    expect(holidayFor(free, 2026, 4, 30)?.off).toBe(true);
    expect(holidayFor(sv, 2026, 12, 24)?.off).toBe(true);
  });
});

describe("the eve choices in settings", () => {
  it("travels in the previewed look", () => {
    // The calendar behind the settings dialog has to show the change before
    // it is saved, like every other look key.
    expect(LOOK_KEYS).toContain("eveDays");
  });

  it("starts out following the agreements", () => {
    expect(DEFAULT_LOOK.eveDays).toEqual({});
  });

  it("is dropped when the country changes", () => {
    // Eve ids are a country's own vocabulary; a Swedish answer means nothing
    // in another pack.
    const chosen = updateLook(DEFAULT_LOOK, "eveDays", { julafton: "work" });
    expect(updateLook(chosen, "localeId", "en-GB").eveDays).toEqual({});
  });

  it("filters a stored map against the chosen pack", () => {
    expect(
      eveChoices({
        localeId: "sv-SE",
        eveDays: { julafton: "work", nope: "off" },
      }),
    ).toEqual({ julafton: "work" });
    // The UK pack has no eves at all, so nothing survives — the case a
    // lenient read would let straight through.
    expect(
      eveChoices({ localeId: "en-GB", eveDays: { julafton: "work" } }),
    ).toEqual({});
  });
});

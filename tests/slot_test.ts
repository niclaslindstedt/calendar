// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The deployment-slot derivation (OSS_SPEC §11.5). Everything that keeps the
// three slots from colliding on one origin — PWA identity, indexability, the
// service worker's navigation scope — hangs off `slotForBase`, and the
// failures it prevents (a `/preview/` install silently running production, a
// second copy of the app in the search index) only show up on a real deployed
// device. So they get pinned here instead.
import { describe, expect, it } from "vitest";

import { cacheIdForBase } from "../src/app/pwa.ts";
import {
  isIndexable,
  navigationDenyPrefixes,
  robotsContent,
  shortRef,
  slotForBase,
  slotSuffix,
  slotTitles,
  SLOT_BASE,
} from "../src/app/slot.ts";

describe("slotForBase", () => {
  it("maps each slot's base path to its slot", () => {
    expect(slotForBase("/")).toBe("production");
    expect(slotForBase("/preview/")).toBe("preview");
    expect(slotForBase("/branch/")).toBe("branch");
  });

  it("treats an unknown base as production", () => {
    // A local build, or an ad-hoc deploy under some other prefix, should
    // behave like the copy real users get rather than like staging.
    expect(slotForBase("/calendar/")).toBe("production");
    expect(slotForBase("./")).toBe("production");
  });
});

describe("indexability", () => {
  it("indexes production only", () => {
    expect(isIndexable("production")).toBe(true);
    expect(isIndexable("preview")).toBe(false);
    expect(isIndexable("branch")).toBe(false);
  });

  it("emits noindex for the secondary slots", () => {
    expect(robotsContent("production")).toContain("index,follow");
    expect(robotsContent("preview")).toBe("noindex,nofollow");
    expect(robotsContent("branch")).toBe("noindex,nofollow");
  });
});

describe("PWA identity", () => {
  it("gives every slot a distinct precache id", () => {
    const ids = Object.values(SLOT_BASE).map(cacheIdForBase);
    expect(new Set(ids).size).toBe(ids.length);
    expect(cacheIdForBase("/")).toBe("calendar");
    expect(cacheIdForBase("/preview/")).toBe("calendar-preview");
  });

  it("names the installed app per slot", () => {
    const names = (["production", "preview", "branch"] as const).map(
      (s) => slotTitles(s).shortName,
    );
    expect(new Set(names).size).toBe(3);
    expect(slotTitles("production").shortName).toBe("Calendar");
  });
});

describe("navigationDenyPrefixes", () => {
  it("keeps the root worker off the other slots", () => {
    // The production worker is scoped at `/`, which spans the other slots
    // too — without this it would serve the production shell at /preview/.
    expect(navigationDenyPrefixes("production")).toEqual([
      "/preview/",
      "/branch/",
    ]);
  });

  it("needs no denylist for a scoped slot", () => {
    expect(navigationDenyPrefixes("preview")).toEqual([]);
    expect(navigationDenyPrefixes("branch")).toEqual([]);
  });
});

describe("build label suffix", () => {
  it("leaves production unsuffixed", () => {
    expect(slotSuffix("production")).toBe("");
    expect(slotSuffix("production", "some-branch")).toBe("");
  });

  it("marks staging and branch builds", () => {
    expect(slotSuffix("preview")).toBe("pre");
    expect(slotSuffix("branch")).toBe("br");
    expect(slotSuffix("branch", "refs/heads/feat/month-images")).toBe(
      "br-feat-month-images",
    );
  });

  it("normalises and clamps the source ref", () => {
    expect(shortRef("refs/heads/fix/週")).toBe("fix");
    expect(shortRef(undefined)).toBe("");
    expect(shortRef("a".repeat(40)).length).toBe(24);
    // No trailing separator once the clamp lands mid-token.
    expect(shortRef(`${"a".repeat(24)}/tail`)).not.toMatch(/-$/);
  });
});

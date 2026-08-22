// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Emptying a calendar. Two things are worth pinning down: a reset names the
// right documents (and never turns "empty this calendar" into "empty
// nothing"), and what it leaves behind is an empty document rather than an
// absent one — the calendar is still there afterwards.
import { describe, expect, it } from "vitest";

import {
  clearedDocuments,
  noteCount,
  resetTargets,
} from "../src/app/storage/reset.ts";
import { DOC_VERSION } from "../src/app/types.ts";

const LIST = [{ slug: "default" }, { slug: "work" }, { slug: "band" }] as const;

describe("resetTargets", () => {
  it("names only the calendar on screen at the active scope", () => {
    expect(resetTargets(LIST, "work", "active")).toEqual(["work"]);
  });

  it("names every calendar at the all scope, in registry order", () => {
    expect(resetTargets(LIST, "work", "all")).toEqual([
      "default",
      "work",
      "band",
    ]);
  });

  it("keeps the active calendar even when the registry has lost it", () => {
    expect(resetTargets(LIST, "ghost", "active")).toEqual(["ghost"]);
    expect(resetTargets(LIST, "ghost", "all")).toEqual([
      "default",
      "work",
      "band",
      "ghost",
    ]);
  });

  it("names each calendar once", () => {
    const dupes = [{ slug: "default" }, { slug: "default" }];
    expect(resetTargets(dupes, "default", "all")).toEqual(["default"]);
  });

  it("has something to empty even with an empty registry", () => {
    expect(resetTargets([], "default", "all")).toEqual(["default"]);
  });
});

describe("clearedDocuments", () => {
  it("leaves one empty document per calendar, at the current version", () => {
    const cleared = clearedDocuments(["default", "work"]);
    expect(Object.keys(cleared)).toEqual(["default", "work"]);
    for (const doc of Object.values(cleared)) {
      expect(doc).toEqual({ version: DOC_VERSION, entries: {} });
    }
  });

  it("gives each calendar a document of its own", () => {
    const cleared = clearedDocuments(["default", "work"]);
    cleared.default!.entries["2026-08-22"] = "not shared";
    expect(cleared.work!.entries).toEqual({});
  });
});

describe("noteCount", () => {
  it("counts the days a document holds", () => {
    expect(noteCount({ version: DOC_VERSION, entries: {} })).toBe(0);
    expect(
      noteCount({
        version: DOC_VERSION,
        entries: { "2026-08-22": "Dinner", "2026-08-23": "Run" },
      }),
    ).toBe(2);
  });
});

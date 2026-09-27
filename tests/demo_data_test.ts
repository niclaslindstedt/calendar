// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The store demo (`VITE_SEED=demo`): the calendars it boots onto, held to the
// app's own document format, to dates relative to the moment it opens, to
// staying off the device, and to the premise of each store frame
// (ops/store/calendar/STRATEGY.md is the brief).
import { describe, expect, it } from "vitest";

import { addDays, dayKeyOf } from "@niclaslindstedt/oss-framework/calendar";

import { demoStorage, MemoryStorage } from "../src/app/dev/demo.ts";
import {
  TALK_NOTE,
  WORK_SLUG,
  buildDemoDocs,
  buildPersonalDoc,
  mondayOf,
} from "../src/app/dev/demoData.ts";
import { parseDocument } from "../src/app/migrations.ts";
import {
  DEFAULT_CALENDAR_SLUG,
  documentKey,
} from "../src/app/storage/paths.ts";
import { serializeDoc } from "../src/app/types.ts";

// A Saturday, local time — the day the store set is shot on.
const NOW = new Date(2026, 8, 26, 9, 41);

describe("demo calendars", () => {
  it("are deterministic for a moment", () => {
    expect(buildDemoDocs(NOW)).toEqual(buildDemoDocs(new Date(NOW)));
  });

  it("move with the moment they open — every date is relative", () => {
    const later = new Date(NOW);
    later.setDate(later.getDate() + 7);
    const a = buildPersonalDoc(NOW).entries;
    const b = buildPersonalDoc(later).entries;
    const shifted = Object.fromEntries(
      Object.entries(a).map(([day, text]) => [addDays(day, 7), text]),
    );
    expect(b).toEqual(shifted);
  });

  it("round-trip through the app's own document parser", () => {
    for (const doc of Object.values(buildDemoDocs(NOW))) {
      expect(parseDocument(serializeDoc(doc))).toEqual(doc);
    }
  });

  it("fill the personal and the work calendar the app seeds", () => {
    const docs = buildDemoDocs(NOW);
    expect(Object.keys(docs).sort()).toEqual(
      [DEFAULT_CALENDAR_SLUG, WORK_SLUG].sort(),
    );
    expect(Object.keys(docs[WORK_SLUG]!.entries).length).toBeGreaterThan(10);
  });
});

describe("the frames' premises", () => {
  const entries = buildPersonalDoc(NOW).entries;
  const monday = mondayOf(NOW);

  it("this week is the busy one: a note every day, on call from Monday", () => {
    const week = Array.from(
      { length: 7 },
      (_, i) => entries[addDays(monday, i)],
    );
    expect(week.every(Boolean)).toBe(true);
    expect(week[0]).toMatch(/^On-call/);
    // Two lines each — the week planner's rows have room for them.
    expect(week.every((text) => text!.split("\n").length === 2)).toBe(true);
  });

  it("and it still is in a calendar whose week starts on Sunday", () => {
    // The US pack's week around a Saturday: the Sunday before this Monday,
    // then Monday to Saturday — the week planner's frame in the US.
    const week = Array.from(
      { length: 7 },
      (_, i) => entries[addDays(monday, i - 1)],
    );
    expect(week.every(Boolean)).toBe(true);
    expect(week[1]).toMatch(/^On-call/);
    expect(week.every((text) => text!.split("\n").length === 2)).toBe(true);
  });

  it("the talk is next Thursday, and long enough to want its own page", () => {
    expect(entries[addDays(monday, 7 + 3)]).toBe(TALK_NOTE);
    expect(TALK_NOTE.split("\n").length).toBeGreaterThanOrEqual(4);
  });

  it("every other note fits a phone's month cell — no word over seven letters", () => {
    for (const text of Object.values(entries)) {
      if (text === TALK_NOTE) continue;
      for (const word of text.split(/[\s/]+/)) {
        const letters = word.replace(/[^\p{L}\p{N}'-]/gu, "");
        expect(letters.length, `"${word}" in "${text}"`).toBeLessThanOrEqual(7);
      }
    }
  });

  it("whatever day it is, the month on screen is busy but not a wall", () => {
    for (let d = 0; d < 366; d++) {
      const now = new Date(2026, 0, 1 + d, 12);
      const notes = buildPersonalDoc(now).entries;
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      let filled = 0;
      let previous: string | undefined;
      for (let i = 0; i < days; i++) {
        const text = notes[addDays(dayKeyOf(first), i)];
        if (text) filled++;
        // No two neighbouring days say the same thing.
        if (text) expect(text).not.toBe(previous);
        previous = text;
      }
      expect(filled / days, dayKeyOf(now)).toBeGreaterThan(0.5);
      expect(filled / days, dayKeyOf(now)).toBeLessThan(0.9);
    }
  });
});

describe("the demo's storage", () => {
  function device(): MemoryStorage {
    const store = new MemoryStorage();
    store.setItem(
      "calendar:settings",
      JSON.stringify({ backend: "dropbox", demoData: true, weekNumbers: true }),
    );
    store.setItem("calendar:appearance", '{"theme":"nord"}');
    store.setItem("calendar:language", "sv");
    store.setItem(
      "calendar:document",
      '{"version":1,"entries":{"2026-01-01":"mine"}}',
    );
    store.setItem("calendar:calendars", "private registry");
    store.setItem("calendar:dropbox:access", "token");
    store.setItem("calendar:contacts:selected", '["a"]');
    return store;
  }

  it("carries the device's look and nothing else", () => {
    const memory = demoStorage(device(), NOW);
    expect(memory.getItem("calendar:appearance")).toBe('{"theme":"nord"}');
    expect(memory.getItem("calendar:language")).toBe("sv");
    expect(memory.getItem("calendar:dropbox:access")).toBeNull();
    expect(memory.getItem("calendar:calendars")).toBeNull();
    expect(memory.getItem("calendar:contacts:selected")).toBeNull();
    expect(memory.getItem("calendar:document")).not.toContain("mine");
  });

  it("saves through the browser backend, into memory", () => {
    const memory = demoStorage(device(), NOW);
    const settings = JSON.parse(memory.getItem("calendar:settings")!);
    expect(settings).toMatchObject({
      backend: "browser",
      demoData: false,
      weekNumbers: true,
    });
    expect(memory.getItem("calendar:backend")).toBe("browser");
    for (const [slug, doc] of Object.entries(buildDemoDocs(NOW))) {
      expect(parseDocument(memory.getItem(documentKey(slug))!)).toEqual(doc);
    }
  });

  it("leaves the device untouched", () => {
    const store = device();
    const before = JSON.stringify(
      Array.from({ length: store.length }, (_, i) => [
        store.key(i),
        store.getItem(store.key(i)!),
      ]),
    );
    demoStorage(store, NOW);
    const after = JSON.stringify(
      Array.from({ length: store.length }, (_, i) => [
        store.key(i),
        store.getItem(store.key(i)!),
      ]),
    );
    expect(after).toBe(before);
  });
});

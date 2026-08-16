// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  buildDemoDoc,
  createDemoAdapter,
} from "../src/app/storage/demoAdapter.ts";
import { coerceDoc } from "../src/app/types.ts";

// A fixed anchor keeps the demo deterministic under test.
const ANCHOR = new Date(2026, 7, 16); // 16 August 2026, local time

describe("demo data backend", () => {
  it("builds entries in the anchor month and the next", () => {
    const doc = buildDemoDoc(ANCHOR);
    const keys = Object.keys(doc.entries);
    expect(keys.length).toBeGreaterThan(10);
    expect(keys.some((k) => k.startsWith("2026-08-"))).toBe(true);
    expect(keys.some((k) => k.startsWith("2026-09-"))).toBe(true);
  });

  it("wraps December into January of the next year", () => {
    const doc = buildDemoDoc(new Date(2026, 11, 5));
    const keys = Object.keys(doc.entries);
    expect(keys.some((k) => k.startsWith("2026-12-"))).toBe(true);
    expect(keys.some((k) => k.startsWith("2027-01-"))).toBe(true);
  });

  it("serves the doc through the StorageAdapter contract", async () => {
    const adapter = createDemoAdapter(ANCHOR);
    const snapshot = await adapter.load();
    expect(snapshot).not.toBeNull();
    const doc = coerceDoc(JSON.parse(snapshot!.text));
    expect(Object.keys(doc.entries).length).toBeGreaterThan(10);
  });

  it("round-trips saves in memory only", async () => {
    const adapter = createDemoAdapter(ANCHOR);
    await adapter.save('{"version":1,"entries":{"2026-08-01":"x"}}');
    const back = await adapter.load();
    expect(JSON.parse(back!.text).entries["2026-08-01"]).toBe("x");
    // A fresh adapter starts pristine — nothing persisted anywhere.
    const fresh = createDemoAdapter(ANCHOR);
    const pristine = await fresh.load();
    expect(JSON.parse(pristine!.text).entries["2026-08-01"]).toBeUndefined();
  });
});

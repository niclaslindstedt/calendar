// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { flattenCatalog } from "@niclaslindstedt/oss-framework/i18n";

import { en } from "../src/app/i18n/en.ts";
import { sv } from "../src/app/i18n/sv.ts";

describe("i18n catalogs", () => {
  it("Swedish covers exactly the English key set", () => {
    const enKeys = [...flattenCatalog(en).keys()].sort();
    const svKeys = [...flattenCatalog(sv).keys()].sort();
    expect(svKeys).toEqual(enKeys);
  });

  it("no catalog leaf is empty", () => {
    for (const [key, value] of flattenCatalog(en)) {
      expect(value.trim(), `en:${key}`).not.toBe("");
    }
    for (const [key, value] of flattenCatalog(sv)) {
      expect(value.trim(), `sv:${key}`).not.toBe("");
    }
  });
});

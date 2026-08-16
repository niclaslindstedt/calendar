// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { migrator } from "../src/app/migrations.ts";
import {
  DOC_VERSION,
  coerceDoc,
  emptyDoc,
  serializeDoc,
} from "../src/app/types.ts";

describe("document model", () => {
  it("round-trips through serialization", () => {
    const doc = emptyDoc();
    doc.entries["2026-08-16"] = "Dinner Ada 18:00";
    const back = coerceDoc(JSON.parse(serializeDoc(doc)));
    expect(back).toEqual(doc);
  });

  it("coerces garbage to an empty document", () => {
    expect(coerceDoc(null)).toEqual(emptyDoc());
    expect(coerceDoc("nope")).toEqual(emptyDoc());
    expect(coerceDoc({ entries: 7 })).toEqual(emptyDoc());
  });

  it("drops empty and non-string entries", () => {
    const doc = coerceDoc({
      version: DOC_VERSION,
      entries: { "2026-01-01": "", "2026-01-02": 5, "2026-01-03": "ok" },
    });
    expect(Object.keys(doc.entries)).toEqual(["2026-01-03"]);
  });
});

describe("migrations", () => {
  it("stamps fresh documents at the latest version", () => {
    expect(emptyDoc().version).toBe(migrator.latestVersion);
  });

  it("upgrades a v0 bare map into the envelope", () => {
    const { data, migrated } = migrator.migrate({
      "2025-12-24": "Julafton hos mormor",
    });
    expect(migrated).toBe(true);
    const doc = coerceDoc(data);
    expect(doc.version).toBe(DOC_VERSION);
    expect(doc.entries["2025-12-24"]).toBe("Julafton hos mormor");
  });

  it("passes a current document through untouched", () => {
    const doc = emptyDoc();
    doc.entries["2026-02-01"] = "x";
    const { data, migrated } = migrator.migrate(JSON.parse(serializeDoc(doc)));
    expect(migrated).toBe(false);
    expect(coerceDoc(data)).toEqual(doc);
  });
});

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  DEFAULT_NAMESPACE_SLUG,
  addNamespace,
  normalizeNamespaces,
} from "@niclaslindstedt/oss-framework/namespaces";

import {
  cacheScope,
  documentFileName,
  documentKey,
} from "../src/app/storage/paths.ts";

describe("namespace storage paths", () => {
  // The upgrade contract: a calendar written before namespaces existed lives
  // at the un-suffixed names, and the default namespace has to keep pointing
  // at exactly those — otherwise the feature lands as data loss.
  it("leaves the default namespace's locations un-suffixed", () => {
    expect(documentKey(DEFAULT_NAMESPACE_SLUG)).toBe("calendar:document");
    expect(documentFileName(DEFAULT_NAMESPACE_SLUG)).toBe("calendar.json");
    expect(cacheScope(DEFAULT_NAMESPACE_SLUG)).toBe("calendar");
  });

  it("treats an empty slug as the default namespace", () => {
    expect(documentKey("")).toBe(documentKey(DEFAULT_NAMESPACE_SLUG));
    expect(documentFileName("")).toBe(documentFileName(DEFAULT_NAMESPACE_SLUG));
    expect(cacheScope("")).toBe(cacheScope(DEFAULT_NAMESPACE_SLUG));
  });

  it("gives every other namespace its own document", () => {
    expect(documentKey("work")).toBe("calendar:document:work");
    expect(documentFileName("work")).toBe("calendar.work.json");
    expect(cacheScope("work")).toBe("calendar:work");
  });

  it("never collides across namespaces", () => {
    const slugs = [DEFAULT_NAMESPACE_SLUG, "work", "shared", "work-2"];
    for (const name of [documentKey, documentFileName, cacheScope]) {
      const seen = new Set(slugs.map(name));
      expect(seen.size, name.name).toBe(slugs.length);
    }
  });

  // The registry allocates slugs; the naming above has to survive whatever it
  // hands out, including the disambiguating suffix two same-named namespaces
  // get and the reserved default slug a new namespace can never take.
  it("names the slugs the registry actually allocates", () => {
    let list = normalizeNamespaces([{ slug: DEFAULT_NAMESPACE_SLUG }]);
    const created: string[] = [];
    for (const name of ["Work", "Work", "Default"]) {
      const added = addNamespace(list, name);
      list = added.list;
      created.push(added.created.slug);
    }
    expect(created).not.toContain(DEFAULT_NAMESPACE_SLUG);
    const files = created.map(documentFileName);
    expect(new Set(files).size).toBe(created.length);
    for (const file of files) {
      expect(file).toMatch(/^calendar\.[a-z0-9-]+\.json$/);
    }
  });
});

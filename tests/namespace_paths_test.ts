// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  DEFAULT_NAMESPACE_SLUG,
  addNamespace,
  normalizeNamespaces,
} from "@niclaslindstedt/oss-framework/namespaces";

import {
  DROPBOX_DOCUMENT_FILE,
  cacheScope,
  documentFileName,
  documentKey,
  dropboxDisplayPath,
  dropboxNamespaceFolder,
  dropboxRootPath,
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

describe("Dropbox namespace folders", () => {
  // Dropbox holds a namespace as a folder rather than a suffixed file name,
  // so the app folder reads as the list of calendars the switcher shows.
  it("gives every namespace a folder of its own, the document inside it", () => {
    expect(dropboxRootPath("work")).toBe("/work");
    expect(dropboxDisplayPath("nird-calendar", "work")).toBe(
      "Apps/nird-calendar/work/calendar.json",
    );
  });

  // The default namespace is a folder like any other — nothing sits loose at
  // the app folder's root, so a second device sees one uniform layout.
  it("files the default namespace in a folder too", () => {
    expect(dropboxRootPath(DEFAULT_NAMESPACE_SLUG)).toBe(
      `/${DEFAULT_NAMESPACE_SLUG}`,
    );
    expect(dropboxDisplayPath("nird-calendar", DEFAULT_NAMESPACE_SLUG)).toBe(
      `Apps/nird-calendar/${DEFAULT_NAMESPACE_SLUG}/${DROPBOX_DOCUMENT_FILE}`,
    );
  });

  it("treats an empty slug as the default namespace", () => {
    expect(dropboxRootPath("")).toBe(dropboxRootPath(DEFAULT_NAMESPACE_SLUG));
  });

  // The file name is the same in every folder: what tells two calendars apart
  // is the folder, so the path as a whole still has to be unique.
  it("never collides across namespaces", () => {
    const slugs = [DEFAULT_NAMESPACE_SLUG, "work", "shared", "work-2"];
    const paths = new Set(slugs.map((slug) => dropboxRootPath(slug)));
    expect(paths.size).toBe(slugs.length);
  });

  // The registry allocates slugs; every one of them has to name a folder
  // Dropbox will accept — no separators, no leading or trailing dots/spaces.
  it("names the slugs the registry actually allocates", () => {
    let list = normalizeNamespaces([{ slug: DEFAULT_NAMESPACE_SLUG }]);
    const created: string[] = [];
    for (const name of ["Work", "Work", "Sommarstuga & båt"]) {
      const added = addNamespace(list, name);
      list = added.list;
      created.push(added.created.slug);
    }
    for (const slug of [...created, DEFAULT_NAMESPACE_SLUG]) {
      expect(dropboxNamespaceFolder(slug)).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

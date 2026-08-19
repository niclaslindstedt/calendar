// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  addNamespace as addCalendar,
  normalizeNamespaces as normalizeCalendars,
} from "@niclaslindstedt/oss-framework/namespaces";

import {
  DEFAULT_CALENDAR_SLUG,
  DROPBOX_DOCUMENT_FILE,
  cacheScope,
  documentFileName,
  documentKey,
  dropboxCalendarFolder,
  dropboxDisplayPath,
  dropboxRootPath,
} from "../src/app/storage/paths.ts";

describe("calendar storage paths", () => {
  // The upgrade contract: a calendar written before there were several lives
  // at the un-suffixed names, and the default calendar has to keep pointing
  // at exactly those — otherwise the feature lands as data loss.
  it("leaves the default calendar's locations un-suffixed", () => {
    expect(documentKey(DEFAULT_CALENDAR_SLUG)).toBe("calendar:document");
    expect(documentFileName(DEFAULT_CALENDAR_SLUG)).toBe("calendar.json");
    expect(cacheScope(DEFAULT_CALENDAR_SLUG)).toBe("calendar");
  });

  it("treats an empty slug as the default calendar", () => {
    expect(documentKey("")).toBe(documentKey(DEFAULT_CALENDAR_SLUG));
    expect(documentFileName("")).toBe(documentFileName(DEFAULT_CALENDAR_SLUG));
    expect(cacheScope("")).toBe(cacheScope(DEFAULT_CALENDAR_SLUG));
  });

  it("gives every other calendar its own document", () => {
    expect(documentKey("work")).toBe("calendar:document:work");
    expect(documentFileName("work")).toBe("calendar.work.json");
    expect(cacheScope("work")).toBe("calendar:work");
  });

  it("never collides across calendars", () => {
    const slugs = [DEFAULT_CALENDAR_SLUG, "work", "shared", "work-2"];
    for (const name of [documentKey, documentFileName, cacheScope]) {
      const seen = new Set(slugs.map(name));
      expect(seen.size, name.name).toBe(slugs.length);
    }
  });

  // The registry allocates slugs; the naming above has to survive whatever it
  // hands out, including the disambiguating suffix two same-named calendars
  // get and the reserved default slug a new calendar can never take.
  it("names the slugs the registry actually allocates", () => {
    let list = normalizeCalendars([{ slug: DEFAULT_CALENDAR_SLUG }]);
    const created: string[] = [];
    for (const name of ["Work", "Work", "Default"]) {
      const added = addCalendar(list, name);
      list = added.list;
      created.push(added.created.slug);
    }
    expect(created).not.toContain(DEFAULT_CALENDAR_SLUG);
    const files = created.map(documentFileName);
    expect(new Set(files).size).toBe(created.length);
    for (const file of files) {
      expect(file).toMatch(/^calendar\.[a-z0-9-]+\.json$/);
    }
  });
});

describe("Dropbox calendar folders", () => {
  // Dropbox holds a calendar as a folder rather than a suffixed file name, so
  // the app folder reads as the list of calendars the switcher shows.
  it("gives every calendar a folder of its own, the document inside it", () => {
    expect(dropboxRootPath("work")).toBe("/work");
    expect(dropboxDisplayPath("nird-calendar", "work")).toBe(
      "Apps/nird-calendar/work/calendar.json",
    );
  });

  // The default calendar is a folder like any other — nothing sits loose at
  // the app folder's root, so a second device sees one uniform layout.
  it("files the default calendar in a folder too", () => {
    expect(dropboxRootPath(DEFAULT_CALENDAR_SLUG)).toBe(
      `/${DEFAULT_CALENDAR_SLUG}`,
    );
    expect(dropboxDisplayPath("nird-calendar", DEFAULT_CALENDAR_SLUG)).toBe(
      `Apps/nird-calendar/${DEFAULT_CALENDAR_SLUG}/${DROPBOX_DOCUMENT_FILE}`,
    );
  });

  it("treats an empty slug as the default calendar", () => {
    expect(dropboxRootPath("")).toBe(dropboxRootPath(DEFAULT_CALENDAR_SLUG));
  });

  // The file name is the same in every folder: what tells two calendars apart
  // is the folder, so the path as a whole still has to be unique.
  it("never collides across calendars", () => {
    const slugs = [DEFAULT_CALENDAR_SLUG, "work", "shared", "work-2"];
    const paths = new Set(slugs.map((slug) => dropboxRootPath(slug)));
    expect(paths.size).toBe(slugs.length);
  });

  // The registry allocates slugs; every one of them has to name a folder
  // Dropbox will accept — no separators, no leading or trailing dots/spaces.
  it("names the slugs the registry actually allocates", () => {
    let list = normalizeCalendars([{ slug: DEFAULT_CALENDAR_SLUG }]);
    const created: string[] = [];
    for (const name of ["Work", "Work", "Sommarstuga & båt"]) {
      const added = addCalendar(list, name);
      list = added.list;
      created.push(added.created.slug);
    }
    for (const slug of [...created, DEFAULT_CALENDAR_SLUG]) {
      expect(dropboxCalendarFolder(slug)).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

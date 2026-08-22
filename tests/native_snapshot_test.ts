// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The native wrapper's widget snapshot (`native/src/snapshot.ts`).
//
// This is the one place in the repo where the web app's storage layout is
// read by something that is not the web app. `native/` is outside the root
// install and has its own dependency tree, so nothing there is otherwise
// exercised by `make test` — and the failure mode if it rots is silent: the
// widgets keep rendering, showing an empty calendar forever. Hence a test in
// the ROOT suite, over the pure module, with no expo or react-native in sight.
//
// The keys asserted here are deliberately spelled out as literals rather than
// imported from `src/app/storage/`: the point is to fail when the app moves a
// key, which importing the app's own constant would hide.

import { describe, expect, it } from "vitest";

import { LOCALES } from "../src/app/locale/index.ts";
import {
  MAX_NOTE_CHARS,
  SNAPSHOT_VERSION,
  WEEK_RULES,
  WINDOW_DAYS_AHEAD,
  WINDOW_DAYS_BACK,
  activeCalendar,
  buildSnapshot,
  cacheScope,
  documentKey,
  localCacheKey,
  readEntries,
  readLocale,
  shiftDay,
  snapshotSignature,
  weekRules,
  type PageReport,
} from "../native/src/snapshot.ts";

const NOW = new Date(2026, 2, 15, 9, 30); // 2026-03-15, local time

const doc = (entries: Record<string, string>) =>
  JSON.stringify({ version: 1, entries });

const report = (storage: Record<string, string>): PageReport => ({
  storage,
  theme: {},
});

describe("storage keys", () => {
  it("keeps the default calendar on the un-suffixed names", () => {
    // The app's first calendar has to keep reading what a single-calendar
    // install wrote, so these two are not free to change.
    expect(documentKey("default")).toBe("calendar:document");
    expect(cacheScope("default")).toBe("calendar");
  });

  it("suffixes every other calendar", () => {
    expect(documentKey("work")).toBe("calendar:document:work");
    expect(cacheScope("work")).toBe("calendar:work");
  });

  it("mirrors the framework's offline-cache key", () => {
    expect(localCacheKey("dropbox", "calendar:work")).toBe(
      "oss:cache:dropbox:calendar:work",
    );
  });
});

describe("activeCalendar", () => {
  it("reads the name and colour off the registry", () => {
    const found = activeCalendar({
      "calendar:calendars": JSON.stringify([
        { slug: "default", name: "Personal" },
        { slug: "work", name: "Work", color: "#61afef" },
      ]),
      "calendar:calendar:active": "work",
    });
    expect(found).toEqual({ slug: "work", name: "Work", color: "#61afef" });
  });

  it("falls back to the default when the pointer names a gone calendar", () => {
    const found = activeCalendar({
      "calendar:calendars": JSON.stringify([{ slug: "default", name: "Mine" }]),
      "calendar:calendar:active": "deleted",
    });
    expect(found.slug).toBe("default");
  });

  it("survives an empty or corrupt registry", () => {
    expect(activeCalendar({}).slug).toBe("default");
    expect(activeCalendar({ "calendar:calendars": "{{" }).slug).toBe("default");
  });
});

describe("readEntries", () => {
  it("reads the browser backend's document straight out of localStorage", () => {
    const entries = readEntries(
      { "calendar:document": doc({ "2026-03-15": "Dentist" }) },
      "browser",
      "default",
    );
    expect(entries).toEqual({ "2026-03-15": "Dentist" });
  });

  it("reads a remote backend through the framework's offline mirror", () => {
    // Dropbox/Drive/folder keep the authoritative copy elsewhere; the mirror
    // is what makes the widget correct with no network.
    const entries = readEntries(
      {
        "oss:cache:dropbox:calendar:work": JSON.stringify({
          text: doc({ "2026-03-16": "Standup" }),
        }),
      },
      "dropbox",
      "work",
    );
    expect(entries).toEqual({ "2026-03-16": "Standup" });
  });

  it("drops blank and non-string notes", () => {
    const entries = readEntries(
      {
        "calendar:document": JSON.stringify({
          version: 1,
          entries: { "2026-03-15": "  ", "2026-03-16": 7, "2026-03-17": "ok" },
        }),
      },
      "browser",
      "default",
    );
    expect(entries).toEqual({ "2026-03-17": "ok" });
  });
});

describe("readLocale", () => {
  it("takes the country pack from the app's settings", () => {
    expect(readLocale({ "calendar:settings": '{"localeId":"sv-SE"}' })).toBe(
      "sv-SE",
    );
  });

  it("falls back when settings are absent or unparseable", () => {
    expect(readLocale({})).toBe("en-GB");
    expect(readLocale({ "calendar:settings": "nonsense" })).toBe("en-GB");
  });
});

describe("week rules", () => {
  // `native/src/snapshot.ts` mirrors each pack's `weekStartsOn` and
  // `restWeekdays`, because the wrapper cannot import app code. These two
  // tests are the whole justification for that duplication: they read the
  // REAL packs, so the mirror cannot drift without CI going red, and a new
  // country pack cannot be added without adding its row.
  it("matches every shipped country pack", () => {
    for (const pack of LOCALES) {
      expect(weekRules(pack.id)).toEqual({
        startsOn: pack.weekStartsOn,
        restDays: [...pack.restWeekdays],
      });
    }
  });

  it("has a row for every pack and no rows for packs that don't exist", () => {
    expect(Object.keys(WEEK_RULES).sort()).toEqual(
      LOCALES.map((pack) => pack.id).sort(),
    );
  });

  it("falls back rather than throwing on a locale it has never heard of", () => {
    expect(weekRules("xx-XX")).toEqual({ startsOn: 1, restDays: [0, 6] });
  });

  it("hands out a copy, so a caller cannot mutate the table", () => {
    weekRules("sv-SE").restDays.push(3);
    expect(weekRules("sv-SE").restDays).toEqual([0, 6]);
  });
});

describe("buildSnapshot", () => {
  it("windows the notes around today and sorts them", () => {
    const snapshot = buildSnapshot(
      report({
        "calendar:document": doc({
          "2025-12-24": "too far back",
          "2026-03-14": "yesterday",
          "2026-03-16": "tomorrow",
          "2026-03-15": "today",
          "2027-01-01": "too far ahead",
        }),
      }),
      NOW,
    );
    expect(snapshot.days.map((day) => day.date)).toEqual([
      "2026-03-14",
      "2026-03-15",
      "2026-03-16",
    ]);
  });

  it("reaches back far enough to cover the whole of the current week", () => {
    // The week widgets print the week TODAY is in, and on the last day of the
    // week that week began six days ago. A window that only reached back a
    // day or two would leave those notes out of the snapshot entirely, and
    // the widget would show a half-empty week with no way to tell why.
    expect(WINDOW_DAYS_BACK).toBeGreaterThanOrEqual(6);

    // 2026-03-15 is a Sunday — the last day of a Monday-start week.
    const sunday = new Date(2026, 2, 15);
    expect(sunday.getDay()).toBe(0);
    const snapshot = buildSnapshot(
      report({
        "calendar:document": doc({
          "2026-03-09": "Monday, the start of this week",
          "2026-03-15": "Sunday, today",
        }),
      }),
      sunday,
    );
    expect(snapshot.days.map((day) => day.date)).toEqual([
      "2026-03-09",
      "2026-03-15",
    ]);
  });

  it("carries the active pack's week rules", () => {
    const snapshot = buildSnapshot(
      report({ "calendar:settings": '{"localeId":"sv-SE"}' }),
      NOW,
    );
    expect(snapshot.week).toEqual({ startsOn: 1, restDays: [0, 6] });
  });

  it("includes the last day of the window and excludes the next one", () => {
    // Derived from the constants rather than written out, so widening the
    // window is a one-line change instead of a test to go and fix.
    const snapshot = buildSnapshot(
      report({
        "calendar:document": doc({
          [shiftDay(NOW, WINDOW_DAYS_AHEAD)]: "last day ahead, in",
          [shiftDay(NOW, WINDOW_DAYS_AHEAD + 1)]: "out",
          [shiftDay(NOW, -WINDOW_DAYS_BACK)]: "first day back, in",
          [shiftDay(NOW, -WINDOW_DAYS_BACK - 1)]: "out",
        }),
      }),
      NOW,
    );
    expect(snapshot.days.map((day) => day.text)).toEqual([
      "first day back, in",
      "last day ahead, in",
    ]);
  });

  it("clips a note to what a widget can show", () => {
    const snapshot = buildSnapshot(
      report({ "calendar:document": doc({ "2026-03-15": "x".repeat(1000) }) }),
      NOW,
    );
    expect(snapshot.days[0]?.text).toHaveLength(MAX_NOTE_CHARS);
  });

  it("carries the calendar, the locale and the reported theme", () => {
    const snapshot = buildSnapshot(
      {
        storage: {
          "calendar:calendars": JSON.stringify([
            { slug: "default", name: "Personal", color: "#6fe3a3" },
          ]),
          "calendar:settings": '{"localeId":"sv-SE"}',
        },
        theme: { background: "#101418", foreground: "#e6edf3" },
      },
      NOW,
    );
    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
    expect(snapshot.calendar).toEqual({ name: "Personal", color: "#6fe3a3" });
    expect(snapshot.locale).toBe("sv-SE");
    expect(snapshot.theme.background).toBe("#101418");
    // A colour the page did not report falls back rather than going blank.
    expect(snapshot.theme.accent).toBe("#0969da");
  });

  it("yields an empty calendar rather than throwing on junk", () => {
    const snapshot = buildSnapshot(report({ "calendar:document": "{{" }), NOW);
    expect(snapshot.days).toEqual([]);
  });
});

describe("snapshotSignature", () => {
  it("ignores the timestamp, so an unchanged calendar is not republished", () => {
    const storage = { "calendar:document": doc({ "2026-03-15": "Dentist" }) };
    const first = buildSnapshot(report(storage), NOW);
    const later = buildSnapshot(report(storage), new Date(2026, 2, 15, 11, 0));
    expect(snapshotSignature(first)).toBe(snapshotSignature(later));
  });

  it("changes when a note does", () => {
    const before = buildSnapshot(
      report({ "calendar:document": doc({ "2026-03-15": "Dentist" }) }),
      NOW,
    );
    const after = buildSnapshot(
      report({ "calendar:document": doc({ "2026-03-15": "Dentist, 14:00" }) }),
      NOW,
    );
    expect(snapshotSignature(before)).not.toBe(snapshotSignature(after));
  });
});

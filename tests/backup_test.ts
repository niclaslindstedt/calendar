// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The backup file and what an import means for the device it lands on. The
// merge is the part worth pinning down: an import must never lose a day
// neither side asked it to, and a file off a stranger's phone must not reach
// the app as anything the app can't draw.
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME_APPEARANCE } from "@niclaslindstedt/oss-framework/theme";
import type { Namespace as Calendar } from "@niclaslindstedt/oss-framework/namespaces";

import {
  BACKUP_KIND,
  BACKUP_VERSION,
  applyImport,
  backupFileName,
  buildBackup,
  defaultChoices,
  parseBackup,
  planImport,
  serializeBackup,
  type BackupFile,
  type DeviceState,
} from "../src/app/storage/backup.ts";
import { DOC_VERSION, type CalendarDoc } from "../src/app/types.ts";
import { DEFAULT_LOOK, type LookSettings } from "../src/app/useAppSettings.ts";

const APPEARANCE = DEFAULT_THEME_APPEARANCE;
const DEFAULTS = { look: DEFAULT_LOOK, appearance: APPEARANCE };

function doc(entries: Record<string, string>): CalendarDoc {
  return { version: DOC_VERSION, entries };
}

function device(over: Partial<DeviceState> = {}): DeviceState {
  return {
    look: DEFAULT_LOOK,
    appearance: APPEARANCE,
    calendars: [{ slug: "default", name: "Personal" }],
    documents: { default: doc({}) },
    defaults: DEFAULTS,
    ...over,
  };
}

/** A look that is *not* the default one, so a device carrying it has
 *  something to defend when a file disagrees. */
function chosenLook(): LookSettings {
  return { ...DEFAULT_LOOK, vacationDays: 30, weekDayOfYear: true };
}

/** A second such look, for the device a file lands on: two sides that have
 *  each been set up, differently. */
function otherLook(): LookSettings {
  return { ...DEFAULT_LOOK, vacationDays: 12 };
}

function file(over: Partial<BackupFile> = {}): BackupFile {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: "2026-08-20T09:00:00.000Z",
    settings: DEFAULT_LOOK,
    appearance: APPEARANCE,
    calendars: [],
    ...over,
  };
}

describe("building a backup", () => {
  it("carries every calendar with its notes", () => {
    const calendars: Calendar[] = [
      { slug: "default", name: "Personal" },
      { slug: "work", name: "Work", glyph: "briefcase", color: "#61afef" },
    ];
    const built = buildBackup({
      look: chosenLook(),
      appearance: APPEARANCE,
      calendars,
      documents: { default: doc({ "2026-08-16": "Dinner" }) },
      exportedAt: "2026-08-20T09:00:00.000Z",
    });

    expect(built.kind).toBe(BACKUP_KIND);
    expect(built.settings.vacationDays).toBe(30);
    expect(built.calendars.map((c) => c.slug)).toEqual(["default", "work"]);
    expect(built.calendars[0]!.entries).toEqual({ "2026-08-16": "Dinner" });
    // A calendar with nothing stored yet is still in the file — it is a
    // calendar the other device should end up with, empty or not.
    expect(built.calendars[1]!.entries).toEqual({});
    expect(built.calendars[1]!.glyph).toBe("briefcase");
  });

  it("names the file for the day it was taken", () => {
    expect(backupFileName("2026-08-20T09:00:00.000Z")).toBe(
      "calendar-backup-2026-08-20.json",
    );
    expect(backupFileName("")).toBe("calendar-backup.json");
  });

  it("round-trips through the file it writes", () => {
    const built = buildBackup({
      look: chosenLook(),
      appearance: APPEARANCE,
      calendars: [{ slug: "default", name: "Personal" }],
      documents: { default: doc({ "2026-08-16": "Dinner" }) },
      exportedAt: "2026-08-20T09:00:00.000Z",
    });
    const parsed = parseBackup(serializeBackup(built), APPEARANCE);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup).toEqual(built);
  });
});

describe("reading a picked file", () => {
  it("refuses what isn't one of ours", () => {
    expect(parseBackup("not json", APPEARANCE)).toEqual({
      ok: false,
      reason: "unreadable",
    });
    expect(parseBackup("{}", APPEARANCE)).toEqual({
      ok: false,
      reason: "not-a-backup",
    });
    expect(
      parseBackup(
        JSON.stringify({ kind: BACKUP_KIND, version: BACKUP_VERSION + 1 }),
        APPEARANCE,
      ),
    ).toEqual({ ok: false, reason: "too-new" });
  });

  it("holds a hand-edited file to values the app can draw", () => {
    const parsed = parseBackup(
      JSON.stringify({
        kind: BACKUP_KIND,
        version: BACKUP_VERSION,
        settings: { vacationDays: 9000, weekFormat: "nonsense" },
        appearance: { theme: "not-a-theme", fontScale: 99 },
        calendars: [
          { slug: "Work Trips!", name: " Work ", entries: { d: 5, e: "ok" } },
          { slug: "../escape", name: "Hax", entries: {} },
          { slug: "", name: "Nameless", entries: {} },
          "rubbish",
        ],
      }),
      APPEARANCE,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.backup.settings.vacationDays).toBe(365);
    // An unknown preset or a silly scale falls back to what this device has.
    expect(parsed.backup.appearance.theme).toBe(APPEARANCE.theme);
    expect(parsed.backup.appearance.fontScale).toBe(APPEARANCE.fontScale);
    // A slug is a storage location, so it comes back key-safe or not at all.
    expect(parsed.backup.calendars.map((c) => c.slug)).toEqual([
      "work-trips",
      "escape",
    ]);
    expect(parsed.backup.calendars[0]!.name).toBe("Work");
    expect(parsed.backup.calendars[0]!.entries).toEqual({ e: "ok" });
  });
});

describe("planning an import", () => {
  it("adds a calendar this device doesn't have, without a question", () => {
    const plan = planImport(
      file({
        calendars: [
          { slug: "work", name: "Work", entries: { "2026-08-17": "Standup" } },
        ],
      }),
      device(),
    );
    expect(plan.calendars[0]!.status).toBe("new");
    expect(plan.calendars[0]!.addedDays).toBe(1);
    expect(plan.conflicts).toBe(false);
    expect(plan.changes).toBe(true);
  });

  it("merges days only one side has, and flags the ones that clash", () => {
    const plan = planImport(
      file({
        settings: chosenLook(),
        calendars: [
          {
            slug: "default",
            name: "Personal",
            entries: {
              "2026-08-16": "Dinner Ada",
              "2026-08-17": "Car service",
            },
          },
        ],
      }),
      device({
        look: chosenLook(),
        documents: { default: doc({ "2026-08-16": "Dinner Bo" }) },
      }),
    );
    const cal = plan.calendars[0]!;
    expect(cal.status).toBe("conflict");
    expect(cal.addedDays).toBe(1);
    expect(cal.conflictDays).toBe(1);
    expect(plan.conflicts).toBe(true);
  });

  it("treats a different name as a conflict of its own", () => {
    const plan = planImport(
      file({
        settings: chosenLook(),
        calendars: [{ slug: "default", name: "Hemma", entries: {} }],
      }),
      device({ look: chosenLook() }),
    );
    expect(plan.calendars[0]!.status).toBe("conflict");
    expect(plan.calendars[0]!.renamed).toBe(true);
    expect(plan.calendars[0]!.conflictDays).toBe(0);
  });

  it("asks about settings only when this device has chosen some", () => {
    const theirs = file({ settings: chosenLook() });
    // An untouched install has nothing to defend: it takes the file's.
    expect(planImport(theirs, device()).settings).toBe("adopt");
    // A device that has been set up differently gets the question.
    expect(planImport(theirs, device({ look: otherLook() })).settings).toBe(
      "conflict",
    );
    // One that already reads the same way is not asked at all.
    expect(planImport(theirs, device({ look: chosenLook() })).settings).toBe(
      "same",
    );
  });

  it("says there is nothing to do when the two already agree", () => {
    const plan = planImport(
      file({
        calendars: [
          { slug: "default", name: "Personal", entries: { d: "same" } },
        ],
      }),
      device({ documents: { default: doc({ d: "same" }) } }),
    );
    expect(plan.settings).toBe("same");
    expect(plan.calendars[0]!.status).toBe("merge");
    expect(plan.changes).toBe(false);
    expect(plan.conflicts).toBe(false);
  });

  it("opens every question on this device's answer", () => {
    const plan = planImport(
      file({
        settings: chosenLook(),
        calendars: [{ slug: "default", name: "Hemma", entries: {} }],
      }),
      device({ look: chosenLook() }),
    );
    expect(defaultChoices(plan)).toEqual({
      settings: "mine",
      calendars: { default: "mine" },
    });
  });
});

describe("applying an import", () => {
  const contested = file({
    settings: chosenLook(),
    calendars: [
      {
        slug: "default",
        name: "Hemma",
        color: "#ff0000",
        entries: { "2026-08-16": "Middag Ada", "2026-08-17": "Bilservice" },
      },
      { slug: "work", name: "Work", entries: { "2026-08-18": "Standup" } },
    ],
  });
  const here = device({
    look: otherLook(),
    documents: { default: doc({ "2026-08-16": "Dinner Bo" }) },
  });

  it("keeps this device's answer where it won, and still takes the rest", () => {
    const outcome = applyImport(contested, here, {
      settings: "mine",
      calendars: { default: "mine" },
    });

    expect(outcome.look).toBeNull();
    expect(outcome.appearance).toBeNull();
    // The contested day stays as this device wrote it…
    expect(outcome.documents.default!.entries["2026-08-16"]).toBe("Dinner Bo");
    // …and the day only the file had is taken anyway.
    expect(outcome.documents.default!.entries["2026-08-17"]).toBe("Bilservice");
    // A "keep mine" answer keeps the calendar's own name too.
    expect(outcome.calendars.find((c) => c.slug === "default")!.name).toBe(
      "Personal",
    );
    expect(outcome.calendars.map((c) => c.slug)).toEqual(["default", "work"]);
    expect(outcome.documents.work!.entries).toEqual({
      "2026-08-18": "Standup",
    });
    expect(outcome.summary).toEqual({
      settings: false,
      calendarsAdded: 1,
      calendarsMerged: 1,
      daysAdded: 2,
      daysReplaced: 0,
    });
  });

  it("takes the file's where it won", () => {
    const outcome = applyImport(contested, here, {
      settings: "imported",
      calendars: { default: "imported" },
    });

    expect(outcome.look?.vacationDays).toBe(30);
    expect(outcome.appearance).toEqual(APPEARANCE);
    expect(outcome.documents.default!.entries["2026-08-16"]).toBe("Middag Ada");
    const merged = outcome.calendars.find((c) => c.slug === "default")!;
    expect(merged.name).toBe("Hemma");
    expect(merged.color).toBe("#ff0000");
    expect(outcome.summary.daysReplaced).toBe(1);
    expect(outcome.summary.settings).toBe(true);
  });

  it("takes an untouched device's settings without being asked", () => {
    const outcome = applyImport(
      contested,
      device(),
      defaultChoices(planImport(contested, device())),
    );
    expect(outcome.look?.vacationDays).toBe(30);
    expect(outcome.summary.settings).toBe(true);
  });

  it("writes only the calendars that changed", () => {
    const unchanged = file({
      calendars: [
        { slug: "default", name: "Personal", entries: { d: "same" } },
        { slug: "work", name: "Work", entries: {} },
      ],
    });
    const outcome = applyImport(
      unchanged,
      device({ documents: { default: doc({ d: "same" }) } }),
      { settings: "mine", calendars: {} },
    );
    // "work" joins the registry but has nothing to store yet, and "default"
    // is untouched — so nothing is written to the backend at all.
    expect(Object.keys(outcome.documents)).toEqual([]);
    expect(outcome.calendars.map((c) => c.slug)).toEqual(["default", "work"]);
    expect(outcome.summary.calendarsAdded).toBe(1);
  });
});

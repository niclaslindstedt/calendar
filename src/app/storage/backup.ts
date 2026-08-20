// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The backup file: what an export carries out of the app, and what an import
// means for the device it lands on.
//
// A backup is everything that isn't a *connection*: the look settings and the
// theme (what the calendar reads like), plus every calendar in the registry
// with its notes. The storage backend, the OAuth tokens and the folder handle
// are deliberately left out — they are this device's account state, and a
// file that carried them would either be a secret or a lie on the machine it
// is opened on.
//
// An import is a **merge**, not a restore. Three rules, in the order a reader
// meets them:
//
//   - a calendar the device doesn't have is *added*, notes and all;
//   - a day only one side has is *kept*, whichever side it came from;
//   - a day both sides have written differently — or a calendar the two sides
//     name differently — is a **conflict**, and the reader picks the winner
//     for that calendar (Settings are one such choice of their own).
//
// So nothing is ever silently lost: a "keep mine" answer still takes the days
// the file brought that this device had never seen.
//
// Pure and DOM-free on purpose — reading the documents out of the backends
// and handing the file to the browser is `backupIo.ts`'s job, and this half
// is the part worth pinning down in a test.

import {
  coerceCustomTheme,
  coerceUiStyle,
  isFontFamily,
  isFontScale,
  isThemePreset,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";
import {
  normalizeNamespaces as normalizeCalendars,
  slugify,
  type Namespace as Calendar,
} from "@niclaslindstedt/oss-framework/namespaces";

import { coerceDoc, emptyDoc, type CalendarDoc } from "../types.ts";
import {
  DEFAULT_SETTINGS,
  clampVacationDays,
  migrateStyles,
  pickLook,
  type LegacyStyleSettings,
  type LookSettings,
} from "../useAppSettings.ts";

/** What marks a file as one of ours. Spelled out rather than sniffed for, so
 *  picking the wrong JSON off a phone says so instead of merging nonsense. */
export const BACKUP_KIND = "nird-calendar-backup";

/** The backup format's own version — bumped only if the *envelope* changes.
 *  A calendar document inside it carries its own `version` and goes through
 *  the usual migration chain on the way in (`migrations.ts`). */
export const BACKUP_VERSION = 1;

/** One calendar as a file carries it: the registry row plus its notes. */
export type BackupCalendar = {
  slug: string;
  name: string;
  glyph?: string;
  color?: string;
  /** Day → the note, exactly as the document holds it. */
  entries: Record<string, string>;
};

export type BackupFile = {
  kind: typeof BACKUP_KIND;
  version: number;
  /** ISO timestamp — shown to the reader, never compared against. */
  exportedAt: string;
  settings: LookSettings;
  appearance: ThemeAppearance;
  calendars: BackupCalendar[];
};

/** Everything an export needs to know about the device. */
export type BackupInput = {
  look: LookSettings;
  appearance: ThemeAppearance;
  calendars: readonly Calendar[];
  /** slug → that calendar's document. A calendar with nothing stored yet may
   *  be missing; it exports as an empty one. */
  documents: Readonly<Record<string, CalendarDoc>>;
  /** When the export was taken (the caller owns the clock). */
  exportedAt: string;
};

export function buildBackup(input: BackupInput): BackupFile {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: input.exportedAt,
    settings: input.look,
    appearance: input.appearance,
    calendars: input.calendars.map((cal) => ({
      slug: cal.slug,
      name: cal.name,
      ...(cal.glyph ? { glyph: cal.glyph } : {}),
      ...(cal.color ? { color: cal.color } : {}),
      entries: { ...(input.documents[cal.slug]?.entries ?? {}) },
    })),
  };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2);
}

/** What the saved file is called. Dated rather than stamped to the second:
 *  the reader is filing a backup, not a log line. */
export function backupFileName(exportedAt: string): string {
  const day = exportedAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? `calendar-backup-${day}.json`
    : "calendar-backup.json";
}

/** Why a picked file couldn't be read — each one is a sentence the Storage
 *  tab shows, so the reader learns which file they picked. */
export type BackupParseError = "unreadable" | "not-a-backup" | "too-new";

export type BackupParseResult =
  { ok: true; backup: BackupFile } | { ok: false; reason: BackupParseError };

/** Read a picked file. Defensive throughout: the bytes come off a phone the
 *  app has never seen, so every field is coerced back onto a value the app
 *  can actually render (the same contract `coerceDoc` keeps for a document). */
export function parseBackup(
  text: string,
  fallbackAppearance: ThemeAppearance,
): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "not-a-backup" };
  }
  const blob = raw as Partial<BackupFile>;
  if (blob.kind !== BACKUP_KIND) return { ok: false, reason: "not-a-backup" };
  if (typeof blob.version === "number" && blob.version > BACKUP_VERSION) {
    return { ok: false, reason: "too-new" };
  }
  return {
    ok: true,
    backup: {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt: typeof blob.exportedAt === "string" ? blob.exportedAt : "",
      settings: coerceLook(blob.settings),
      appearance: coerceAppearance(blob.appearance, fallbackAppearance),
      calendars: coerceBackupCalendars(blob.calendars),
    },
  };
}

/** A look blob off a foreign file, back on the values the app draws with. The
 *  same treatment a hand-edited `localStorage` blob already gets: the type
 *  settings go through the per-view resolver (which also carries a pre-split
 *  file's flat keys over), the vacation allowance is clamped, and everything
 *  else is snapped back at the point it is read (`headerColorOf`,
 *  `stripSlotOf`, `pastMarkStyle`, `getLocale`, …). */
export function coerceLook(raw: unknown): LookSettings {
  const blob: LegacyStyleSettings =
    typeof raw === "object" && raw !== null ? (raw as LegacyStyleSettings) : {};
  return pickLook({
    ...DEFAULT_SETTINGS,
    ...blob,
    eveDays:
      typeof blob.eveDays === "object" && blob.eveDays !== null
        ? blob.eveDays
        : {},
    vacationDays: clampVacationDays(
      blob.vacationDays ?? DEFAULT_SETTINGS.vacationDays,
    ),
    styles: migrateStyles(blob),
  });
}

/** The theme a file carries, field by field against the framework's own
 *  guards — an unknown preset or a silly font scale falls back to what this
 *  device is already using rather than reaching the stylesheet. */
export function coerceAppearance(
  raw: unknown,
  fallback: ThemeAppearance,
): ThemeAppearance {
  const blob =
    typeof raw === "object" && raw !== null
      ? (raw as Partial<ThemeAppearance>)
      : {};
  return {
    theme: isThemePreset(blob.theme) ? blob.theme : fallback.theme,
    fontFamily: isFontFamily(blob.fontFamily)
      ? blob.fontFamily
      : fallback.fontFamily,
    fontScale: isFontScale(blob.fontScale)
      ? blob.fontScale
      : fallback.fontScale,
    ui: coerceUiStyle(blob.ui),
    customTheme: coerceCustomTheme(blob.customTheme),
  };
}

function coerceBackupCalendars(raw: unknown): BackupCalendar[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: BackupCalendar[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const cal = entry as Partial<BackupCalendar>;
    // The slug is a storage location — a key, a file name, a Dropbox folder —
    // so it is re-slugified rather than trusted, and a row whose slug survives
    // as nothing is dropped along with its notes.
    const slug = slugify(typeof cal.slug === "string" ? cal.slug : "");
    if (!slug || seen.has(slug)) continue;
    const name =
      typeof cal.name === "string" && cal.name.trim() !== ""
        ? cal.name.trim()
        : slug;
    seen.add(slug);
    out.push({
      slug,
      name,
      ...(typeof cal.glyph === "string" ? { glyph: cal.glyph } : {}),
      ...(typeof cal.color === "string" ? { color: cal.color } : {}),
      entries: coerceDoc({ entries: cal.entries }).entries,
    });
  }
  return out;
}

// --- planning ---------------------------------------------------------------

/** The device an import lands on. */
export type DeviceState = {
  look: LookSettings;
  appearance: ThemeAppearance;
  calendars: readonly Calendar[];
  /** slug → that calendar's document, as far as it could be read. */
  documents: Readonly<Record<string, CalendarDoc>>;
  /** What an untouched install looks like. A device still sitting on both
   *  defaults has nothing to lose, so it adopts the file's settings rather
   *  than asking a question with only one sensible answer. */
  defaults: { look: LookSettings; appearance: ThemeAppearance };
};

/** What the file's settings mean here: nothing to do, take them (this device
 *  never set any), or a choice for the reader. */
export type SettingsPlan = "same" | "adopt" | "conflict";

/** What one calendar in the file means here. */
export type CalendarPlan = {
  slug: string;
  /** What to call it in the dialog — this device's name once it has one. */
  name: string;
  /** What the file calls it. */
  incomingName: string;
  /** `new` — the device doesn't have it; `merge` — the two agree wherever
   *  they overlap; `conflict` — they disagree, and the reader picks. */
  status: "new" | "merge" | "conflict";
  /** Days the file brings that this device doesn't have. Taken either way. */
  addedDays: number;
  /** Days both sides have written differently. The winner decides these. */
  conflictDays: number;
  /** Whether the two sides call it (or dress it) differently. */
  renamed: boolean;
};

export type ImportPlan = {
  settings: SettingsPlan;
  calendars: CalendarPlan[];
  /** Whether the import would change anything at all. */
  changes: boolean;
  /** Whether anything needs the reader to pick a winner. */
  conflicts: boolean;
};

/** Which side wins a contested item. */
export type ImportChoice = "mine" | "imported";

export type ImportChoices = {
  settings: ImportChoice;
  /** slug → the winner for that calendar. Only conflicting ones are read. */
  calendars: Record<string, ImportChoice>;
};

export function planImport(
  backup: BackupFile,
  device: DeviceState,
): ImportPlan {
  const settings = planSettings(backup, device);
  const calendars = backup.calendars.map((incoming) => {
    const local = device.calendars.find((c) => c.slug === incoming.slug);
    const mine = device.documents[incoming.slug]?.entries ?? {};
    let addedDays = 0;
    let conflictDays = 0;
    for (const [day, text] of Object.entries(incoming.entries)) {
      const held = mine[day];
      if (held === undefined) addedDays += 1;
      else if (held !== text) conflictDays += 1;
    }
    const renamed =
      local !== undefined &&
      (local.name !== incoming.name ||
        (local.glyph ?? "") !== (incoming.glyph ?? "") ||
        (local.color ?? "") !== (incoming.color ?? ""));
    return {
      slug: incoming.slug,
      name: local?.name ?? incoming.name,
      incomingName: incoming.name,
      status: !local
        ? ("new" as const)
        : conflictDays > 0 || renamed
          ? ("conflict" as const)
          : ("merge" as const),
      addedDays,
      conflictDays,
      renamed,
    };
  });
  const conflicts =
    settings === "conflict" || calendars.some((c) => c.status === "conflict");
  const changes =
    settings !== "same" ||
    conflicts ||
    calendars.some((c) => c.status === "new" || c.addedDays > 0);
  return { settings, calendars, changes, conflicts };
}

function planSettings(backup: BackupFile, device: DeviceState): SettingsPlan {
  const same =
    sameJson(backup.settings, device.look) &&
    sameJson(backup.appearance, device.appearance);
  if (same) return "same";
  const pristine =
    sameJson(device.look, device.defaults.look) &&
    sameJson(device.appearance, device.defaults.appearance);
  return pristine ? "adopt" : "conflict";
}

/** The answers the dialog opens on: keep what this device has, everywhere.
 *  An import that is only asked to *add* is the safe one to offer first. */
export function defaultChoices(plan: ImportPlan): ImportChoices {
  const calendars: Record<string, ImportChoice> = {};
  for (const cal of plan.calendars) {
    if (cal.status === "conflict") calendars[cal.slug] = "mine";
  }
  return { settings: "mine", calendars };
}

// --- applying ---------------------------------------------------------------

export type ImportSummary = {
  /** Whether the file's settings were taken. */
  settings: boolean;
  calendarsAdded: number;
  /** Calendars the device already had that gained something. */
  calendarsMerged: number;
  daysAdded: number;
  daysReplaced: number;
};

export type ImportOutcome = {
  /** The look to commit, or null to leave this device's alone. */
  look: LookSettings | null;
  appearance: ThemeAppearance | null;
  /** The registry to store — the device's list plus whatever was added. */
  calendars: Calendar[];
  /** slug → the document to write. Only the calendars that changed appear. */
  documents: Record<string, CalendarDoc>;
  summary: ImportSummary;
};

export function applyImport(
  backup: BackupFile,
  device: DeviceState,
  choices: ImportChoices,
): ImportOutcome {
  const plan = planImport(backup, device);
  const takeSettings =
    plan.settings === "adopt" ||
    (plan.settings === "conflict" && choices.settings === "imported");

  const calendars = device.calendars.map((cal) => ({ ...cal }));
  const documents: Record<string, CalendarDoc> = {};
  const summary: ImportSummary = {
    settings: takeSettings,
    calendarsAdded: 0,
    calendarsMerged: 0,
    daysAdded: 0,
    daysReplaced: 0,
  };

  for (const incoming of backup.calendars) {
    const winner = choices.calendars[incoming.slug] ?? "mine";
    const index = calendars.findIndex((c) => c.slug === incoming.slug);
    const mine = device.documents[incoming.slug]?.entries ?? {};
    const merged: Record<string, string> = { ...mine };
    let added = 0;
    let replaced = 0;
    for (const [day, text] of Object.entries(incoming.entries)) {
      const held = merged[day];
      if (held === undefined) {
        merged[day] = text;
        added += 1;
      } else if (held !== text && winner === "imported") {
        merged[day] = text;
        replaced += 1;
      }
    }
    summary.daysAdded += added;
    summary.daysReplaced += replaced;

    if (index === -1) {
      calendars.push({
        slug: incoming.slug,
        name: incoming.name,
        ...(incoming.glyph ? { glyph: incoming.glyph } : {}),
        ...(incoming.color ? { color: incoming.color } : {}),
      });
      summary.calendarsAdded += 1;
    } else {
      if (winner === "imported") {
        calendars[index] = {
          slug: incoming.slug,
          name: incoming.name,
          ...(incoming.glyph ? { glyph: incoming.glyph } : {}),
          ...(incoming.color ? { color: incoming.color } : {}),
        };
      }
      if (added > 0 || replaced > 0) summary.calendarsMerged += 1;
    }
    if (added > 0 || replaced > 0) {
      documents[incoming.slug] = { ...emptyDoc(), entries: merged };
    }
  }

  return {
    look: takeSettings ? backup.settings : null,
    appearance: takeSettings ? backup.appearance : null,
    calendars: normalizeCalendars(calendars),
    documents,
    summary,
  };
}

/** Deep value equality over plain JSON data, key order aside — what "the two
 *  sides agree" means for a settings blob assembled in a different order by a
 *  different build. */
function sameJson(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(
            (value as Record<string, unknown>)[key],
          )}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

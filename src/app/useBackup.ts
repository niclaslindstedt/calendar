// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Import / export, wired up: the one place that knows how a backup file gets
// out of the app and how a merged one gets back into every store it touches.
//
// The three parts underneath it stay ignorant of each other — `backup.ts` is
// the pure rules (what a file carries, what an import means), `backupIo.ts`
// is the round-trip through the storage adapters, and the stores are the
// stores. This hook is what the Settings dialog is handed.
//
// The calendar on screen is deliberately special-cased in both directions:
// its notes are taken from the live document (so an export can't miss the
// keystroke still sitting on the save debounce) and written back through the
// live store (so the merge appears under the reader without a reload, and
// keeps the revision the store is holding).

import { useCallback, useState } from "react";

import { downloadText, MIME_JSON } from "@niclaslindstedt/oss-framework/files";
import type { ThemeAppearance } from "@niclaslindstedt/oss-framework/theme";

import { error as logError, status } from "../output.ts";
import type { CalendarsStore } from "./useCalendars.ts";
import type { CalendarStore } from "./useCalendarStore.ts";
import type { CalendarDoc } from "./types.ts";
import {
  pickLook,
  type AppSettings,
  type LookSettings,
} from "./useAppSettings.ts";
import type { BackendId } from "./storage/backends.ts";
import {
  applyImport,
  backupFileName,
  buildBackup,
  parseBackup,
  planImport,
  serializeBackup,
  type BackupFile,
  type BackupParseError,
  type DeviceState,
  type ImportChoices,
  type ImportPlan,
  type ImportSummary,
} from "./storage/backup.ts";
import {
  readCalendarDocuments,
  writeCalendarDocuments,
} from "./storage/backupIo.ts";

/** A picked file, read and measured against this device. Carries the device
 *  state it was planned against so the answer the reader gives is applied to
 *  the same documents the plan was computed from. */
export type ImportIntake =
  | { ok: true; backup: BackupFile; plan: ImportPlan; device: DeviceState }
  | { ok: false; reason: BackupParseError };

/** What an applied import did, plus the calendars whose notes couldn't be
 *  written (a backend that went away mid-merge). */
export type ImportResult = ImportSummary & {
  failed: string[];
  /** The settings that were adopted, so the open dialog can re-seat the draft
   *  it would otherwise write back over them on Save. */
  look: LookSettings | null;
  appearance: ThemeAppearance | null;
};

export type BackupActions = {
  /** True while a read or a write is in flight (both are round-trips to a
   *  cloud backend in the worst case). */
  busy: boolean;
  /** Gather everything and hand the file to the browser. Resolves with an
   *  error message when the backup couldn't be assembled. */
  exportAll: () => Promise<string | null>;
  /** Read a picked file and work out what it would mean here. */
  readBackupFile: (file: File) => Promise<ImportIntake>;
  /** Commit a planned merge with the reader's answers. */
  applyBackup: (
    intake: Extract<ImportIntake, { ok: true }>,
    choices: ImportChoices,
  ) => Promise<ImportResult>;
};

export function useBackup(deps: {
  settings: AppSettings;
  appearance: ThemeAppearance;
  defaults: { look: LookSettings; appearance: ThemeAppearance };
  /** The backend the store is actually saving through. */
  backend: BackendId;
  calendars: CalendarsStore;
  store: CalendarStore;
  commitLook: (look: LookSettings) => void;
  setAppearance: (next: ThemeAppearance) => void;
}): BackupActions {
  const [busy, setBusy] = useState(false);
  const {
    settings,
    appearance,
    defaults,
    backend,
    calendars,
    store,
    commitLook,
    setAppearance,
  } = deps;

  /** This device, as the merge sees it: the saved look (not the dialog's
   *  unsaved draft), the registry, and every calendar's notes. */
  const readDevice = useCallback(async (): Promise<DeviceState> => {
    const documents = await readCalendarDocuments(
      backend,
      calendars.list.map((cal) => cal.slug),
    );
    documents[calendars.activeSlug] = store.doc;
    return {
      look: pickLook(settings),
      appearance,
      calendars: calendars.list,
      documents,
      defaults,
    };
  }, [
    appearance,
    backend,
    calendars.activeSlug,
    calendars.list,
    defaults,
    settings,
    store.doc,
  ]);

  const exportAll = useCallback(async (): Promise<string | null> => {
    setBusy(true);
    try {
      const device = await readDevice();
      const exportedAt = new Date().toISOString();
      const file = buildBackup({
        look: device.look,
        appearance: device.appearance,
        calendars: device.calendars,
        documents: device.documents,
        exportedAt,
      });
      downloadText(
        backupFileName(exportedAt),
        serializeBackup(file),
        MIME_JSON,
      );
      status(`Exported ${file.calendars.length} calendars`);
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError(`Export failed: ${message}`);
      return message;
    } finally {
      setBusy(false);
    }
  }, [readDevice]);

  const readBackupFile = useCallback(
    async (file: File): Promise<ImportIntake> => {
      setBusy(true);
      try {
        const parsed = parseBackup(await file.text(), appearance);
        if (!parsed.ok) {
          logError(`Import refused the file: ${parsed.reason}`);
          return parsed;
        }
        const device = await readDevice();
        return {
          ok: true,
          backup: parsed.backup,
          plan: planImport(parsed.backup, device),
          device,
        };
      } catch (err) {
        logError(`Could not read the file: ${String(err)}`);
        return { ok: false, reason: "unreadable" };
      } finally {
        setBusy(false);
      }
    },
    [appearance, readDevice],
  );

  const applyBackup = useCallback(
    async (
      intake: Extract<ImportIntake, { ok: true }>,
      choices: ImportChoices,
    ): Promise<ImportResult> => {
      setBusy(true);
      try {
        const outcome = applyImport(intake.backup, intake.device, choices);
        // The registry first: a document written for a calendar that isn't
        // listed yet would be unreachable if the write below failed halfway.
        calendars.replaceAll(outcome.calendars);
        const active: CalendarDoc | undefined =
          outcome.documents[calendars.activeSlug];
        if (active) store.replaceDoc(active);
        const failed = await writeCalendarDocuments(
          backend,
          outcome.documents,
          calendars.activeSlug,
        );
        if (outcome.look) commitLook(outcome.look);
        if (outcome.appearance) setAppearance(outcome.appearance);
        status(
          `Imported ${outcome.summary.calendarsAdded} new calendars, ` +
            `${outcome.summary.daysAdded} days added`,
        );
        return {
          ...outcome.summary,
          failed,
          look: outcome.look,
          appearance: outcome.appearance,
        };
      } finally {
        setBusy(false);
      }
    },
    [backend, calendars, commitLook, setAppearance, store],
  );

  return { busy, exportAll, readBackupFile, applyBackup };
}

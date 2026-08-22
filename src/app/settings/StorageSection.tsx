// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Storage tab: where the calendar document lives. One row per backend —
// label + hint, an Active badge or a Use button, and the backend's
// connect / disconnect affordance. Connections apply immediately (they are
// account state, not a look preference), so this tab ignores the dialog's
// draft entirely.
//
// Under the backends sits the backup pair (`BackupSection`): a place is where
// your calendar lives, a file is a copy of it you can carry to another one —
// the same tab answers both. Last comes `ResetSection`, which is the third
// thing you can do to the notes as a whole: throw them away.

import {
  Badge,
  Button,
  Section,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "../i18n/index.ts";
import type { BackendId } from "../storage/backends.ts";
import {
  dropboxLocation,
  isDropboxAvailable,
  isDropboxConnected,
  isFolderAvailable,
  isGdriveAvailable,
  isGdriveConnected,
} from "../storage/backends.ts";
import type { SaveState } from "../useCalendarStore.ts";
import type { BackupActions, ImportResult } from "../useBackup.ts";
import type { ResetActions } from "../useReset.ts";
import { BackupSection } from "./BackupSection.tsx";
import { ResetSection } from "./ResetSection.tsx";

export type StorageActions = {
  setActive: (id: BackendId) => void;
  connectFolder: () => void;
  connectDropbox: () => void;
  connectGdrive: () => void;
  disconnect: (id: BackendId) => void;
  folderConnected: boolean;
};

export function StorageSection({
  saveState,
  effectiveBackend,
  calendarSlug,
  calendarName,
  calendarCount,
  storage,
  devMode,
  demoData,
  backup,
  reset,
  onImported,
}: {
  saveState: SaveState;
  effectiveBackend: BackendId;
  /** The active calendar's slug — Dropbox files each calendar in a folder of
   *  its own, and the row prints which one. */
  calendarSlug: string;
  /** The active calendar's name, and how many there are — what the reset
   *  block names, and whether it has a scope to offer. */
  calendarName: string;
  calendarCount: number;
  storage: StorageActions;
  devMode: boolean;
  demoData: boolean;
  backup: BackupActions;
  reset: ResetActions;
  /** An applied import, so the dialog can re-seat the draft it holds. */
  onImported: (result: ImportResult) => void;
}) {
  const t = useT();

  const saveLine =
    saveState.kind === "saving"
      ? t("storage.statusSaving")
      : saveState.kind === "loading"
        ? t("storage.statusLoading")
        : saveState.kind === "error"
          ? t("storage.statusError", { error: saveState.message })
          : t("storage.statusSaved");

  const backendRow = (
    id: BackendId,
    label: string,
    hint: string,
    opts: {
      available: boolean;
      connected: boolean;
      onConnect?: () => void;
      connectLabel?: string;
      /** A second, quieter line under the hint — where the document actually
       *  sits, for a backend whose location the user can't otherwise see. */
      detail?: string;
    },
  ) => {
    if (!opts.available) return null;
    const active = effectiveBackend === id;
    return (
      <div className="flex items-center gap-2 border-b border-line py-2 last:border-b-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm">{label}</div>
          <div className="text-muted text-xs">{hint}</div>
          {opts.detail && (
            <div className="text-muted mt-0.5 text-[11px] break-all opacity-80">
              {opts.detail}
            </div>
          )}
        </div>
        {active ? (
          <Badge tone="accent">{t("storage.active")}</Badge>
        ) : opts.connected ? (
          <Button variant="secondary" onClick={() => storage.setActive(id)}>
            {t("storage.use")}
          </Button>
        ) : null}
        {!opts.connected && opts.onConnect && (
          <Button variant="secondary" onClick={opts.onConnect}>
            {opts.connectLabel ?? t("storage.connect")}
          </Button>
        )}
        {opts.connected && id !== "browser" && id !== "demo" && (
          <Button variant="ghost" onClick={() => storage.disconnect(id)}>
            {t("storage.disconnect")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Section title={t("storage.heading")}>
        <div>
          <div className="text-muted pb-1 text-xs">{t("storage.hint")}</div>
          <div className="text-muted text-xs">{saveLine}</div>
        </div>
        <div>
          {backendRow(
            "browser",
            t("storage.browser"),
            t("storage.browserHint"),
            { available: true, connected: true },
          )}
          {backendRow("folder", t("storage.folder"), t("storage.folderHint"), {
            available: isFolderAvailable(),
            connected: storage.folderConnected,
            onConnect: storage.connectFolder,
            connectLabel: t("storage.folderConnect"),
          })}
          {backendRow(
            "dropbox",
            t("storage.dropbox"),
            t("storage.dropboxHint"),
            {
              available: isDropboxAvailable(),
              connected: isDropboxConnected(),
              onConnect: storage.connectDropbox,
              detail: dropboxLocation(calendarSlug),
            },
          )}
          {backendRow("gdrive", t("storage.gdrive"), t("storage.gdriveHint"), {
            available: isGdriveAvailable(),
            connected: isGdriveConnected(),
            onConnect: storage.connectGdrive,
          })}
          {devMode &&
            backendRow("demo", t("storage.demo"), t("storage.demoHint"), {
              available: true,
              connected: demoData,
            })}
        </div>
      </Section>
      <BackupSection
        backup={backup}
        demoData={demoData}
        onImported={onImported}
      />
      <ResetSection
        reset={reset}
        calendarName={calendarName}
        calendarCount={calendarCount}
        demoData={demoData}
      />
    </>
  );
}

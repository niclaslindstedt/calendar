// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Storage tab's second half: taking a copy of everything out of the app,
// and merging one back in.
//
// Export is one press — the file is assembled from the active backend and
// handed to the browser. Import is a pick, then a *plan*: the file is read and
// measured against this device, and only if the two disagree somewhere does
// the merge dialog open to ask who wins (`ImportMergeModal`). A file that only
// brings new things is applied on the spot, because there is nothing to ask.
//
// Both directions apply immediately, like the backend rows above them — an
// import that waited for Save would be a merge the reader could cancel by
// accident, and the dialog's Cancel already means "don't".

import { useRef, useState } from "react";

import {
  Button,
  DownloadIcon,
  Section,
  UploadIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type TFunction } from "../i18n/index.ts";
import { defaultChoices, type ImportChoices } from "../storage/backup.ts";
import type {
  BackupActions,
  ImportIntake,
  ImportResult,
} from "../useBackup.ts";
import { ImportMergeModal } from "./ImportMergeModal.tsx";

type Pending = Extract<ImportIntake, { ok: true }>;

export function BackupSection({
  backup,
  /** True while the demo backend is standing in for the real one — there is
   *  nothing to export from it and nothing that would survive an import. */
  demoData,
  onImported,
}: {
  backup: BackupActions;
  demoData: boolean;
  onImported: (result: ImportResult) => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  // The line under the buttons: what just happened, or what went wrong.
  const [note, setNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  // The read file waiting on an answer, with the answers so far.
  const [pending, setPending] = useState<Pending | null>(null);
  const [choices, setChoices] = useState<ImportChoices | null>(null);

  const clear = () => {
    setNote(null);
    setFailure(null);
    setResult(null);
  };

  const runExport = async () => {
    clear();
    const error = await backup.exportAll();
    if (error) setFailure(t("backup.exportFailed", { error }));
  };

  const apply = async (intake: Pending, answers: ImportChoices) => {
    const applied = await backup.applyBackup(intake, answers);
    setPending(null);
    setChoices(null);
    setResult(applied);
    if (applied.failed.length > 0) {
      setFailure(
        t("backup.writeFailed", { calendars: applied.failed.join(", ") }),
      );
    }
    onImported(applied);
  };

  const pick = async (file: File | undefined) => {
    clear();
    if (!file) return;
    const intake = await backup.readBackupFile(file);
    if (!intake.ok) {
      setFailure(parseFailure(t, intake.reason));
      return;
    }
    if (!intake.plan.changes) {
      setNote(t("backup.nothingToDo"));
      return;
    }
    // Nothing to decide — apply it rather than opening a dialog whose only
    // honest button is "Yes, do the thing I just asked for".
    if (!intake.plan.conflicts) {
      await apply(intake, defaultChoices(intake.plan));
      return;
    }
    setChoices(defaultChoices(intake.plan));
    setPending(intake);
  };

  return (
    <Section title={t("backup.heading")}>
      <div className="text-muted text-xs">{t("backup.hint")}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => void runExport()}
          disabled={demoData || backup.busy}
        >
          <span className="inline-flex items-center gap-1.5">
            <DownloadIcon className="h-3.5 w-3.5" />
            {t("backup.export")}
          </span>
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={demoData || backup.busy}
        >
          <span className="inline-flex items-center gap-1.5">
            <UploadIcon className="h-3.5 w-3.5" />
            {t("backup.import")}
          </span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const picked = e.currentTarget.files?.[0];
            // Clear the input first: picking the same file twice in a row is
            // a perfectly normal thing to do after a cancelled merge, and a
            // file input that still holds it fires no change event.
            e.currentTarget.value = "";
            void pick(picked);
          }}
        />
      </div>

      {demoData && (
        <div className="text-muted text-xs">{t("backup.demoBlocked")}</div>
      )}
      {backup.busy && (
        <div className="text-muted text-xs">{t("backup.working")}</div>
      )}
      {failure && <div className="text-xs text-danger">{failure}</div>}
      {note && <div className="text-muted text-xs">{note}</div>}
      {result && <ImportReceipt t={t} result={result} />}

      {pending && choices && (
        <ImportMergeModal
          open
          plan={pending.plan}
          exportedAt={pending.backup.exportedAt}
          choices={choices}
          busy={backup.busy}
          onChoose={setChoices}
          onCancel={() => {
            setPending(null);
            setChoices(null);
          }}
          onConfirm={() => void apply(pending, choices)}
        />
      )}
    </Section>
  );
}

// What the import did, as counted rows rather than a sentence: the numbers
// are the answer, and a row reads the same at 1 as at 12 in both catalogs.
function ImportReceipt({ t, result }: { t: TFunction; result: ImportResult }) {
  const rows: [string, string][] = [
    [t("backup.resultCalendarsAdded"), String(result.calendarsAdded)],
    [t("backup.resultCalendarsMerged"), String(result.calendarsMerged)],
    [t("backup.resultDaysAdded"), String(result.daysAdded)],
    [t("backup.resultDaysReplaced"), String(result.daysReplaced)],
    [
      t("backup.resultSettings"),
      result.settings
        ? t("backup.resultSettingsTaken")
        : t("backup.resultSettingsKept"),
    ],
  ];
  return (
    <div>
      <div className="text-xs font-bold text-fg-bright">
        {t("backup.resultHeading")}
      </div>
      <dl className="mt-1 space-y-0.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between">
            <dt className="text-muted text-xs">{label}</dt>
            <dd className="text-xs text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function parseFailure(
  t: TFunction,
  reason: "unreadable" | "not-a-backup" | "too-new",
): string {
  if (reason === "unreadable") return t("backup.errorUnreadable");
  if (reason === "too-new") return t("backup.errorTooNew");
  return t("backup.errorNotBackup");
}

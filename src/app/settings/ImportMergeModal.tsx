// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The dialog an import stops at when the file and the device disagree.
//
// It is deliberately not a preview of the whole merge: everything that can be
// merged without a question — a calendar this device doesn't have, a day only
// one side wrote — is stated once, in a line, and happens either way. The
// scrolling part is only the decisions: the settings, and each calendar the
// two sides wrote differently. Each is a two-way answer, and both answers
// keep every day the other side brought that this one hadn't got — the winner
// decides the *contested* days, not the calendar.
//
// It opens over the Settings dialog (the framework's `Modal` keeps a stack,
// so Escape lands here first), centred and small: it is a question, not a
// second settings screen.

import {
  Button,
  Modal,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type TFunction } from "../i18n/index.ts";
import type {
  CalendarPlan,
  ImportChoice,
  ImportChoices,
  ImportPlan,
} from "../storage/backup.ts";

export function ImportMergeModal({
  open,
  plan,
  exportedAt,
  choices,
  busy,
  onChoose,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  plan: ImportPlan;
  /** When the file was written, as it was written (an ISO timestamp). */
  exportedAt: string;
  choices: ImportChoices;
  busy: boolean;
  onChoose: (next: ImportChoices) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const conflicts = plan.calendars.filter((cal) => cal.status === "conflict");
  // A calendar that is neither contested nor bringing anything has nothing to
  // say — it is only in the file because it is in both places already.
  const additions = plan.calendars.filter(
    (cal) =>
      cal.status === "new" || (cal.status === "merge" && cal.addedDays > 0),
  );

  return (
    <Modal
      open={open}
      onClose={onCancel}
      centered
      size="max-w-lg"
      labelledBy="import-merge-title"
      closeLabel={t("common.cancel")}
      footer={
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-3 px-4 py-3">
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? t("backup.importing") : t("backup.importAction")}
          </Button>
        </footer>
      }
    >
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <h2
          id="import-merge-title"
          className="text-sm font-bold tracking-wide text-fg-bright"
        >
          {t("backup.importTitle")}
        </h2>
        <p className="text-muted mt-1 text-xs">{t("backup.importBlurb")}</p>
        {exportedAt !== "" && (
          <p className="text-muted mt-0.5 text-[11px]">
            {t("backup.exportedAt", { date: formatStamp(exportedAt) })}
          </p>
        )}

        {plan.settings === "conflict" && (
          <ChoiceRow
            t={t}
            title={t("backup.settingsRow")}
            detail={t("backup.settingsDiffer")}
            value={choices.settings}
            onChange={(next) => onChoose({ ...choices, settings: next })}
          />
        )}
        {plan.settings === "adopt" && (
          <p className="text-muted mt-3 text-xs">
            {t("backup.settingsAdopted")}
          </p>
        )}

        {conflicts.map((cal) => (
          <ChoiceRow
            key={cal.slug}
            t={t}
            title={cal.name}
            detail={conflictDetail(t, cal)}
            value={choices.calendars[cal.slug] ?? "mine"}
            onChange={(next) =>
              onChoose({
                ...choices,
                calendars: { ...choices.calendars, [cal.slug]: next },
              })
            }
          />
        ))}

        {additions.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="text-muted text-xs">{t("backup.alsoApplied")}</div>
            <ul className="mt-1 space-y-0.5">
              {additions.map((cal) => (
                <li key={cal.slug} className="text-xs text-fg">
                  <span className="font-bold">{cal.name}</span>{" "}
                  <span className="text-muted">{additionDetail(t, cal)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

// One decision: what it is about, why it is being asked, and the two answers.
// The control sits under the caption rather than beside it — at 393 px a row
// with a name on the left and two buttons on the right has no width left for
// either.
function ChoiceRow({
  t,
  title,
  detail,
  value,
  onChange,
}: {
  t: TFunction;
  title: string;
  detail: string;
  value: ImportChoice;
  onChange: (next: ImportChoice) => void;
}) {
  return (
    <div className="mt-3 rounded border border-line bg-surface-2 p-3">
      <div className="text-sm font-bold text-fg-bright">{title}</div>
      <div className="text-muted mt-0.5 text-xs">{detail}</div>
      <div className="mt-2">
        <SegmentedControl<ImportChoice>
          value={value}
          onChange={onChange}
          ariaLabel={t("backup.whoWins")}
          fullWidth
          options={[
            { value: "mine", label: t("backup.keepMine") },
            { value: "imported", label: t("backup.useFile") },
          ]}
        />
      </div>
    </div>
  );
}

/** Why this calendar is a question: days written differently on both sides, a
 *  different name in the file, or both. */
function conflictDetail(t: TFunction, cal: CalendarPlan): string {
  const parts: string[] = [];
  if (cal.conflictDays > 0) parts.push(daysDiffer(t, cal.conflictDays));
  if (cal.renamed) {
    parts.push(t("backup.calendarRenamed", { name: cal.incomingName }));
  }
  if (cal.addedDays > 0) parts.push(daysAdded(t, cal.addedDays));
  return parts.join(" · ");
}

/** What a calendar nobody has to decide about brings with it. */
function additionDetail(t: TFunction, cal: CalendarPlan): string {
  const parts: string[] = [];
  if (cal.status === "new") parts.push(t("backup.calendarNew"));
  if (cal.addedDays > 0) parts.push(daysAdded(t, cal.addedDays));
  return parts.join(" · ");
}

// Counted phrases, singular apart: "1 dagar" is wrong in the Swedish catalog
// and "1 days" in the English one.
function daysAdded(t: TFunction, n: number): string {
  return n === 1
    ? t("backup.calendarOneDayAdded")
    : t("backup.calendarDaysAdded", { n });
}

function daysDiffer(t: TFunction, n: number): string {
  return n === 1
    ? t("backup.calendarOneDayDiffers")
    : t("backup.calendarDaysDiffer", { n });
}

/** The export stamp as a day, in the reader's own locale. Falls back to the
 *  raw string for a file whose timestamp we can't parse — it is a caption, not
 *  a value anything is decided on. */
function formatStamp(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : at.toLocaleDateString();
}

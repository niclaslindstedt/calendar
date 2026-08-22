// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Storage tab's last block: emptying a calendar. It sits under import and
// export because it is the same question from the other end — a backup is the
// copy you take before you throw the notes away, and the section says so.
//
// Two safeguards, and no more: the button opens a confirmation that names the
// calendar and counts what is about to go (the framework's `ConfirmDialog`,
// in its danger tone), and the button is dead when there is nothing to
// remove. Everything else about the app is left alone — the calendars keep
// their names and icons, the settings keep their values, the storage
// connection keeps its token; only the days are emptied.
//
// Like the backup pair above it, this applies immediately rather than waiting
// on the dialog's Save: the confirmation is the answer, and a reset that the
// footer's Cancel could undo half an hour later would be a worse promise than
// the one the dialog just made.

import { useState } from "react";

import {
  Button,
  ConfirmDialog,
  Section,
  SegmentedControl,
  TrashIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type TFunction } from "../i18n/index.ts";
import type { ResetScope } from "../storage/reset.ts";
import type { ResetActions, ResetResult } from "../useReset.ts";

export function ResetSection({
  reset,
  /** The active calendar's name — what the confirmation is about. */
  calendarName,
  /** How many calendars there are: with one, there is no scope to pick. */
  calendarCount,
  /** True while the demo backend is standing in for the real one — there is
   *  nothing of the reader's in it to remove. */
  demoData,
}: {
  reset: ResetActions;
  calendarName: string;
  calendarCount: number;
  demoData: boolean;
}) {
  const t = useT();
  const [scope, setScope] = useState<ResetScope>("active");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);

  const nothingToRemove = scope === "active" && reset.activeNotes === 0;
  const blocked = demoData || reset.busy || nothingToRemove;

  const run = async () => {
    setAsking(false);
    setResult(await reset.reset(scope));
  };

  return (
    <Section title={t("reset.heading")}>
      <div className="text-muted text-xs">{t("reset.hint")}</div>

      {calendarCount > 1 && (
        <SegmentedControl
          value={scope}
          options={[
            { value: "active", label: t("reset.scopeActive") },
            { value: "all", label: t("reset.scopeAll") },
          ]}
          onChange={(next) => {
            setScope(next);
            setResult(null);
          }}
          ariaLabel={t("reset.scope")}
          fullWidth
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="danger"
          onClick={() => {
            setResult(null);
            setAsking(true);
          }}
          disabled={blocked}
        >
          <span className="inline-flex items-center gap-1.5">
            <TrashIcon className="h-3.5 w-3.5" />
            {t("reset.action")}
          </span>
        </Button>
      </div>

      {demoData && (
        <div className="text-muted text-xs">{t("reset.demoBlocked")}</div>
      )}
      {!demoData && nothingToRemove && (
        <div className="text-muted text-xs">
          {t("reset.nothingToRemove", { name: calendarName })}
        </div>
      )}
      {reset.busy && (
        <div className="text-muted text-xs">{t("reset.working")}</div>
      )}
      {result && result.failed.length > 0 && (
        <div className="text-xs text-danger">
          {t("reset.failed", { calendars: result.failed.join(", ") })}
        </div>
      )}
      {result && result.failed.length === 0 && (
        <div className="text-muted text-xs">
          {result.scope === "all"
            ? t("reset.doneAll", { n: result.calendars })
            : t("reset.doneOne", { name: calendarName })}
        </div>
      )}

      <ConfirmDialog
        open={asking}
        title={t("reset.confirmTitle")}
        description={confirmBlurb(t, scope, calendarName, {
          notes: reset.activeNotes,
          calendars: calendarCount,
        })}
        confirmLabel={t("reset.confirmAction")}
        tone="danger"
        onConfirm={() => void run()}
        onCancel={() => setAsking(false)}
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
      />
    </Section>
  );
}

// What the confirmation says is about to happen. The count is the safeguard —
// "every note in Personal" is an abstraction, "37 of them" is a number the
// reader can recognise as wrong — so the calendar on screen names one and the
// all-calendars answer names how many calendars are going.
function confirmBlurb(
  t: TFunction,
  scope: ResetScope,
  name: string,
  counts: { notes: number; calendars: number },
): string {
  if (scope === "all") return t("reset.confirmAll", { n: counts.calendars });
  return counts.notes === 1
    ? t("reset.confirmOneNote", { name })
    : t("reset.confirmOne", { name, n: counts.notes });
}

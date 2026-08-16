// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Entries tab: how the text you write on a day is sized, and how the day
// list lays its rows out. Both are part of the previewed look — they edit the
// dialog's draft and only take effect on Save.

import {
  Field,
  Section,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { ENTRY_TEXT_SIZES, type EntryTextSize } from "../entryFont.ts";
import { useT, type MessageKey } from "../i18n/index.ts";
import type { ListRowMode, LookSettings } from "../useAppSettings.ts";

type UpdateLook = <K extends keyof LookSettings>(
  key: K,
  value: LookSettings[K],
) => void;

const TEXT_SIZE_LABELS: Record<EntryTextSize, MessageKey> = {
  dynamic: "settings.textSizeDynamic",
  small: "settings.textSizeSmall",
  medium: "settings.textSizeMedium",
  large: "settings.textSizeLarge",
};

export function EntriesSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();

  return (
    <>
      <Section title={t("settings.entryText")}>
        <Field label={t("settings.textSize")}>
          <SegmentedControl<EntryTextSize>
            value={look.textSize}
            onChange={(next) => onUpdate("textSize", next)}
            ariaLabel={t("settings.textSize")}
            options={ENTRY_TEXT_SIZES.map((size) => ({
              value: size,
              label: t(TEXT_SIZE_LABELS[size]),
            }))}
          />
          <p className="text-muted text-xs">{t("settings.textSizeHint")}</p>
        </Field>
      </Section>

      <Section title={t("settings.dayListRows")}>
        <Field label={t("settings.rows")}>
          <SegmentedControl<ListRowMode>
            value={look.listRows}
            onChange={(next) => onUpdate("listRows", next)}
            ariaLabel={t("settings.dayListRows")}
            options={[
              { value: "fixed", label: t("settings.rowsFixed") },
              { value: "dynamic", label: t("settings.rowsDynamic") },
            ]}
          />
          <p className="text-muted text-xs">{t("settings.dayListRowsHint")}</p>
        </Field>
      </Section>
    </>
  );
}

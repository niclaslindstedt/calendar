// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The landing tab: the UI language, the country calendar (and the display
// toggles that travel with it), and the developer-mode switch that reveals
// the Developer tab.
//
// The country and its toggles are part of the previewed look, so they edit
// the dialog's draft and only take effect on Save. Language and developer
// mode live in their own device-local stores and apply immediately.

import {
  Field,
  LabeledInput,
  Section,
  SelectPicker,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { setLanguage, useLang, useT } from "../i18n/index.ts";
import { LOCALES, getLocale } from "../locale/index.ts";
import {
  clampVacationDays,
  effectiveToggles,
  type LookSettings,
} from "../useAppSettings.ts";

type UpdateLook = <K extends keyof LookSettings>(
  key: K,
  value: LookSettings[K],
) => void;

export function GeneralSection({
  look,
  onUpdate,
  devMode,
  onDevModeChange,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
  devMode: boolean;
  onDevModeChange: (next: boolean) => void;
}) {
  const t = useT();
  const lang = useLang();
  const toggles = effectiveToggles(look);

  return (
    <>
      <Section title={t("settings.language")}>
        <Field label={t("settings.languageChoose")}>
          <SelectPicker
            value={lang}
            onChange={(next) => setLanguage(next)}
            ariaLabel={t("settings.language")}
            options={[
              { value: "en", label: t("settings.languageEnglish") },
              { value: "sv", label: t("settings.languageSwedish") },
            ]}
          />
        </Field>
        <p className="text-muted text-xs">{t("settings.languageHint")}</p>
      </Section>

      <Section title={t("settings.country")}>
        <Field label={t("settings.countryChoose")}>
          <SelectPicker
            value={look.localeId}
            onChange={(next) => onUpdate("localeId", next)}
            ariaLabel={t("settings.country")}
            options={LOCALES.map((l) => ({ value: l.id, label: l.label }))}
          />
        </Field>
        <p className="text-muted text-xs">{t("settings.countryHint")}</p>
        <ToggleRow
          label={t("settings.weekNumbers")}
          hint={t("settings.weekNumbersHint")}
          checked={toggles.weekNumbers}
          onChange={(next) => onUpdate("weekNumbers", next)}
        />
        {getLocale(look.localeId).nameDays && (
          <ToggleRow
            label={t("settings.nameDays")}
            hint={t("settings.nameDaysHint")}
            checked={toggles.nameDays}
            onChange={(next) => onUpdate("nameDays", next)}
          />
        )}
      </Section>

      {/* The allowance the vacation planner spends. It sits here rather than
          on the planner screen so that screen is pure output — you read a
          plan, you don't configure one. */}
      <Section title={t("settings.vacation")}>
        <LabeledInput
          label={t("settings.vacationDays")}
          type="number"
          min={0}
          max={365}
          step={1}
          inputMode="numeric"
          value={String(look.vacationDays)}
          onCommit={(next) => onUpdate("vacationDays", clampVacationDays(next))}
        />
        <p className="text-muted text-xs">{t("settings.vacationDaysHint")}</p>
      </Section>

      <Section title={t("settings.tabDeveloper")}>
        <ToggleRow
          label={t("developer.devMode")}
          hint={t("developer.devModeHint")}
          checked={devMode}
          onChange={onDevModeChange}
        />
      </Section>
    </>
  );
}

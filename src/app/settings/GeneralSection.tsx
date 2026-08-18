// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The landing tab: the UI language, the country calendar (and the display
// toggles that travel with it), and the developer-mode switch that reveals
// the Developer tab.
//
// The country and its toggles are part of the previewed look, so they edit
// the dialog's draft and only take effect on Save. Language and developer
// mode live in their own device-local stores and apply immediately.

import {
  Button,
  ExternalLinkIcon,
  Field,
  LabeledInput,
  Section,
  SegmentedControl,
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

/** A flag emoji as decoration: it repeats what the label beside it already
 *  says, so it is hidden from assistive tech, and it is pinned a shade larger
 *  than the label because emoji render small against text of the same size. */
function Flag({ emoji }: { emoji: string }) {
  return (
    <span aria-hidden="true" className="text-base leading-none">
      {emoji}
    </span>
  );
}

export function GeneralSection({
  look,
  onUpdate,
  devMode,
  onDevModeChange,
  onOpenPlanner,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
  devMode: boolean;
  onDevModeChange: (next: boolean) => void;
  /** Saves the dialog and leaves for the vacation planner. */
  onOpenPlanner: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const toggles = effectiveToggles(look);

  return (
    <>
      {/* Both languages side by side under their flags, the way the sibling
          apps present it: two choices are a pair of buttons, not a dropdown
          that hides one of them behind a tap. */}
      <Section title={t("settings.language")}>
        <Field label={t("settings.languageChoose")}>
          <SegmentedControl
            value={lang}
            onChange={(next) => setLanguage(next)}
            ariaLabel={t("settings.language")}
            options={[
              {
                value: "en",
                label: (
                  <>
                    <Flag emoji="🇬🇧" /> {t("settings.languageEnglish")}
                  </>
                ),
              },
              {
                value: "sv",
                label: (
                  <>
                    <Flag emoji="🇸🇪" /> {t("settings.languageSwedish")}
                  </>
                ),
              },
            ]}
          />
        </Field>
        <p className="text-muted text-xs">{t("settings.languageHint")}</p>
      </Section>

      {/* The country list stays a dropdown — it grows with every pack — but
          each entry leads with its flag, so the picker reads at a glance and
          matches the language buttons above. */}
      <Section title={t("settings.country")}>
        <Field label={t("settings.countryChoose")}>
          <SelectPicker
            value={look.localeId}
            onChange={(next) => onUpdate("localeId", next)}
            ariaLabel={t("settings.country")}
            options={LOCALES.map((l) => ({
              value: l.id,
              label: (
                <>
                  <Flag emoji={l.flag} /> {l.label}
                </>
              ),
              // The trigger and the typeahead both want plain text; the label
              // above is markup, so spell the searchable form out.
              typeaheadLabel: l.label,
            }))}
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
          plan, you don't configure one.

          Which leaves the planner itself with only one way in: tapping a
          holiday's name in a day cell. That is a fine gesture once you know
          it, and undiscoverable until you do — so the section that owns the
          allowance also carries the shortcut to what spends it. */}
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
        {/* `py-2` over the framework's default padding: this is a phone-first
            dialog, so the row clears the 36 px touch target. */}
        <Button
          variant="primary"
          onClick={onOpenPlanner}
          className="mt-3 flex w-full items-center justify-center gap-2 py-2"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          {t("settings.vacationOpenPlanner")}
        </Button>
        <p className="text-muted mt-2 text-xs">
          {t("settings.vacationOpenPlannerHint")}
        </p>
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

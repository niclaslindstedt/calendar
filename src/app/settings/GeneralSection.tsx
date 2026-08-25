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
  SelectPicker,
  ShieldIcon,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { LANGUAGES, setLanguage, useLang, useT } from "../i18n/index.ts";
import type { Lang } from "../i18n/index.ts";
import { LOCALES, getLocale } from "../locale/index.ts";
import {
  clampVacationDays,
  effectiveToggles,
  type LookSettings,
} from "../useAppSettings.ts";

/** A picker hands back a plain string; only the ids in `LANGUAGES` can come
 *  out of it, and an unknown one falls back rather than being asserted into
 *  the type. */
function asLang(value: string): Lang {
  return LANGUAGES.find((l) => l.id === value)?.id ?? "en";
}

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
      {/* A dropdown rather than the pair of buttons this used to be: seven
          languages do not fit a 393 px row without wrapping the top of the
          settings dialog onto a second line. It reads like the country picker
          below it, which is the other list that grows every time a country is
          added. */}
      <Section title={t("settings.language")}>
        <Field label={t("settings.languageChoose")}>
          <SelectPicker
            value={lang}
            onChange={(next) => setLanguage(asLang(next))}
            ariaLabel={t("settings.language")}
            options={LANGUAGES.map((l) => ({
              value: l.id,
              label: (
                <>
                  <Flag emoji={l.flag} /> {t(l.key)}
                </>
              ),
              // The trigger and the typeahead both want plain text; the label
              // above is markup, so spell the searchable form out.
              typeaheadLabel: t(l.key),
            }))}
          />
        </Field>
        <p className="text-muted text-xs">{t("settings.languageHint")}</p>
      </Section>

      {/* The country list is a dropdown for the same reason — it grows with
          every pack — and each entry leads with its flag, so the picker reads
          at a glance and matches the language one above. */}
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

      {/* The privacy policy, at the foot of the landing tab. It is a page of
          its own rather than a section here (`src/app/PrivacyPage.tsx`,
          served at `<base>privacy/`), because it is a legal document the app
          stores link to from outside the app — so it needs a URL, and it is
          English-only wherever the UI language is set.

          The trailing slash is load-bearing in the installed app: the native
          wrapper serves the build off a static file server, which resolves a
          directory's `index.html` for `…/privacy/` and 404s for `…/privacy`. */}
      <Section title={t("settings.privacy")}>
        <a
          href={`${import.meta.env.BASE_URL}privacy/`}
          className="text-link inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ShieldIcon className="h-4 w-4" />
          {t("settings.privacyOpen")}
        </a>
        <p className="text-muted mt-2 text-xs">{t("settings.privacyHint")}</p>
      </Section>
    </>
  );
}

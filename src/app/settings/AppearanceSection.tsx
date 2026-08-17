// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Appearance tab: the theme, and nothing else.
//
// The framework ships a fuller `AppearancePicker` — font family, UI text
// scale, corner radius, density, border width, elevation, button and control
// shapes, backdrops — and this app deliberately doesn't use it. A wall
// calendar has one look, and the knobs that matter here are the *calendar's*,
// not the widget kit's: the faces live on the Calendar tab, next to the cell
// they set. So this tab is mode, variant, and (for the Custom theme) the
// palette itself. The rest of `ThemeAppearance` stays at its defaults, which
// is what the app has always rendered with.
//
// Rendered against the dialog's draft, so the calendar behind it previews
// live and only Save persists.

import {
  COLOR_GROUPS,
  COLOR_LABELS,
  DARK_THEMES,
  DEFAULT_CUSTOM_THEME_COLORS_DARK,
  FAMILY_DEFAULT_THEME,
  LIGHT_THEMES,
  PRESET_PALETTES,
  THEME_LABELS,
  customThemeSeed,
  themeFamily,
  type CustomThemeColors,
  type ThemeAppearance,
  type ThemeFamily,
  type ThemePreset,
} from "@niclaslindstedt/oss-framework/theme";
import { Field, Section } from "@niclaslindstedt/oss-framework/components";

import { useT, type MessageKey } from "../i18n/index.ts";

/** Light before dark (the calendar's own default is the printed, light look),
 *  then the two that aren't a fixed palette. */
const MODE_ORDER: readonly ThemeFamily[] = [
  "system",
  "light",
  "dark",
  "custom",
];

const MODE_LABELS: Record<ThemeFamily, MessageKey> = {
  system: "settings.themeSystem",
  light: "settings.themeLight",
  dark: "settings.themeDark",
  custom: "settings.themeCustom",
};

const OPTION_CLASS =
  "flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-sm transition-opacity focus-visible:outline-2";

function optionClass(active: boolean): string {
  return `${OPTION_CLASS} ${
    active
      ? "border-accent bg-surface-2 text-fg-bright"
      : "hover:border-accent border-line bg-transparent text-muted opacity-60 hover:opacity-100"
  }`;
}

export function AppearanceSection({
  appearance,
  onChange,
}: {
  appearance: ThemeAppearance;
  onChange: (next: ThemeAppearance) => void;
}) {
  const t = useT();
  const family = themeFamily(appearance.theme);

  function selectTheme(next: ThemePreset): void {
    if (next === "custom" && appearance.theme !== "custom") {
      // Open the palette as a copy of what is on screen, so the first edit is
      // a tweak rather than a reset.
      const prefersLight =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: light)").matches;
      onChange({
        ...appearance,
        theme: next,
        customTheme: customThemeSeed(appearance.theme, prefersLight),
      });
      return;
    }
    onChange({ ...appearance, theme: next });
  }

  function setColor(key: keyof CustomThemeColors, value: string): void {
    onChange({
      ...appearance,
      customTheme: {
        ...appearance.customTheme,
        colors: { ...appearance.customTheme.colors, [key]: value },
      },
    });
  }

  const variants =
    family === "dark" ? DARK_THEMES : family === "light" ? LIGHT_THEMES : null;

  return (
    <>
      <Section title={t("settings.theme")}>
        <Field label={t("settings.themeMode")}>
          <div
            role="radiogroup"
            aria-label={t("settings.themeMode")}
            className="flex flex-wrap gap-2"
          >
            {MODE_ORDER.map((mode) => {
              const active = family === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    if (!active) selectTheme(FAMILY_DEFAULT_THEME[mode]);
                  }}
                  className={optionClass(active)}
                >
                  <ThemeSwatch
                    theme={FAMILY_DEFAULT_THEME[mode]}
                    customColors={appearance.customTheme.colors}
                  />
                  <span>{t(MODE_LABELS[mode])}</span>
                </button>
              );
            })}
          </div>
          {appearance.theme === "system" && (
            <p className="text-muted text-xs">
              {t("settings.themeSystemNote")}
            </p>
          )}
        </Field>

        {variants && (
          <Field label={t("settings.themeVariant")}>
            <div
              role="radiogroup"
              aria-label={t("settings.themeVariant")}
              className="flex flex-wrap gap-2"
            >
              {variants.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  role="radio"
                  aria-checked={appearance.theme === theme}
                  onClick={() => selectTheme(theme)}
                  className={optionClass(appearance.theme === theme)}
                >
                  <ThemeSwatch theme={theme} />
                  <span>{THEME_LABELS[theme]}</span>
                </button>
              ))}
            </div>
          </Field>
        )}
      </Section>

      {appearance.theme === "custom" && (
        <Section title={t("settings.themeColours")}>
          {COLOR_GROUPS.map((group) => (
            <Field key={group.id} label={group.label}>
              <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-x-2 gap-y-2.5">
                {group.keys.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer flex-col items-center gap-1 text-center"
                  >
                    <input
                      type="color"
                      value={appearance.customTheme.colors[key]}
                      onInput={(e) => setColor(key, e.currentTarget.value)}
                      className="h-8 w-full cursor-pointer rounded border border-line bg-transparent"
                    />
                    <span className="text-muted text-[10px] leading-tight">
                      {COLOR_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          ))}
        </Section>
      )}
    </>
  );
}

/** The four tones that give a palette its character, as a stack of stripes.
 *  `system` is the dark/light pair split on the diagonal, since it is both. */
function ThemeSwatch({
  theme,
  customColors,
}: {
  theme: ThemePreset;
  customColors?: CustomThemeColors;
}) {
  if (theme === "system") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 shrink-0 rounded-sm border border-line"
        style={{
          background:
            "linear-gradient(135deg, #010409 0 50%, #f6f8fa 50% 100%)",
        }}
      />
    );
  }
  const palette =
    theme === "custom"
      ? (customColors ?? DEFAULT_CUSTOM_THEME_COLORS_DARK)
      : PRESET_PALETTES[theme];
  const tones = [palette.pageBg, palette.surface, palette.fg, palette.accent];
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 shrink-0 gap-px overflow-hidden rounded-sm border border-line"
    >
      {tones.map((tone, i) => (
        <span
          key={i}
          className="block h-full w-1.5"
          style={{ background: tone }}
        />
      ))}
    </span>
  );
}

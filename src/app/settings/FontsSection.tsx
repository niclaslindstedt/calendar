// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab's type: which face each part of a day is set in, and how
// big your own writing is.
//
// A printed calendar doesn't set the whole page in one font — the date is
// display type, the almanac's captions are small and plain, and what you add
// is your own hand. So the four pieces pick a face each, previewed in the face
// itself, and only your text carries a size (the captions' sizes are measured
// against the 47 px month cell and are not a taste call — see AGENTS.md).
//
// Part of the previewed look: the edits stream to the calendar behind the
// dialog and only persist on Save.

import { useEffect } from "react";

import {
  Field,
  Section,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";
import { loadAllFontFamilies } from "@niclaslindstedt/oss-framework/theme";

import { ENTRY_TEXT_SIZES, type EntryTextSize } from "../entryFont.ts";
import { CAL_FONTS, type CalFontId, type CalFontPiece } from "../fonts.ts";
import { useT, type MessageKey, type TFunction } from "../i18n/index.ts";
import { CAL_FONT_KEY, type LookSettings } from "../useAppSettings.ts";

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

const FONT_LABELS: Record<CalFontId, MessageKey> = {
  print: "settings.fontPrint",
  serif: "settings.fontSerif",
  sans: "settings.fontSans",
  mono: "settings.fontMono",
  dyslexic: "settings.fontDyslexic",
};

/** The pieces, in the order a cell reads them. */
const PIECE_LABELS: Record<CalFontPiece, MessageKey> = {
  day: "settings.cellDayNumber",
  holidays: "settings.cellHolidays",
  nameDays: "settings.cellNameDays",
  entry: "settings.fontYourText",
};

const PIECES = Object.keys(PIECE_LABELS) as CalFontPiece[];

export function FontsSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();

  // The non-default families load on demand; pull them all in while the
  // dialog is open so each option previews in its real face rather than in
  // the fallback stack. Same trick as the sibling `notes` app's font picker.
  useEffect(() => {
    loadAllFontFamilies();
  }, []);

  return (
    <>
      <Section title={t("settings.fonts")}>
        <p className="text-muted text-xs">{t("settings.fontsHint")}</p>
        {PIECES.map((piece) => (
          <Field key={piece} label={t(PIECE_LABELS[piece])}>
            <FontRow
              t={t}
              label={t(PIECE_LABELS[piece])}
              value={look[CAL_FONT_KEY[piece]]}
              onChange={(next) => onUpdate(CAL_FONT_KEY[piece], next)}
            />
          </Field>
        ))}
      </Section>

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
    </>
  );
}

/** The faces as a wrapping radio row, each option set in the face it offers —
 *  the pick is the preview. Wraps rather than scrolls: five short labels fit
 *  two lines in a 393 px portrait panel. */
function FontRow({
  t,
  label,
  value,
  onChange,
}: {
  t: TFunction;
  label: string;
  value: CalFontId;
  onChange: (next: CalFontId) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {CAL_FONTS.map((font) => {
        const active = font.id === value;
        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(font.id)}
            style={{ fontFamily: font.stack }}
            className={`cursor-pointer rounded border px-3 py-1.5 text-sm transition-opacity focus-visible:outline-2 ${
              active
                ? "border-accent bg-surface-2 text-fg-bright"
                : "hover:border-accent border-line bg-transparent text-muted opacity-60 hover:opacity-100"
            }`}
          >
            {t(FONT_LABELS[font.id])}
          </button>
        );
      })}
    </div>
  );
}

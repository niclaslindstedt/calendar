// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab's sizes: how big each part of a day is printed.
//
// One slider per piece, all reading the same way — left is smaller, right is
// bigger — because "which of these is too small for me" is a question you
// answer by dragging until it isn't, not by choosing between four adjectives.
//
// The four almanac pieces (the date, a holiday's name, the day's names, the
// week number) step through a shared ladder of scales whose middle stop, 100%,
// is the size each was measured at (see `textSize.ts`). Your own text is a
// different kind of setting and keeps its own ladder: it is sized against the
// room a view actually leaves it, so its stops are shrink-to-fit plus the
// three fixed steps rather than percentages of a fixed size.
//
// Part of the previewed look — the edits stream to the calendar behind the
// dialog and are only written on Save.

import { Section } from "@niclaslindstedt/oss-framework/components";

import { ENTRY_TEXT_SIZES, type EntryTextSize } from "../entryFont.ts";
import { useT, type MessageKey } from "../i18n/index.ts";
import {
  SCALED_PIECES,
  TEXT_SCALES,
  textScaleAt,
  textScaleIndex,
  textScaleLabel,
  type ScaledPiece,
} from "../textSize.ts";
import { TEXT_SCALE_KEY, type LookSettings } from "../useAppSettings.ts";

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

/** The almanac's pieces, in the order a cell reads them. */
const PIECE_LABELS: Record<ScaledPiece, MessageKey> = {
  day: "settings.cellDayNumber",
  holidays: "settings.cellHolidays",
  nameDays: "settings.cellNameDays",
  week: "settings.cellWeekNumber",
};

export function TextSizeSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();

  return (
    <Section title={t("settings.textSize")}>
      <p className="text-muted text-xs">{t("settings.textSizeHint")}</p>

      {/* Your own text leads: it is the one piece of a day you put there. */}
      <SizeSlider
        label={t("settings.fontYourText")}
        valueLabel={t(TEXT_SIZE_LABELS[look.textSize])}
        index={Math.max(0, ENTRY_TEXT_SIZES.indexOf(look.textSize))}
        max={ENTRY_TEXT_SIZES.length - 1}
        onChange={(index) =>
          onUpdate("textSize", ENTRY_TEXT_SIZES[index] ?? ENTRY_TEXT_SIZES[0])
        }
        hint={t("settings.textSizeEntryHint")}
      />

      {SCALED_PIECES.map((piece) => {
        const key = TEXT_SCALE_KEY[piece];
        return (
          <SizeSlider
            key={piece}
            label={t(PIECE_LABELS[piece])}
            valueLabel={textScaleLabel(look[key])}
            index={textScaleIndex(look[key])}
            max={TEXT_SCALES.length - 1}
            onChange={(index) => onUpdate(key, textScaleAt(index))}
          />
        );
      })}
    </Section>
  );
}

/** One labelled slider over a ladder of steps. The value is a *position* on
 *  the ladder rather than the size itself, so the two ladders — percentages
 *  and the entry's named modes — take the same control and neither slider
 *  can land between two stops.
 *
 *  A native range input, themed through `accent-color` (`.cal-slider` in
 *  `src/styles.css`): it is the one control that already answers a drag, a
 *  tap on the track, an arrow key and a screen reader without being rebuilt.
 *  `onInput` rather than `onChange` so the calendar behind the dialog
 *  previews while the thumb is still moving. */
function SizeSlider({
  label,
  valueLabel,
  index,
  max,
  onChange,
  hint,
}: {
  label: string;
  valueLabel: string;
  index: number;
  max: number;
  onChange: (index: number) => void;
  hint?: string;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-fg text-sm">{label}</span>
        <span className="text-muted text-xs tabular-nums">{valueLabel}</span>
      </div>
      <input
        type="range"
        className="cal-slider"
        min={0}
        max={max}
        step={1}
        value={index}
        aria-label={label}
        aria-valuetext={valueLabel}
        onInput={(e) => onChange(Number(e.currentTarget.value))}
      />
      {hint && <p className="text-muted -mt-1 text-xs">{hint}</p>}
    </div>
  );
}

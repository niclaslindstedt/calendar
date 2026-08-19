// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab's sizes: how big each part of a day is printed.
//
// One row per piece, and each row is the same pair: the sizes as buttons on
// the left, a sample of that piece printed at the chosen size on the right.
// "Which of these is too small for me" is a question you answer by looking,
// and a slider hid the answer behind a drag — the number it moved (80%, 125%)
// only means something once you have seen it. Three named steps say the same
// thing in words the whole section already uses, and the sample beside them
// says it in the type itself.
//
// The four almanac pieces (the date, a holiday's name, the day's names, the
// week number) share one ladder of scales whose middle step is the size each
// was measured at (see `textSize.ts`). Your own text is a different kind of
// setting and keeps its own ladder: it is sized against the room a view
// actually leaves it, so its steps are shrink-to-fit plus the three fixed
// ones rather than scales of a fixed size.
//
// The samples are printed with the same `.cal-font-*` / `.cal-size-*` classes
// the views paint with, at the sizes the day list prints each piece at — so a
// sample is the real thing at a real size, not a mock-up of one. The day
// list rather than the month cell because a month cell's captions are 7.5 px:
// true, and unreadable in a dialog.
//
// Part of the previewed look — the edits stream to the calendar behind the
// dialog and are only written on Save.

import {
  Field,
  Section,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import {
  ENTRY_TEXT_SIZES,
  MONTH_CELL_FONT,
  resolveEntryFontPx,
  type EntryTextSize,
} from "../entryFont.ts";
import { useT, type MessageKey, type TFunction } from "../i18n/index.ts";
import {
  SCALED_PIECES,
  TEXT_STEPS,
  textStepOf,
  textStepScale,
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

/** What each sample is printed in and how big, taken from the day list —
 *  the one view that prints all four pieces at a size a dialog can show.
 *  Ordinary text is the sample for the two captions; the two numbers are
 *  numbers, so a sample that isn't one would be a lie about the width. */
const SAMPLE_CLASS: Record<ScaledPiece, string> = {
  day: "cal-font-day cal-size-day [--cal-base:1.125rem]",
  holidays: "cal-font-holiday cal-size-holiday [--cal-base:10px]",
  nameDays: "cal-font-nameday cal-size-nameday text-muted [--cal-base:10px]",
  week: "cal-size-week text-muted [--cal-base:9px]",
};

/** The sample day the section prints. The date is the one the Calendar tab's
 *  cell preview uses, so the two read as the same sample day; the names are
 *  that day's, and the week is the week it falls in. */
function sampleOf(piece: ScaledPiece, t: TFunction): string {
  switch (piece) {
    case "day":
      return "31";
    case "holidays":
      return t("settings.textSizeSampleHoliday");
    case "nameDays":
      return "Edit, Edgar";
    case "week":
      return "44";
  }
}

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

      {/* Your own text leads: it is the one piece of a day you put there. Its
        sample is sized the way the month cell sizes it — on `dynamic` that is
        the curve's answer for a note this long, which is the point of the
        step. */}
      <SizeRow
        label={t("settings.fontYourText")}
        value={look.textSize}
        options={ENTRY_TEXT_SIZES}
        optionLabel={(size) => t(TEXT_SIZE_LABELS[size])}
        onChange={(next) => onUpdate("textSize", next)}
        hint={t("settings.textSizeEntryHint")}
        sample={t("settings.textSizeSampleNote")}
        sampleClass="cal-font-entry"
        sampleStyle={{
          fontSize: `${resolveEntryFontPx(
            t("settings.textSizeSampleNote").length,
            MONTH_CELL_FONT,
            look.textSize,
          )}px`,
        }}
      />

      {SCALED_PIECES.map((piece) => {
        const key = TEXT_SCALE_KEY[piece];
        return (
          <SizeRow
            key={piece}
            label={t(PIECE_LABELS[piece])}
            value={textStepOf(look[key])}
            options={TEXT_STEPS}
            optionLabel={(step) => t(TEXT_SIZE_LABELS[step])}
            onChange={(next) => onUpdate(key, textStepScale(next))}
            sample={sampleOf(piece, t)}
            sampleClass={SAMPLE_CLASS[piece]}
          />
        );
      })}
    </Section>
  );
}

/** One labelled row: the steps as a segmented control, and the sample beside
 *  it.
 *
 *  The value is a *step* rather than a size, so the two ladders — the
 *  almanac's scales and the entry's named modes — take the same control and
 *  neither can land between two stops. The control is the framework's, so the
 *  buttons answer a tap, an arrow key and a screen reader the way every other
 *  choice in this dialog does.
 *
 *  The sample box is a fixed width, so the four almanac rows line up and the
 *  step buttons keep the width they were measured to fit as the sample inside
 *  grows — a sample too wide for the box wraps inside it rather than the box
 *  taking the room back off the buttons. It is `aria-hidden`: it is the type
 *  itself, which is exactly what a screen reader cannot use, and the buttons
 *  beside it already say which size is set. */
function SizeRow<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
  hint,
  sample,
  sampleClass,
  sampleStyle,
}: {
  label: string;
  value: T;
  options: readonly T[];
  optionLabel: (value: T) => string;
  onChange: (next: T) => void;
  hint?: string;
  sample: string;
  sampleClass: string;
  sampleStyle?: { fontSize: string };
}) {
  return (
    <Field label={label}>
      <div className="flex w-full items-stretch gap-2">
        <SegmentedControl<T>
          value={value}
          options={options.map((option) => ({
            value: option,
            label: optionLabel(option),
          }))}
          onChange={onChange}
          ariaLabel={label}
          fullWidth
          className="cal-size-steps min-w-0 flex-1"
        />
        <div
          aria-hidden="true"
          className="border-line bg-surface-2 flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border px-1 text-center leading-tight"
        >
          <span className={sampleClass} style={sampleStyle}>
            {sample}
          </span>
        </div>
      </div>
      {hint && <p className="text-muted w-full text-xs">{hint}</p>}
    </Field>
  );
}

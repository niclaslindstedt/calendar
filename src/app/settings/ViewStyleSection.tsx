// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab's View section: one view at a time, arranged and set on a
// sample of itself.
//
// Three questions used to be three sections — where the pieces of a month cell
// go, which face each piece is set in, how big each of them is printed — and
// all three had the same answer for every view, which is the wrong answer.
// A month cell is 47 px wide with captions measured to hold a name on one
// line; a strip row is the width of the screen with a lane down the left.
// So the section leads with a **view picker** — the top bar's own control, in
// the top bar's order — and everything under it belongs to the view it names.
//
// The week planner and the day list share one set of answers. They print the
// same row from the same code (`stripRow.tsx`), so a setting that moved in one
// and not the other would be a bug rather than a feature; what the third
// button changes is which of the two the sample shows, and the two do differ
// there — a week row is a band and a list row is a line.
//
// Under the picker, in the order the questions arise:
//
//   1. the sample, which is also the designer: tap a quadrant of the day to
//      choose what is printed there;
//   2. what the pieces leave the note — where it sits in the room a month
//      cell's corners leave, and, in a strip row (which is a line and so has
//      no "middle"), whether it may run under the margins as well as between
//      them;
//   3. one row per piece: the face on the left, the size on the right.
//
// Face and size are one row because they are one decision. Two sections asked
// for the same five labels twice, which on a 393 px portrait panel is most of
// a screen of scrolling spent on nothing.
//
// Part of the previewed look — the edits stream to the calendar behind the
// dialog and are only written on Save. The sample reads the same CSS variables
// the calendar behind it does, so it moves as the calendar moves.

import { useEffect, useState } from "react";

import {
  CheckIcon,
  Field,
  Section,
  SegmentedControl,
  SelectPicker,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";
import { loadAllFontFamilies } from "@niclaslindstedt/oss-framework/theme";

import { ENTRY_TEXT_SIZES, type EntryTextSize } from "../entryFont.ts";
import { CAL_FONTS, calFontStack, type CalFontId } from "../fonts.ts";
import { useT, type MessageKey, type TFunction } from "../i18n/index.ts";
import {
  STRIP_SLOTS,
  type StripPiece,
  type StripSlot,
} from "../stripLayout.ts";
import {
  TEXT_STEPS,
  textStepOf,
  textStepScale,
  type TextStep,
} from "../textSize.ts";
import {
  CELL_PIECES,
  CELL_PIECE_KEY,
  STRIP_PIECE_KEY,
  monthCellLayout,
  stripLayoutOf,
  stripNoteFlows,
  type CellCorner,
  type CellPiece,
  type LookSettings,
  type NotePlacement,
} from "../useAppSettings.ts";
import {
  SCOPE_OF_VIEW,
  STYLE_VIEWS,
  STYLED_PIECES,
  setPieceStyle,
  type StyleView,
  type StyledPiece,
} from "../viewStyle.ts";
import { MonthSample, StripSample } from "./viewSample.tsx";

type UpdateLook = <K extends keyof LookSettings>(
  key: K,
  value: LookSettings[K],
) => void;

const VIEW_LABELS: Record<StyleView, MessageKey> = {
  month: "topbar.viewMonth",
  week: "topbar.viewWeek",
  list: "topbar.viewList",
};

const PIECE_LABELS: Record<StyledPiece, MessageKey> = {
  day: "settings.cellDayNumber",
  holidays: "settings.cellHolidays",
  nameDays: "settings.cellNameDays",
  week: "settings.cellWeekNumber",
  entry: "settings.fontYourText",
};

const FONT_LABELS: Record<CalFontId, MessageKey> = {
  print: "settings.fontPrint",
  serif: "settings.fontSerif",
  sans: "settings.fontSans",
  mono: "settings.fontMono",
  dyslexic: "settings.fontDyslexic",
};

const SIZE_LABELS: Record<EntryTextSize, MessageKey> = {
  dynamic: "settings.textSizeDynamic",
  small: "settings.textSizeSmall",
  medium: "settings.textSizeMedium",
  large: "settings.textSizeLarge",
};

/** The four quadrants, in reading order. A month cell names them by corner and
 *  a strip row by margin — the same four places, described the way each view's
 *  own anatomy describes them. */
const QUADRANTS = ["top-left", "top-right", "bottom-left", "bottom-right"];

const CORNER_LABELS: Record<CellCorner, MessageKey> = {
  "top-left": "settings.cellTopLeft",
  "top-right": "settings.cellTopRight",
  "bottom-left": "settings.cellBottomLeft",
  "bottom-right": "settings.cellBottomRight",
};

const SLOT_LABELS: Record<StripSlot, MessageKey> = {
  "lane-top": "settings.stripLaneTop",
  "lane-bottom": "settings.stripLaneBottom",
  "rail-top": "settings.stripRailTop",
  "rail-bottom": "settings.stripRailBottom",
};

/** The quadrant a month corner and a strip slot each occupy, so one designer
 *  can place both. Index into {@link QUADRANTS}. */
const CORNER_QUADRANT: Record<CellCorner, number> = {
  "top-left": 0,
  "top-right": 1,
  "bottom-left": 2,
  "bottom-right": 3,
};

const SLOT_QUADRANT: Record<StripSlot, number> = {
  "lane-top": 0,
  "rail-top": 1,
  "lane-bottom": 2,
  "rail-bottom": 3,
};

export function ViewStyleSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();
  // Which view is being adjusted. Device-local and unsaved: it is a question
  // about the dialog, not about the calendar, so it resets to the month with
  // every open rather than persisting as a setting nobody chose.
  const [view, setView] = useState<StyleView>("month");
  const scope = SCOPE_OF_VIEW[view];
  const style = look.styles[scope];

  // The non-default families load on demand; pull them all in while the dialog
  // is open so each option in the face picker previews in its real face rather
  // than in the fallback stack. Same trick as the sibling `notes` app.
  useEffect(() => {
    loadAllFontFamilies();
  }, []);

  return (
    <Section title={t("settings.viewStyle")}>
      <p className="text-muted text-xs">{t("settings.viewStyleHint")}</p>

      <SegmentedControl<StyleView>
        value={view}
        onChange={setView}
        ariaLabel={t("settings.viewStylePicker")}
        fullWidth
        options={STYLE_VIEWS.map((id) => ({
          value: id,
          label: t(VIEW_LABELS[id]),
        }))}
      />

      {/* Said once, where the answer to "why did the day list change too?"
          belongs: under the control that just changed it. */}
      {scope === "strip" && (
        <p className="text-muted text-xs">{t("settings.viewStyleShared")}</p>
      )}

      <Designer look={look} onUpdate={onUpdate} view={view} />

      {/* Where the note goes, asked the way each view can answer it. A month
          cell's note has no corner — it takes the room the corners leave — so
          it is placed in that room. A strip row is a line, so there is no
          "middle" to place it in and the question is the other one: how much
          of the row the margins leave it. Both sit here, under the sample that
          previews them. */}
      {view === "month" ? (
        <Field label={t("settings.cellNote")}>
          <SegmentedControl<NotePlacement>
            value={look.monthNote}
            onChange={(next) => onUpdate("monthNote", next)}
            ariaLabel={t("settings.cellNote")}
            options={[
              { value: "top", label: t("settings.cellNoteTop") },
              { value: "middle", label: t("settings.cellNoteMiddle") },
              { value: "bottom", label: t("settings.cellNoteBottom") },
            ]}
          />
        </Field>
      ) : (
        <ToggleRow
          label={t("settings.stripNoteFlow")}
          hint={t("settings.stripNoteFlowHint")}
          checked={stripNoteFlows(look)}
          onChange={(next) => onUpdate("stripNoteFlow", next)}
        />
      )}

      {STYLED_PIECES.map((piece) => (
        <TypeRow
          key={piece}
          t={t}
          label={t(PIECE_LABELS[piece])}
          font={style[piece].font}
          onFont={(next) =>
            onUpdate(
              "styles",
              setPieceStyle(look.styles, scope, piece, {
                font: next,
              }),
            )
          }
          // Your own text is sized against the room a view leaves it rather
          // than as a scale of a measured size, so its ladder is the curve
          // plus the three fixed modes — a different question with the same
          // three words for an answer.
          sizes={piece === "entry" ? ENTRY_TEXT_SIZES : TEXT_STEPS}
          size={
            piece === "entry" ? style.entry.size : textStepOf(style[piece].size)
          }
          onSize={(next) =>
            onUpdate(
              "styles",
              setPieceStyle(look.styles, scope, piece, {
                size:
                  piece === "entry"
                    ? (next as EntryTextSize)
                    : textStepScale(next as TextStep),
              } as never),
            )
          }
        />
      ))}

      <p className="text-muted text-xs">{t("settings.textSizeEntryHint")}</p>
    </Section>
  );
}

/** The sample and the picker as one control: four quadrant buttons over the
 *  day, each opening the list of pieces that can be printed there.
 *
 *  One designer for both scopes rather than two, because the four places are
 *  the same four places — a month cell's corners and a strip row's two margins
 *  each split into a top and a bottom end. Only the words differ, and the
 *  sample under them. */
function Designer({
  look,
  onUpdate,
  view,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
  view: StyleView;
}) {
  const t = useT();
  // The quadrant whose menu is open, if any. One at a time: the menu covers a
  // good share of a 393 px sample.
  const [open, setOpen] = useState<number | null>(null);
  const month = view === "month";
  const cell = monthCellLayout(look);
  const strip = stripLayoutOf(look);

  // What each quadrant is called, and what is currently parked in it.
  const label = (q: number): string =>
    month ? t(CORNER_LABELS[cornerAt(q)]) : t(SLOT_LABELS[slotAt(q)]);

  const pieces: readonly (CellPiece | StripPiece)[] = month
    ? CELL_PIECES
    : (["day", "holidays", "nameDays", "week"] as const);

  const parkedIn = (q: number, piece: CellPiece | StripPiece): boolean =>
    month
      ? cell[piece as CellPiece] === cornerAt(q)
      : strip[piece as StripPiece] === slotAt(q);

  const move = (q: number, piece: CellPiece | StripPiece) => {
    if (month) {
      onUpdate(CELL_PIECE_KEY[piece as CellPiece], cornerAt(q));
    } else {
      onUpdate(STRIP_PIECE_KEY[piece as StripPiece], slotAt(q));
    }
    setOpen(null);
  };

  return (
    <div className="relative mt-1">
      {/* The sample stands on the calendar's own ground, framed the way the
          view frames a day, so what you are rearranging looks like where it
          will land. A month cell is a column and a strip row is a line, so
          the box is the shape of the thing rather than one size for both. */}
      <div
        className={`bg-page-bg relative rounded border border-line ${
          month ? "h-44 px-1 pt-0.5 pb-1" : "h-28"
        }`}
      >
        {/* The sample takes no taps: the quadrants over it are the control. */}
        <div className="pointer-events-none h-full select-none">
          {month ? (
            <MonthSample look={look} />
          ) : (
            <StripSample look={look} view={view} />
          )}
        </div>

        {/* The tap targets: a quadrant each, outlined faintly so the four
            places read as places you can put something before you have tried
            tapping one. */}
        {QUADRANTS.map((quadrant, q) => (
          <button
            key={quadrant}
            type="button"
            aria-label={label(q)}
            aria-haspopup="menu"
            aria-expanded={open === q}
            onClick={() => setOpen((prev) => (prev === q ? null : q))}
            className={`absolute h-1/2 w-1/2 cursor-pointer rounded border border-dashed transition-colors focus-visible:outline-2 ${
              quadrant.startsWith("top") ? "top-0" : "bottom-0"
            } ${quadrant.endsWith("left") ? "left-0" : "right-0"} ${
              open === q
                ? "border-accent bg-accent/10"
                : "hover:border-accent border-line/60 hover:bg-accent/5"
            }`}
          />
        ))}
      </div>

      {open !== null && (
        <>
          {/* Outside tap dismisses, the same pattern the settings header's
              section menu uses. */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("settings.cellCloseMenu")}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label={label(open)}
            className="absolute top-1/2 left-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded border border-line bg-surface-3 p-2 shadow-xl"
          >
            <p className="text-muted px-2 pb-1 text-[11px] font-bold tracking-wide uppercase">
              {label(open)}
            </p>
            {pieces.map((piece) => {
              const here = parkedIn(open, piece);
              return (
                <button
                  key={piece}
                  type="button"
                  role="menuitemradio"
                  aria-checked={here}
                  onClick={() => move(open, piece)}
                  className={`hover:bg-surface flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm ${
                    here ? "text-accent font-bold" : "text-fg"
                  }`}
                >
                  <CheckIcon
                    className={`h-3.5 w-3.5 shrink-0 ${here ? "" : "opacity-0"}`}
                  />
                  <span>{t(PIECE_LABELS[piece])}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function cornerAt(quadrant: number): CellCorner {
  return (Object.keys(CORNER_QUADRANT) as CellCorner[]).find(
    (corner) => CORNER_QUADRANT[corner] === quadrant,
  ) as CellCorner;
}

function slotAt(quadrant: number): StripSlot {
  return STRIP_SLOTS.find(
    (slot) => SLOT_QUADRANT[slot] === quadrant,
  ) as StripSlot;
}

/** One piece's row: the face on the left, the size on the right.
 *
 *  The face is a dropdown rather than the wrapping radio row it used to be —
 *  five faces × five pieces is twenty-five buttons, and a portrait panel does
 *  not have them. Each option is labelled *in* the face it offers, which is
 *  what the radio row was really for; the trigger keeps that, so the row shows
 *  the current face without being opened.
 *
 *  The size stays buttons: three (or four) steps side by side is a question
 *  you answer by looking, which is why it is not a dropdown too. */
function TypeRow({
  t,
  label,
  font,
  onFont,
  sizes,
  size,
  onSize,
}: {
  t: TFunction;
  label: string;
  font: CalFontId;
  onFont: (next: CalFontId) => void;
  sizes: readonly string[];
  size: string;
  onSize: (next: string) => void;
}) {
  return (
    <div className="mt-3 first:mt-0">
      {/* The face rides on the piece's own label line — a dropdown is a line
          of text, and putting it there is what buys the steps below the full
          width they need for four labels at 393 px. */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-fg-bright min-w-0 truncate text-sm">{label}</span>
        <SelectPicker<CalFontId>
          value={font}
          onChange={onFont}
          ariaLabel={`${label} — ${t("settings.fonts")}`}
          // `triggerClassName` *replaces* the framework's own trigger classes
          // rather than adding to them, so the control's chrome is repeated
          // here — with a fixed width in place of the default `w-full`, which
          // would take the whole line the label is sharing with it.
          triggerClassName="flex w-32 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-left text-sm text-fg hover:border-accent focus-visible:border-accent focus-visible:outline-none"
          // The pick is the preview: every option is set in the face it
          // offers, and so is the trigger once it has been picked.
          renderValue={(option) => (
            <span
              className="truncate"
              style={{ fontFamily: calFontStack(option?.value ?? font) }}
            >
              {option?.label ?? ""}
            </span>
          )}
          options={CAL_FONTS.map((face) => ({
            value: face.id,
            label: t(FONT_LABELS[face.id]),
            labelStyle: { fontFamily: face.stack },
          }))}
        />
      </div>
      <SegmentedControl<string>
        value={size}
        onChange={onSize}
        ariaLabel={`${label} — ${t("settings.textSize")}`}
        fullWidth
        className="cal-size-steps mt-1.5"
        options={sizes.map((step) => ({
          value: step,
          label: t(SIZE_LABELS[step as EntryTextSize]),
        }))}
      />
    </div>
  );
}

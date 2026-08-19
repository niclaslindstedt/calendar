// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How each part of a day is *set* — the face it is printed in and how big —
// answered per view rather than once for the whole app.
//
// The three views are three different pages. A month cell is 47 px wide and
// its captions are measured to hold a name on one line; a strip row is the
// width of the screen with a lane down the left. A size that makes the month
// grid readable is a size that leaves the week planner looking half-set, so
// "how big are the name days" is not one question — it is one per view.
//
// It is not three answers either. The week planner and the day list print the
// same day: the same lane, the same rail, the same pieces from the same code
// (`stripRow.tsx`). So they share one set of settings — a **scope** — and the
// picker's third button changes which of the two the sample shows rather than
// which settings it edits.
//
//   month → the month grid's cells
//   strip → the week planner's rows and the day list's rows
//
// Each scope's values reach the views as CSS variables on `<html>`
// (`App.tsx` writes them): one prefixed pair per piece, which the two
// `.cal-scope-*` classes in `src/styles.css` map down onto the unprefixed
// names `.cal-font-*` / `.cal-size-*` paint with. A view carries its scope's
// class, so the same cell markup renders at the settings of whichever view it
// is in — and the settings dialog's sample does too, by carrying the class of
// the view it is previewing.
//
// The sizes are *scales* of a measured default rather than px values, for the
// reason `textSize.ts` gives: the shipped size of a piece is a measurement,
// so a setting moves a multiplier and 1 is the middle step. Your own text is
// the exception in both directions — it is sized against the room a view
// leaves it (`entryFont.ts`), so its ladder is shrink-to-fit plus three fixed
// modes rather than scales.

import { ENTRY_TEXT_SIZES, type EntryTextSize } from "./entryFont.ts";
import {
  captionScale,
  calFontStack,
  dateColumnEm,
  isCalFont,
  type CalFontId,
} from "./fonts.ts";
import { DEFAULT_TEXT_SCALE, clampTextScale } from "./textSize.ts";

/** The two sets of settings a day can be printed under. */
export const STYLE_SCOPES = ["month", "strip"] as const;

export type StyleScope = (typeof STYLE_SCOPES)[number];

/** The views the picker offers — the top bar's three, in the top bar's order,
 *  so "which view am I adjusting" is asked with the control the reader
 *  already uses to change view. */
export const STYLE_VIEWS = ["month", "week", "list"] as const;

export type StyleView = (typeof STYLE_VIEWS)[number];

/** Which scope a view is printed under. The week planner and the day list
 *  share one: they are the same row, drawn at two heights. */
export const SCOPE_OF_VIEW: Record<StyleView, StyleScope> = {
  month: "month",
  week: "strip",
  list: "strip",
};

/** The class a view (and the dialog's sample of it) carries so the scoped
 *  variables resolve to that view's settings. */
export const SCOPE_CLASS: Record<StyleScope, string> = {
  month: "cal-scope-month",
  strip: "cal-scope-strip",
};

/** The pieces of a day that carry a face and a size. The four the almanac
 *  prints, plus your own text. */
export const STYLED_PIECES = [
  "day",
  "holidays",
  "nameDays",
  "week",
  "entry",
] as const;

export type StyledPiece = (typeof STYLED_PIECES)[number];

/** The almanac's own pieces — the ones whose size is a scale of a measured
 *  default. Your own text is sized on a different ladder, so it is not here. */
export const SCALED_PIECES = ["day", "holidays", "nameDays", "week"] as const;

export type ScaledPiece = (typeof SCALED_PIECES)[number];

/** The name a piece goes by in CSS. Singular where the stylesheet was
 *  already singular — these are the second half of every variable name and
 *  of the `.cal-font-*` / `.cal-size-*` classes, which shipped before the
 *  settings were per-view. */
const PIECE_SLUG: Record<StyledPiece, string> = {
  day: "day",
  holidays: "holiday",
  nameDays: "nameday",
  week: "week",
  entry: "entry",
};

/** How one almanac piece is set. */
export type PieceStyle = {
  font: CalFontId;
  /** A scale of the piece's measured default — a step on `textSize.ts`'s
   *  ladder. */
  size: number;
};

/** How your own text is set: the same face picker, and the entry ladder. */
export type EntryStyle = {
  font: CalFontId;
  size: EntryTextSize;
};

/** One view's type. */
export type ViewStyle = Record<ScaledPiece, PieceStyle> & {
  entry: EntryStyle;
};

/** Both views' type — what the look carries. */
export type CalStyles = Record<StyleScope, ViewStyle>;

/** The printed-almanac defaults, and what every view looked like before the
 *  faces and sizes became per-view settings: the date in the display serif,
 *  the captions and your own text in the UI font, and every piece at the size
 *  it was measured at.
 *
 *  The one difference between the two scopes is the week number. The strip
 *  prints it in the margin the way an almanac does — display serif, italic —
 *  while the month grid's gutter is a plain number beside the grid, so the
 *  two ship in the faces they already had. */
export const DEFAULT_CAL_STYLES: CalStyles = {
  month: {
    day: { font: "print", size: DEFAULT_TEXT_SCALE },
    holidays: { font: "mono", size: DEFAULT_TEXT_SCALE },
    nameDays: { font: "mono", size: DEFAULT_TEXT_SCALE },
    week: { font: "mono", size: DEFAULT_TEXT_SCALE },
    entry: { font: "mono", size: "dynamic" },
  },
  strip: {
    day: { font: "print", size: DEFAULT_TEXT_SCALE },
    holidays: { font: "mono", size: DEFAULT_TEXT_SCALE },
    nameDays: { font: "mono", size: DEFAULT_TEXT_SCALE },
    week: { font: "print", size: DEFAULT_TEXT_SCALE },
    entry: { font: "mono", size: "dynamic" },
  },
};

/** The faces a scope has in use — what `App.tsx` asks the framework to
 *  fetch. */
export function facesOf(styles: CalStyles): CalFontId[] {
  const ids = new Set<CalFontId>();
  for (const scope of STYLE_SCOPES) {
    for (const piece of STYLED_PIECES) ids.add(styles[scope][piece].font);
  }
  return [...ids];
}

/** The variable a piece's face is published as, for a scope. */
export function fontVar(scope: StyleScope, piece: StyledPiece): string {
  return `--cal-${scope}-font-${PIECE_SLUG[piece]}`;
}

/** The variable a piece's size is published as, for a scope. */
export function sizeVar(scope: StyleScope, piece: ScaledPiece): string {
  return `--cal-${scope}-size-${PIECE_SLUG[piece]}`;
}

/** The `<html>` variables for both scopes — what `App.tsx` writes.
 *
 *  Every scope publishes every piece, so a `.cal-scope-*` class can map the
 *  whole set down with no gaps: a piece that resolved to nothing would fall
 *  through to whatever the enclosing scope had set, which on a settings
 *  sample would be the *other* view's answer. */
export function styleVars(styles: CalStyles): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const scope of STYLE_SCOPES) {
    const style = styles[scope];
    for (const piece of STYLED_PIECES) {
      vars[fontVar(scope, piece)] = calFontStack(style[piece].font);
    }
    for (const piece of SCALED_PIECES) {
      vars[sizeVar(scope, piece)] = String(style[piece].size);
    }
    // The three numbers a face implies rather than states: the two caption
    // shrinks the month cell needs from a face wider than the measured
    // baseline (`CAPTION_SCALE` in `fonts.ts`), and the width the strip row's
    // date column needs from the face its digits are set in. Published per
    // scope like everything else, so one view's face never sizes another's.
    vars[`--cal-${scope}-nameday-scale`] = String(
      captionScale(style.nameDays.font),
    );
    vars[`--cal-${scope}-holiday-scale`] = String(
      captionScale(style.holidays.font),
    );
    // The room the strip row's date column has to leave two digits, which is
    // a fact about the face the date is set in (`DATE_COLUMN_EM`) — and so is
    // per view too, since the face is.
    vars[`--cal-${scope}-date-em`] = String(dateColumnEm(style.day.font));
  }
  return vars;
}

/** A stable key for a set of styles — what the effects and memos in
 *  `App.tsx` compare on. The object is rebuilt whenever the settings blob is
 *  written (or a draft is edited), and the views it feeds are memoized, so
 *  comparing the values rather than the reference is what keeps a change to
 *  an unrelated setting from re-rendering three months of day cells. */
export function stylesSignature(styles: CalStyles): string {
  return STYLE_SCOPES.map((scope) =>
    STYLED_PIECES.map((piece) => {
      const style = styles[scope][piece];
      return `${style.font}:${style.size}`;
    }).join(","),
  ).join("|");
}

/** One edit: a piece's face or size, in one scope. Returns a whole new
 *  `CalStyles` — the look is edited as a value, so the draft can be dropped
 *  by throwing the object away. */
export function setPieceStyle<P extends StyledPiece>(
  styles: CalStyles,
  scope: StyleScope,
  piece: P,
  patch: Partial<ViewStyle[P]>,
): CalStyles {
  return {
    ...styles,
    [scope]: {
      ...styles[scope],
      [piece]: { ...styles[scope][piece], ...patch },
    },
  };
}

/** The entry ladder, held to its four modes. */
function entrySizeOf(value: unknown): EntryTextSize {
  return ENTRY_TEXT_SIZES.includes(value as EntryTextSize)
    ? (value as EntryTextSize)
    : "dynamic";
}

/** A face, held to the ones the app offers. */
function fontOf(value: unknown, fallback: CalFontId): CalFontId {
  return isCalFont(value) ? value : fallback;
}

/** What a stored (or hand-edited) blob resolves to. Settings are plain JSON
 *  in localStorage and the storage hook merges a stored partial over the
 *  defaults *shallowly*, so a blob written by an older build — or by a text
 *  editor — reaches here with anything in it, including nothing. Every value
 *  is snapped back onto its ladder here, once, so nothing downstream has to
 *  wonder. */
export function resolveCalStyles(
  raw: unknown,
  fallback: CalStyles = DEFAULT_CAL_STYLES,
): CalStyles {
  const stored = isRecord(raw) ? raw : {};
  const styles = {} as CalStyles;
  for (const scope of STYLE_SCOPES) {
    const scoped = isRecord(stored[scope]) ? stored[scope] : {};
    const base = fallback[scope];
    const view = {} as ViewStyle;
    for (const piece of SCALED_PIECES) {
      const value = isRecord(scoped[piece]) ? scoped[piece] : {};
      view[piece] = {
        font: fontOf(value.font, base[piece].font),
        size: clampTextScale(value.size ?? base[piece].size),
      };
    }
    const entry = isRecord(scoped.entry) ? scoped.entry : {};
    view.entry = {
      font: fontOf(entry.font, base.entry.font),
      size: entrySizeOf(entry.size ?? base.entry.size),
    };
    styles[scope] = view;
  }
  return styles;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

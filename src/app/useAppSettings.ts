// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's own (non-theme) settings: country calendar, view mode, display
// toggles, storage choice, developer mode. The framework hook owns the
// persistence mechanics (safe parse, merging a stored partial over the
// defaults, write-through); this store owns the key and the shape. The UI
// *language* is owned by the framework i18n runtime (see `i18n/index.ts`),
// and the theme by the appearance store — neither lives here.

import { useCallback } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";

import type { EntryTextSize } from "./entryFont.ts";
import {
  CAL_FONT_PIECES,
  DEFAULT_CAL_FONTS,
  type CalFontId,
  type CalFontPiece,
  type CalFonts,
} from "./fonts.ts";
import { DEFAULT_LOCALE_ID, getLocale } from "./locale/index.ts";
import type { BackendId } from "./storage/backends.ts";
import {
  DEFAULT_TEXT_SCALE,
  SCALED_PIECES,
  clampTextScale,
  type ScaledPiece,
  type TextScales,
} from "./textSize.ts";

export type ViewMode = "month" | "week" | "list";
export type ListRowMode = "fixed" | "dynamic";

/** A month cell has four corners a piece can be parked in. The top pair share
 *  a band with the day number (which floats, so a short caption sits beside it
 *  and a long one drops under it); the bottom pair caption the cell's bottom
 *  edge. Two pieces in the same corner stack, in reading order. */
export type CellCorner =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Where the note sits in the room the corners leave it. */
export type NotePlacement = "top" | "middle" | "bottom";

/** The month cell's layout — what goes where in the 47 px column. */
export type MonthCellLayout = {
  day: CellCorner;
  nameDays: CellCorner;
  holidays: CellCorner;
  note: NotePlacement;
};

/** The pieces a cell can arrange, in the order they stack when they share a
 *  corner: the number reads first, then the holiday, then the day's names. */
export const CELL_PIECES = ["day", "holidays", "nameDays"] as const;

export type CellPiece = (typeof CELL_PIECES)[number];

export type AppSettings = {
  /** Country pack id (`src/app/locale/`). */
  localeId: string;
  view: ViewMode;
  /** null = follow the country pack's default. */
  weekNumbers: boolean | null;
  /** null = follow the country pack's default. */
  nameDays: boolean | null;
  /** Day-list rows: same height, or grown per row by its text. */
  listRows: ListRowMode;
  /** Entry text: shrink-to-fit, or pinned small / medium / large. */
  textSize: EntryTextSize;
  /** The day number's size, as a scale of its measured default. */
  sizeDay: number;
  /** A holiday name's size, as a scale of its measured default. */
  sizeHolidays: number;
  /** The day's names' size, as a scale of their measured default. */
  sizeNameDays: number;
  /** The week number's size, as a scale of its measured default. */
  sizeWeek: number;
  /** The face the day number is set in. */
  fontDay: CalFontId;
  /** The face a holiday's name is set in. */
  fontHolidays: CalFontId;
  /** The face the day's names are set in. */
  fontNameDays: CalFontId;
  /** The face your own text is set in. */
  fontEntry: CalFontId;
  /** Month cell: the corner the day number takes. */
  monthDayCorner: CellCorner;
  /** Month cell: the corner the day's names take. */
  monthNameDayCorner: CellCorner;
  /** Month cell: the corner the holiday name takes. */
  monthHolidayCorner: CellCorner;
  /** Month cell: where the note sits in what is left. */
  monthNote: NotePlacement;
  /** Paid vacation days a year, spent by the vacation planner. 25 is the
   *  Swedish statutory minimum and the usual UK full-time allowance, so it is
   *  the right default in both shipped packs. */
  vacationDays: number;
  backend: BackendId;
  devMode: boolean;
  captureLogs: boolean;
  demoData: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  localeId: DEFAULT_LOCALE_ID,
  view: "month",
  weekNumbers: null,
  nameDays: null,
  listRows: "fixed",
  textSize: "dynamic",
  sizeDay: DEFAULT_TEXT_SCALE,
  sizeHolidays: DEFAULT_TEXT_SCALE,
  sizeNameDays: DEFAULT_TEXT_SCALE,
  sizeWeek: DEFAULT_TEXT_SCALE,
  fontDay: DEFAULT_CAL_FONTS.day,
  fontHolidays: DEFAULT_CAL_FONTS.holidays,
  fontNameDays: DEFAULT_CAL_FONTS.nameDays,
  fontEntry: DEFAULT_CAL_FONTS.entry,
  // The printed wall-calendar arrangement, straight off a Swedish almanac:
  // the number large in the top-right corner, the day's writing space under
  // it, and the captions stacked in the bottom-right corner — the holiday
  // first, the name days beneath it.
  monthDayCorner: "top-right",
  monthNameDayCorner: "bottom-right",
  monthHolidayCorner: "bottom-right",
  monthNote: "top",
  vacationDays: 25,
  backend: "browser",
  devMode: false,
  captureLogs: false,
  demoData: false,
};

/** The look settings the Settings dialog edits against a draft and only
 *  writes on Save. Everything else in `AppSettings` — the active view, the
 *  storage backend, the developer switches — applies the moment it is
 *  toggled, so it is deliberately not part of this set. */
export const LOOK_KEYS = [
  "localeId",
  "weekNumbers",
  "nameDays",
  "listRows",
  "textSize",
  "sizeDay",
  "sizeHolidays",
  "sizeNameDays",
  "sizeWeek",
  "fontDay",
  "fontHolidays",
  "fontNameDays",
  "fontEntry",
  "monthDayCorner",
  "monthNameDayCorner",
  "monthHolidayCorner",
  "monthNote",
  "vacationDays",
] as const;

export type LookSettings = Pick<AppSettings, (typeof LOOK_KEYS)[number]>;

export function pickLook(settings: AppSettings): LookSettings {
  return {
    localeId: settings.localeId,
    weekNumbers: settings.weekNumbers,
    nameDays: settings.nameDays,
    listRows: settings.listRows,
    textSize: settings.textSize,
    sizeDay: settings.sizeDay,
    sizeHolidays: settings.sizeHolidays,
    sizeNameDays: settings.sizeNameDays,
    sizeWeek: settings.sizeWeek,
    fontDay: settings.fontDay,
    fontHolidays: settings.fontHolidays,
    fontNameDays: settings.fontNameDays,
    fontEntry: settings.fontEntry,
    monthDayCorner: settings.monthDayCorner,
    monthNameDayCorner: settings.monthNameDayCorner,
    monthHolidayCorner: settings.monthHolidayCorner,
    monthNote: settings.monthNote,
    vacationDays: settings.vacationDays,
  };
}

/** The month cell layout the views read, gathered from the look. */
export function monthCellLayout(
  look: Pick<
    AppSettings,
    "monthDayCorner" | "monthNameDayCorner" | "monthHolidayCorner" | "monthNote"
  >,
): MonthCellLayout {
  return {
    day: look.monthDayCorner,
    nameDays: look.monthNameDayCorner,
    holidays: look.monthHolidayCorner,
    note: look.monthNote,
  };
}

/** The look key that parks a given piece, so the settings grid can move one
 *  by name without a switch at every call site. */
export const CELL_PIECE_KEY = {
  day: "monthDayCorner",
  holidays: "monthHolidayCorner",
  nameDays: "monthNameDayCorner",
} as const satisfies Record<CellPiece, keyof LookSettings>;

/** The look key that sets each piece's face — the same "move one by name"
 *  idiom as {@link CELL_PIECE_KEY}, for the font pickers. */
export const CAL_FONT_KEY = {
  day: "fontDay",
  holidays: "fontHolidays",
  nameDays: "fontNameDays",
  entry: "fontEntry",
} as const satisfies Record<CalFontPiece, keyof LookSettings>;

/** The faces the views paint with, gathered from the look. */
export function calFonts(look: LookSettings): CalFonts {
  const fonts = {} as CalFonts;
  for (const piece of CAL_FONT_PIECES) {
    fonts[piece] = look[CAL_FONT_KEY[piece]];
  }
  return fonts;
}

/** The look key that sizes each piece — the same "move one by name" idiom as
 *  {@link CELL_PIECE_KEY}, for the text-size sliders. */
export const TEXT_SCALE_KEY = {
  day: "sizeDay",
  holidays: "sizeHolidays",
  nameDays: "sizeNameDays",
  week: "sizeWeek",
} as const satisfies Record<ScaledPiece, keyof LookSettings>;

/** The sizes the views paint at, gathered from the look and snapped back onto
 *  the ladder — a hand-edited document can carry anything. */
export function textScales(look: LookSettings): TextScales {
  const scales = {} as TextScales;
  for (const piece of SCALED_PIECES) {
    scales[piece] = clampTextScale(look[TEXT_SCALE_KEY[piece]]);
  }
  return scales;
}

export const DEFAULT_LOOK: LookSettings = pickLook(DEFAULT_SETTINGS);

/** One edit to the look draft, with the country rule applied: switching
 *  country re-seats the display toggles on the new pack's defaults — the
 *  wall-calendar conventions travel with the country. */
export function updateLook<K extends keyof LookSettings>(
  prev: LookSettings,
  key: K,
  value: LookSettings[K],
): LookSettings {
  const next = { ...prev, [key]: value };
  if (key === "localeId") {
    next.weekNumbers = null;
    next.nameDays = null;
  }
  return next;
}

/** A vacation allowance the planner can actually work with. The field is a
 *  free-text number, and a stored document can be hand-edited, so every read
 *  goes through here: whole days, never negative, never more than a year. */
export function clampVacationDays(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.vacationDays;
  return Math.max(0, Math.min(365, n));
}

const STORAGE_KEY = "calendar:settings";

export function useAppSettings() {
  const [settings, setSettings] = useLocalStorageState<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "localeId") {
          next.weekNumbers = null;
          next.nameDays = null;
        }
        // Leaving developer mode also leaves demo data and log capture, so
        // neither the demo backend nor the Logs tab outlives the mode that
        // reveals them.
        if (key === "devMode" && value === false) {
          next.demoData = false;
          next.captureLogs = false;
        }
        return next;
      }),
    [setSettings],
  );

  /** Write a whole look draft at once — what Settings → Save commits. */
  const commitLook = useCallback(
    (look: LookSettings) => setSettings((prev) => ({ ...prev, ...look })),
    [setSettings],
  );

  return { settings, update, commitLook };
}

/** The effective display toggles: the stored override, or the pack default.
 *  Takes the look alone, so the Settings dialog can resolve them against its
 *  unsaved draft exactly as the views resolve them against the saved one. */
export function effectiveToggles(
  settings: Pick<AppSettings, "localeId" | "weekNumbers" | "nameDays">,
): {
  weekNumbers: boolean;
  nameDays: boolean;
} {
  const pack = getLocale(settings.localeId);
  return {
    weekNumbers: settings.weekNumbers ?? pack.showWeekNumbersDefault,
    nameDays: settings.nameDays ?? pack.showNameDaysDefault,
  };
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's own (non-theme) settings: country calendar, view mode, display
// toggles, storage choice, developer mode. The framework hook owns the
// persistence mechanics (safe parse, merging a stored partial over the
// defaults, write-through); this store owns the key and the shape. The UI
// *language* is owned by the framework i18n runtime (see `i18n/index.ts`),
// and the theme by the appearance store — neither lives here.

import { useCallback, useMemo } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";

import type { CalFontId } from "./fonts.ts";
import {
  DEFAULT_HEADER_COLOR,
  headerColorOf,
  headerInk,
  type HeaderColor,
} from "./headerColor.ts";
import {
  DEFAULT_LOCALE_ID,
  coerceEveChoices,
  getLocale,
  type EveChoices,
} from "./locale/index.ts";
import {
  DEFAULT_PAST_MARK,
  pastMarkScope,
  pastMarkStyle,
  type PastMark,
  type PastMarkScope,
  type PastMarkStyle,
} from "./pastDays.ts";
import type { BackendId } from "./storage/backends.ts";
import {
  DEFAULT_WEEK_DATE_SIZE,
  DEFAULT_WEEK_FORMAT,
  weekDateSizeOf,
  weekFormatOf,
  weekRowModeOf,
  type WeekDateSize,
  type WeekFormat,
  type WeekRowMode,
} from "./weekPlanner.ts";
import {
  DEFAULT_STRIP_LAYOUT,
  STRIP_PIECES,
  stripSlotOf,
  type StripLayout,
  type StripPiece,
  type StripSlot,
} from "./stripLayout.ts";
import {
  DEFAULT_CAL_STYLES,
  STYLE_SCOPES,
  resolveCalStyles,
  stylesSignature,
  type CalStyles,
} from "./viewStyle.ts";
import { clampTextScale } from "./textSize.ts";
import type { EntryTextSize } from "./entryFont.ts";

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
  /** Which of the country's holiday eves are worked, eve id → status. An
   *  eve that is not in here follows the country's collective agreements —
   *  so an untouched install stores nothing, and a pack that gains an eve in
   *  a later build ships it at its own default rather than at a stale one. */
  eveDays: EveChoices;
  /** Day-list rows: same height, or grown per row by its text. */
  listRows: ListRowMode;
  /** Week-planner rows: the same, decided separately (see `WeekRowMode`). */
  weekRows: WeekRowMode;
  /** Whether the week planner prints each day's ordinal in its year. */
  weekDayOfYear: boolean;
  /** How the week planner's margin prints a week number. */
  weekFormat: WeekFormat;
  /** How big the date is set at the head of a week row. */
  weekDateSize: WeekDateSize;
  /** The colour the period heading is banded with, and the week numbers are
   *  printed in. `none` — the default — leaves the heading as it was. */
  headerColor: HeaderColor;
  /** How each piece of a day is set — its face and its size — answered per
   *  view (`viewStyle.ts`): the month grid's cells and the strip views' rows
   *  are different enough pages that one answer could not serve both. */
  styles: CalStyles;
  /** Strip row: the slot the date (and its weekday) takes. */
  stripDaySlot: StripSlot;
  /** Strip row: the slot the day's names take. */
  stripNameDaySlot: StripSlot;
  /** Strip row: the slot the holiday's name takes. */
  stripHolidaySlot: StripSlot;
  /** Strip row: the slot the week number takes. */
  stripWeekSlot: StripSlot;
  /** Month cell: the corner the day number takes. */
  monthDayCorner: CellCorner;
  /** Month cell: the corner the day's names take. */
  monthNameDayCorner: CellCorner;
  /** Month cell: the corner the holiday name takes. */
  monthHolidayCorner: CellCorner;
  /** Month cell: where the note sits in what is left. */
  monthNote: NotePlacement;
  /** The stroke drawn over a day that has passed — off by default: not
   *  everyone wants their calendar written on. */
  pastMark: PastMarkStyle;
  /** How much of a passed day that stroke covers. */
  pastMarkScope: PastMarkScope;
  /** Paid vacation days a year, spent by the vacation planner. 25 is the
   *  Swedish statutory minimum and the usual UK full-time allowance, so it is
   *  the right default in both shipped packs. */
  vacationDays: number;
  backend: BackendId;
  devMode: boolean;
  captureLogs: boolean;
  demoData: boolean;

  // The pre-per-view type settings, kept only so a settings blob written by
  // an older build can be carried into `styles` on load (see
  // {@link migrateSettings}). Nothing reads them after that, and nothing
  // writes them — they are absent from `LOOK_KEYS`, so the first Save drops
  // them off the look.
  /** @deprecated folded into `styles.*.entry.size`. */
  textSize?: EntryTextSize;
  /** @deprecated folded into `styles.*.day.size`. */
  sizeDay?: number;
  /** @deprecated folded into `styles.*.holidays.size`. */
  sizeHolidays?: number;
  /** @deprecated folded into `styles.*.nameDays.size`. */
  sizeNameDays?: number;
  /** @deprecated folded into `styles.*.week.size`. */
  sizeWeek?: number;
  /** @deprecated folded into `styles.*.day.font`. */
  fontDay?: CalFontId;
  /** @deprecated folded into `styles.*.holidays.font`. */
  fontHolidays?: CalFontId;
  /** @deprecated folded into `styles.*.nameDays.font`. */
  fontNameDays?: CalFontId;
  /** @deprecated folded into `styles.*.entry.font`. */
  fontEntry?: CalFontId;
};

export const DEFAULT_SETTINGS: AppSettings = {
  localeId: DEFAULT_LOCALE_ID,
  view: "month",
  weekNumbers: null,
  nameDays: null,
  eveDays: {},
  listRows: "fixed",
  weekRows: "fixed",
  weekDayOfYear: false,
  weekFormat: DEFAULT_WEEK_FORMAT,
  weekDateSize: DEFAULT_WEEK_DATE_SIZE,
  headerColor: DEFAULT_HEADER_COLOR,
  styles: DEFAULT_CAL_STYLES,
  stripDaySlot: DEFAULT_STRIP_LAYOUT.day,
  stripNameDaySlot: DEFAULT_STRIP_LAYOUT.nameDays,
  stripHolidaySlot: DEFAULT_STRIP_LAYOUT.holidays,
  stripWeekSlot: DEFAULT_STRIP_LAYOUT.week,
  // The printed wall-calendar arrangement, straight off a Swedish almanac:
  // the number large in the top-right corner, the day's writing space under
  // it, and the captions stacked in the bottom-right corner — the holiday
  // first, the name days beneath it.
  monthDayCorner: "top-right",
  monthNameDayCorner: "bottom-right",
  monthHolidayCorner: "bottom-right",
  monthNote: "top",
  pastMark: DEFAULT_PAST_MARK.style,
  pastMarkScope: DEFAULT_PAST_MARK.scope,
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
  "eveDays",
  "listRows",
  "weekRows",
  "weekDayOfYear",
  "weekFormat",
  "weekDateSize",
  "headerColor",
  "styles",
  "stripDaySlot",
  "stripNameDaySlot",
  "stripHolidaySlot",
  "stripWeekSlot",
  "monthDayCorner",
  "monthNameDayCorner",
  "monthHolidayCorner",
  "monthNote",
  "pastMark",
  "pastMarkScope",
  "vacationDays",
] as const;

export type LookSettings = Pick<AppSettings, (typeof LOOK_KEYS)[number]>;

export function pickLook(settings: AppSettings): LookSettings {
  return {
    localeId: settings.localeId,
    weekNumbers: settings.weekNumbers,
    nameDays: settings.nameDays,
    eveDays: settings.eveDays,
    listRows: settings.listRows,
    weekRows: settings.weekRows,
    weekDayOfYear: settings.weekDayOfYear,
    weekFormat: settings.weekFormat,
    weekDateSize: settings.weekDateSize,
    headerColor: settings.headerColor,
    styles: settings.styles,
    stripDaySlot: settings.stripDaySlot,
    stripNameDaySlot: settings.stripNameDaySlot,
    stripHolidaySlot: settings.stripHolidaySlot,
    stripWeekSlot: settings.stripWeekSlot,
    monthDayCorner: settings.monthDayCorner,
    monthNameDayCorner: settings.monthNameDayCorner,
    monthHolidayCorner: settings.monthHolidayCorner,
    monthNote: settings.monthNote,
    pastMark: settings.pastMark,
    pastMarkScope: settings.pastMarkScope,
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

/** The passed-day mark the views draw, gathered from the look and snapped
 *  back onto the known values — a stored document can carry anything, and an
 *  unrecognised one must not put a stroke on the calendar. */
export function pastMarkOf(
  look: Pick<AppSettings, "pastMark" | "pastMarkScope">,
): PastMark {
  return {
    style: pastMarkStyle(look.pastMark),
    scope: pastMarkScope(look.pastMarkScope),
  };
}

/** The heading band's colour, as the CSS ink the views paint with — `null`
 *  when the band is off. Snapped back onto the known names on the way, like
 *  the passed-day mark above: a hand-edited setting must not reach a `style`
 *  attribute as an arbitrary string. */
export function headerInkOf(
  look: Pick<AppSettings, "headerColor">,
): string | null {
  return headerInk(look.headerColor);
}

/** The colour the heading picker has selected, held to the known names. */
export function headerColorFor(
  look: Pick<AppSettings, "headerColor">,
): HeaderColor {
  return headerColorOf(look.headerColor);
}

/** How the week planner sizes its rows, held to the two known modes. */
export function weekRowsOf(look: Pick<AppSettings, "weekRows">): WeekRowMode {
  return weekRowModeOf(look.weekRows);
}

/** How big the week planner sets its date, held to the four known steps. */
export function weekDateSizeFor(
  look: Pick<AppSettings, "weekDateSize">,
): WeekDateSize {
  return weekDateSizeOf(look.weekDateSize);
}

/** How the week planner's margin prints a week number, held to the three
 *  known formats. */
export function weekFormatFor(
  look: Pick<AppSettings, "weekFormat">,
): WeekFormat {
  return weekFormatOf(look.weekFormat);
}

/** The look key that parks a given piece, so the settings grid can move one
 *  by name without a switch at every call site. */
export const CELL_PIECE_KEY = {
  day: "monthDayCorner",
  holidays: "monthHolidayCorner",
  nameDays: "monthNameDayCorner",
} as const satisfies Record<CellPiece, keyof LookSettings>;

/** The look key that parks each strip-row piece — the same "move one by
 *  name" idiom as {@link CELL_PIECE_KEY}, for the week planner's and the day
 *  list's shared designer. */
export const STRIP_PIECE_KEY = {
  day: "stripDaySlot",
  holidays: "stripHolidaySlot",
  nameDays: "stripNameDaySlot",
  week: "stripWeekSlot",
} as const satisfies Record<StripPiece, keyof LookSettings>;

/** The strip row's arrangement, gathered from the look and held to the four
 *  slots a row has — a piece assigned to a slot that does not exist would
 *  simply vanish from both views. */
export function stripLayoutOf(
  look: Pick<AppSettings, (typeof STRIP_PIECE_KEY)[StripPiece]>,
): StripLayout {
  const layout = {} as StripLayout;
  for (const piece of STRIP_PIECES) {
    layout[piece] = stripSlotOf(look[STRIP_PIECE_KEY[piece]]);
  }
  return layout;
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
    // Eve ids are a country's own vocabulary, so a Swedish workplace's answers
    // mean nothing in another pack. Switching country hands the new one its
    // collective defaults, exactly as it hands over its display conventions.
    next.eveDays = {};
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

/** A settings blob as it comes off disk, for {@link migrateStyles}: the
 *  current keys plus the flat ones an older build wrote, with `styles` left
 *  unknown because a hand-edited file can carry anything under it. */
export type LegacyStyleSettings = Partial<Omit<AppSettings, "styles">> & {
  styles?: unknown;
};

/** The styles a stored blob resolves to, including one written before the
 *  type settings were per-view.
 *
 *  Until this build there was one face and one size per piece for the whole
 *  app (`fontDay`, `sizeDay`, …). Those become the *starting point for both
 *  scopes* — a reader who had set the day's names Large meant both views, and
 *  splitting the setting must not quietly reset half of it. The week number
 *  had no face of its own, so it keeps whichever face its scope ships today.
 *
 *  Pure, and taking the raw blob rather than an `AppSettings`, because the
 *  values it reads are ones the current type no longer has: the storage hook
 *  merges what is on disk over the defaults, so they arrive as extra keys. */
export function migrateStyles(raw: LegacyStyleSettings): CalStyles {
  const legacy = {} as CalStyles;
  for (const scope of STYLE_SCOPES) {
    const base = DEFAULT_CAL_STYLES[scope];
    legacy[scope] = {
      day: pieceFrom(base.day, raw.fontDay, raw.sizeDay),
      holidays: pieceFrom(base.holidays, raw.fontHolidays, raw.sizeHolidays),
      nameDays: pieceFrom(base.nameDays, raw.fontNameDays, raw.sizeNameDays),
      week: pieceFrom(base.week, undefined, raw.sizeWeek),
      entry: {
        font: raw.fontEntry ?? base.entry.font,
        size: raw.textSize ?? base.entry.size,
      },
    };
  }
  // The stored per-view object wins wherever it has an answer; the legacy
  // pair fills the rest. `resolveCalStyles` holds both to their ladders, so a
  // hand-edited blob can't reach the CSS either way.
  return resolveCalStyles(raw.styles, legacy);
}

function pieceFrom(
  base: { font: CalFontId; size: number },
  font: CalFontId | undefined,
  size: number | undefined,
) {
  return {
    font: font ?? base.font,
    size: size === undefined ? base.size : clampTextScale(size),
  };
}

const STORAGE_KEY = "calendar:settings";

export function useAppSettings() {
  const [stored, setSettings] = useLocalStorageState<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  // The type settings, resolved once per write of the blob rather than at
  // every read: they are validated, they may come from an older build's flat
  // keys, and what they feed (the CSS variables, the memoized views) compares
  // by value. Keyed on the signature so an unrelated setting — the active
  // view, a storage switch — doesn't hand the app a new object and re-render
  // three periods of day cells for nothing.
  const resolved = migrateStyles(stored);
  const signature = stylesSignature(resolved);
  const styles = useMemo(
    () => resolved,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );
  const settings = useMemo(
    () => (stored.styles === styles ? stored : { ...stored, styles }),
    [stored, styles],
  );

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "localeId") {
          next.weekNumbers = null;
          next.nameDays = null;
          next.eveDays = {};
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

/** The eve choices the calendar is drawn under: the stored map, filtered to
 *  the ids the chosen pack actually has. Settings are a plain JSON blob in
 *  localStorage, so this is the one door the views read them through. */
export function eveChoices(
  settings: Pick<AppSettings, "localeId" | "eveDays">,
): EveChoices {
  return coerceEveChoices(settings.eveDays, getLocale(settings.localeId).eves);
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

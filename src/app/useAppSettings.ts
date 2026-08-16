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
import { DEFAULT_LOCALE_ID, getLocale } from "./locale/index.ts";
import type { BackendId } from "./storage/backends.ts";

export type ViewMode = "month" | "week" | "list";
export type ListRowMode = "fixed" | "dynamic";

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
] as const;

export type LookSettings = Pick<AppSettings, (typeof LOOK_KEYS)[number]>;

export function pickLook(settings: AppSettings): LookSettings {
  return {
    localeId: settings.localeId,
    weekNumbers: settings.weekNumbers,
    nameDays: settings.nameDays,
    listRows: settings.listRows,
    textSize: settings.textSize,
  };
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

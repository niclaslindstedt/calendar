// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's own (non-theme) settings: country calendar, view mode, display
// toggles, storage choice, developer mode. The framework hook owns the
// persistence mechanics (safe parse, merging a stored partial over the
// defaults, write-through); this store owns the key and the shape. The UI
// *language* is owned by the framework i18n runtime (see `i18n/index.ts`),
// and the theme by the appearance store — neither lives here.

import { useCallback } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";

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
  backend: "browser",
  devMode: false,
  captureLogs: false,
  demoData: false,
};

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
        // Switching country re-seats the display toggles on the new pack's
        // defaults — the wall-calendar conventions travel with the country.
        if (key === "localeId") {
          next.weekNumbers = null;
          next.nameDays = null;
        }
        // Leaving developer mode also leaves demo data.
        if (key === "devMode" && value === false) next.demoData = false;
        return next;
      }),
    [setSettings],
  );

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);

  return { settings, update, reset };
}

/** The effective display toggles: the stored override, or the pack default. */
export function effectiveToggles(settings: AppSettings): {
  weekNumbers: boolean;
  nameDays: boolean;
} {
  const pack = getLocale(settings.localeId);
  return {
    weekNumbers: settings.weekNumbers ?? pack.showWeekNumbersDefault,
    nameDays: settings.nameDays ?? pack.showNameDaysDefault,
  };
}

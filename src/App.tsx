// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app shell: top menu (no sidebar), the active view, the settings
// dialog, and the PWA update prompt. State lives in small app-owned stores
// (`useAppSettings`, `useCalendarStore`); the framework supplies the theme
// engine, the update state machine, and the UI kit.

import { useEffect, useState } from "react";

import {
  addDays,
  addMonths,
  dayKeyOf,
  parseDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";
import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";
import { UpdateToast, usePwaUpdate } from "@niclaslindstedt/oss-framework/pwa";
import {
  DEFAULT_THEME_APPEARANCE,
  useApplyTheme,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";

import { DayListView } from "./app/DayListView.tsx";
import { HolidaysView, type HolidayMode } from "./app/HolidaysView.tsx";
import { MonthGridView } from "./app/MonthGridView.tsx";
import {
  SettingsModal,
  type SettingsDraft,
} from "./app/settings/SettingsModal.tsx";
import { SwipeDeck, type DeckNav } from "./app/SwipeDeck.tsx";
import { TopBar } from "./app/TopBar.tsx";
import { WeekPlannerView } from "./app/WeekPlannerView.tsx";
import { useT } from "./app/i18n/index.ts";
import { getLocale } from "./app/locale/index.ts";
import { logStore } from "./app/log.ts";
import { cacheIdForBase } from "./app/pwa.ts";
import {
  completeOauthOnBoot,
  connectDropbox,
  connectFolder,
  connectGdrive,
  disconnectDropbox,
  disconnectFolder,
  disconnectGdrive,
  loadFolderConnected,
  writeActiveBackendId,
  type BackendId,
} from "./app/storage/backends.ts";
import { useCalendarStore } from "./app/useCalendarStore.ts";
import {
  clampVacationDays,
  effectiveToggles,
  monthCellLayout,
  useAppSettings,
} from "./app/useAppSettings.ts";
import { status } from "./output.ts";

// The default look follows the device: `"system"` tracks the OS light/dark
// preference, so a phone in dark mode opens a dark calendar. Users pin a
// concrete theme in Settings → Appearance, persisted per device.
const DEFAULT_APPEARANCE: ThemeAppearance = {
  ...DEFAULT_THEME_APPEARANCE,
  theme: "system",
};

export function App() {
  const t = useT();
  const { settings, update, commitLook } = useAppSettings();
  const [appearance, setAppearance] = useLocalStorageState<ThemeAppearance>(
    "calendar:appearance",
    DEFAULT_APPEARANCE,
  );
  // The open Settings dialog streams its unsaved draft here, so the calendar
  // behind it previews the look live. Cancel simply drops the draft: the
  // preview clears and the persisted look reasserts itself.
  const [preview, setPreview] = useState<SettingsDraft | null>(null);
  const live = preview ? { ...settings, ...preview.look } : settings;
  useApplyTheme(preview?.appearance ?? appearance);

  // The in-app log records only in developer mode; the capture toggle
  // additionally mirrors it to localStorage.
  useEffect(() => {
    logStore.setEnabled(settings.devMode);
  }, [settings.devMode]);
  useEffect(() => {
    logStore.setCaptureEnabled(settings.captureLogs);
  }, [settings.captureLogs]);

  // The navigation anchor: the month (and, in week view, the week) on
  // display. Today on boot.
  const [anchor, setAnchor] = useState<DayKey>(() => dayKeyOf(new Date()));
  const today = dayKeyOf(new Date());
  const parts = parseDayKey(anchor) ?? { year: 2026, month: 1, day: 1 };

  // The day being edited, if any (shared across views).
  const [editingDay, setEditingDay] = useState<DayKey | null>(null);

  // The holidays screen, when open: the year it shows, and which of its two
  // modes. It is not one of the three top-bar views — you arrive by tapping a
  // holiday's name in a day cell, and any top-bar action leaves again.
  const [holidayYear, setHolidayYear] = useState<number | null>(null);
  const [holidayMode, setHolidayMode] = useState<HolidayMode>("list");

  const store = useCalendarStore(settings.backend, settings.demoData);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Finish an inbound Dropbox OAuth redirect, then activate the backend.
  const [folderConnected, setFolderConnected] = useState(false);
  useEffect(() => {
    void loadFolderConnected().then(setFolderConnected);
    void completeOauthOnBoot().then((connected) => {
      if (connected) {
        writeActiveBackendId(connected);
        update("backend", connected);
        status(`Connected ${connected}`);
      }
    });
    // Boot-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pwa = usePwaUpdate({
    base: import.meta.env.BASE_URL,
    cacheId: cacheIdForBase(import.meta.env.BASE_URL),
    enabled: !import.meta.env.DEV,
  });

  const setActiveBackend = (id: BackendId) => {
    if (id === "demo") {
      update("demoData", true);
      return;
    }
    writeActiveBackendId(id);
    update("backend", id);
  };

  const step = (direction: 1 | -1) => {
    setEditingDay(null);
    setAnchor((prev) =>
      settings.view === "week"
        ? addDays(prev, 7 * direction)
        : addMonths(prev, direction),
    );
  };

  /** Leave the holidays screen and go back to the calendar. */
  const closeHolidays = () => setHolidayYear(null);

  /** Open it on the year the tapped holiday belongs to. */
  const openHolidays = (year: number) => {
    setEditingDay(null);
    setHolidayYear(year);
  };

  const pack = getLocale(live.localeId);
  const toggles = effectiveToggles(live);
  // Every view pages horizontally, so each renders three periods at a time:
  // the one on screen and the two waiting either side of it. The month and
  // week views fill exactly one screen; the day list scrolls inside its own
  // pane, which the deck is told about so a vertical drag still scrolls it.
  const paged = holidayYear === null;

  /** The anchor `rel` periods away — a week in week view, a month otherwise. */
  const shiftAnchor = (rel: -1 | 0 | 1): DayKey =>
    rel === 0
      ? anchor
      : settings.view === "week"
        ? addDays(anchor, 7 * rel)
        : addMonths(anchor, rel);

  const renderPeriod = (rel: -1 | 0 | 1, nav: DeckNav) => {
    const at = shiftAnchor(rel);
    const on = parseDayKey(at) ?? parts;
    // Only the pane on screen takes input: a tap that lands on a parked
    // neighbour mid-swipe must not open an editor in an off-screen month.
    const interactive = rel === 0;
    const editing = interactive ? editingDay : null;
    const onEditDay = interactive ? setEditingDay : () => {};
    const onCommit = interactive ? store.setEntry : () => {};
    const onOpenHolidays = () => openHolidays(on.year);
    if (settings.view === "list") {
      return (
        <DayListView
          year={on.year}
          month={on.month}
          today={today}
          pack={pack}
          showWeekNumbers={toggles.weekNumbers}
          showNameDays={toggles.nameDays}
          rowMode={live.listRows}
          textSize={live.textSize}
          doc={store.doc}
          editingDay={editing}
          onEditDay={onEditDay}
          onCommit={onCommit}
          onPrevious={nav.previous}
          onNext={nav.next}
          onOpenHolidays={onOpenHolidays}
        />
      );
    }
    return settings.view === "week" ? (
      <WeekPlannerView
        anchor={at}
        today={today}
        pack={pack}
        showNameDays={toggles.nameDays}
        textSize={live.textSize}
        doc={store.doc}
        editingDay={editing}
        onEditDay={onEditDay}
        onCommit={onCommit}
        onPrevious={nav.previous}
        onNext={nav.next}
        onOpenHolidays={onOpenHolidays}
      />
    ) : (
      <MonthGridView
        year={on.year}
        month={on.month}
        today={today}
        pack={pack}
        showWeekNumbers={toggles.weekNumbers}
        showNameDays={toggles.nameDays}
        layout={monthCellLayout(live)}
        textSize={live.textSize}
        doc={store.doc}
        editingDay={editing}
        onEditDay={onEditDay}
        onCommit={onCommit}
        onPrevious={nav.previous}
        onNext={nav.next}
        onOpenHolidays={onOpenHolidays}
      />
    );
  };

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-page-bg text-fg">
      <TopBar
        view={settings.view}
        onViewChange={(view) => {
          setEditingDay(null);
          closeHolidays();
          update("view", view);
        }}
        onToday={() => {
          setEditingDay(null);
          closeHolidays();
          setAnchor(dayKeyOf(new Date()));
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Every screen is a deck, and a deck owns its own scrolling: the month
          and week panes fill the screen exactly, the day list and the holidays
          list scroll inside their pane. So the shell itself never scrolls. */}
      <main className="min-h-0 flex-1 overflow-hidden">
        {holidayYear !== null && (
          // The holidays screen brings its own deck: its header stays put and
          // only the year's list pages.
          <HolidaysView
            year={holidayYear}
            pack={pack}
            mode={holidayMode}
            onModeChange={setHolidayMode}
            vacationDays={clampVacationDays(live.vacationDays)}
            onBack={closeHolidays}
            onYearChange={setHolidayYear}
          />
        )}
        {paged && (
          <SwipeDeck
            // Remounting on a view switch drops any half-finished gesture and
            // re-centres, rather than carrying a month's drag into a week.
            key={settings.view}
            itemKey={anchor}
            scrolls={settings.view === "list"}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            renderItem={renderPeriod}
          />
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={update}
        commitLook={commitLook}
        appearance={appearance}
        defaultAppearance={DEFAULT_APPEARANCE}
        onAppearanceChange={setAppearance}
        onPreview={setPreview}
        saveState={store.saveState}
        effectiveBackend={store.effectiveBackend}
        storage={{
          setActive: setActiveBackend,
          folderConnected,
          connectFolder: () =>
            void connectFolder().then((ok) => {
              if (ok) {
                setFolderConnected(true);
                setActiveBackend("folder");
              }
            }),
          connectDropbox: () => void connectDropbox(),
          connectGdrive: () =>
            void connectGdrive().then(() => setActiveBackend("gdrive")),
          disconnect: (id) => {
            if (id === "dropbox") disconnectDropbox();
            if (id === "gdrive") disconnectGdrive();
            if (id === "folder") {
              void disconnectFolder();
              setFolderConnected(false);
            }
            if (store.effectiveBackend === id) setActiveBackend("browser");
          },
        }}
        updateChecking={pwa.checking}
        updateAvailable={pwa.needRefresh}
        onCheckUpdate={pwa.checkForUpdate}
      />

      <UpdateToast
        needRefresh={pwa.needRefresh}
        incomingVersion={pwa.incomingVersion}
        onReload={pwa.reload}
        onDismiss={pwa.dismiss}
        labels={{
          ready: t("update.ready"),
          action: t("update.action"),
          dismiss: t("update.dismiss"),
        }}
      />
    </div>
  );
}

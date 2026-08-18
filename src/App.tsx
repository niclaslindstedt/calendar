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
  toDayKey,
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
import { calFontVars, loadCalFonts } from "./app/fonts.ts";
import { HolidaysView, type HolidayMode } from "./app/HolidaysView.tsx";
import { MonthGridView } from "./app/MonthGridView.tsx";
import { NameDaySearch } from "./app/NameDaySearch.tsx";
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
import { pinShell } from "./app/shellScroll.ts";
import { syncThemeColor, watchSystemThemeColor } from "./app/themeColor.ts";
import {
  calFonts,
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
  const liveAppearance = preview?.appearance ?? appearance;
  useApplyTheme(liveAppearance);

  // The calendar's four faces, projected onto `<html>` as CSS variables (the
  // `.cal-font-*` classes in `src/styles.css` read them). On `<html>` rather
  // than on the shell below so the settings dialog's cell preview — which
  // renders through the same `MonthCellFrame` — is painted in the faces it is
  // previewing, wherever the modal ends up in the tree.
  const fonts = calFonts(live);
  useEffect(() => {
    const vars = calFontVars(fonts);
    const root = document.documentElement;
    for (const [name, stack] of Object.entries(vars)) {
      root.style.setProperty(name, stack);
    }
    loadCalFonts(fonts);
    // Compared by value: the four ids are what matter, not the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonts.day, fonts.holidays, fonts.nameDays, fonts.entry]);

  // Keep `theme-color` on the resolved page background. The installed iOS app
  // paints its own status-bar band (the body background in `src/styles.css`
  // covers that), but Android's task switcher and Chrome's toolbar read this
  // meta — and with a dozen presets plus "follow the device" a static value in
  // the HTML shell is wrong for most of them.
  useEffect(() => {
    syncThemeColor();
  }, [liveAppearance]);
  // …and when the OS preference flips under the "system" theme, which moves
  // the background without moving any state of ours.
  useEffect(() => watchSystemThemeColor(), []);

  // Put the shell back if iOS's keyboard handling leaves it riding up under
  // the status bar (see `shellScroll.ts`).
  useEffect(() => pinShell(), []);

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

  // The name-day screen, when open: the name that was tapped (where its list
  // opens) and the live query, which is empty until you type — an empty field
  // is the alphabet, a filled one is an answer. Unlike the holidays screen it
  // is a dialog over the calendar rather than a destination: you are asking
  // about a name, not leaving the month.
  const [nameSeed, setNameSeed] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");

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
    setNameSeed(null);
    setHolidayYear(year);
  };

  /** Leave the name-day search. */
  const closeNames = () => setNameSeed(null);

  /** Open it on the name that was tapped — as a list, not a search. */
  const openNames = (name: string) => {
    setEditingDay(null);
    setNameQuery("");
    setNameSeed(name);
  };

  /** A picked name day: go to it in the year on display, and leave the
   *  search. The almanac has no year of its own, so the day the calendar was
   *  already showing is the only sensible one to land in. */
  const goToNameDay = (month: number, day: number) => {
    setNameSeed(null);
    setAnchor(toDayKey({ year: parts.year, month, day }));
  };

  /** Settings → General → Vacation offers the way in that the calendar hides:
   *  the planner is otherwise only reachable by tapping a holiday's name, and
   *  the section that sets the allowance is where you go looking for what
   *  spends it. It opens on the year on display, as a tapped holiday does. */
  const openPlanner = () => {
    setSettingsOpen(false);
    setHolidayMode("planner");
    openHolidays(parts.year);
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
    const onOpenNames = interactive ? openNames : () => {};
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
          onOpenNames={onOpenNames}
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
        onOpenNames={onOpenNames}
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
        onOpenNames={onOpenNames}
      />
    );
  };

  return (
    // `h-full` — not `100svh`: the shell fills `html`/`body`, which
    // `src/styles.css` pins to the viewport (and, in the installed iOS app,
    // to `100vh` so the page reaches under the status bar instead of being
    // letterboxed with a pale band above the top menu).
    <div className="flex h-full flex-col overflow-hidden bg-page-bg text-fg">
      <TopBar
        view={settings.view}
        onViewChange={(view) => {
          setEditingDay(null);
          closeHolidays();
          closeNames();
          update("view", view);
        }}
        onToday={() => {
          setEditingDay(null);
          closeHolidays();
          closeNames();
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

      {/* Tapping one of a day's names opens the almanac at that name; the
          answer is a date in the calendar behind, so this is a dialog rather
          than a screen of its own. */}
      <NameDaySearch
        open={nameSeed !== null}
        pack={pack}
        seed={nameSeed ?? ""}
        query={nameQuery}
        onQueryChange={setNameQuery}
        onClose={closeNames}
        onPick={goToNameDay}
      />

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
        onOpenPlanner={openPlanner}
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

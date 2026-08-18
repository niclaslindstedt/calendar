// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app shell: top menu (no sidebar), the active view, the settings
// dialog, and the PWA update prompt. State lives in small app-owned stores
// (`useAppSettings`, `useCalendarStore`); the framework supplies the theme
// engine, the update state machine, and the UI kit.

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addDays,
  addMonths,
  dayKeyOf,
  parseDayKey,
  toDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";
import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";
import {
  NamespacesModal,
  applyFaviconHref,
  namespaceFaviconHref,
} from "@niclaslindstedt/oss-framework/namespaces";
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
import { getLocale, withEveChoices } from "./app/locale/index.ts";
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
import { useNamespaces } from "./app/useNamespaces.ts";
import { pinShell } from "./app/shellScroll.ts";
import { syncThemeColor, watchSystemThemeColor } from "./app/themeColor.ts";
import {
  calFonts,
  clampVacationDays,
  effectiveToggles,
  eveChoices,
  monthCellLayout,
  pastMarkOf,
  textScales,
  useAppSettings,
} from "./app/useAppSettings.ts";
import { textScaleVars } from "./app/textSize.ts";
import { status } from "./output.ts";

// The default look follows the device: `"system"` tracks the OS light/dark
// preference, so a phone in dark mode opens a dark calendar. Users pin a
// concrete theme in Settings → Appearance, persisted per device.
const DEFAULT_APPEARANCE: ThemeAppearance = {
  ...DEFAULT_THEME_APPEARANCE,
  theme: "system",
};

/** What a parked pane's handlers are. Hoisted so the two neighbours the deck
 *  keeps off screen are handed the *same* do-nothing function every render —
 *  a fresh `() => {}` would defeat the memoization the views rely on. */
const NOOP = () => {};

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

  // …and the sizes those pieces are set at, on the same element and for the
  // same reason: the `.cal-size-*` rules multiply each site's base size by
  // them, and the settings dialog's sample cell has to be painted at the size
  // it is previewing wherever the modal sits in the tree.
  // Memoized, like the layout and the toggles below: these objects are props
  // of the memoized views, so rebuilding one on every render would re-render
  // three periods' worth of day cells for nothing.
  const scales = useMemo(
    () => textScales(live),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live.sizeDay, live.sizeHolidays, live.sizeNameDays, live.sizeWeek],
  );
  useEffect(() => {
    const root = document.documentElement;
    for (const [name, scale] of Object.entries(textScaleVars(scales))) {
      root.style.setProperty(name, scale);
    }
    // Compared by value, like the faces above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scales.day, scales.holidays, scales.nameDays, scales.week]);

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

  // Namespaces: separate calendars in the same app, each its own document in
  // the same backend. The registry and the active pointer live in the app
  // (`useNamespaces`, the framework's "store stays in the app" seam); the
  // document store keys off the active slug, so switching swaps the notes
  // under the same month.
  const namespaces = useNamespaces(settings.backend);
  const store = useCalendarStore(
    settings.backend,
    settings.demoData,
    namespaces.activeSlug,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [namespacesOpen, setNamespacesOpen] = useState(false);

  // Re-badge the browser tab with the active namespace's glyph, so a pinned
  // work calendar and a personal one are told apart in the tab strip. A
  // namespace that picked no glyph keeps the app's own mark.
  const activeNamespace = namespaces.activeNamespace;
  useEffect(() => {
    applyFaviconHref(
      namespaceFaviconHref(
        activeNamespace,
        `${import.meta.env.BASE_URL}icons/icon.svg`,
      ),
    );
  }, [activeNamespace]);

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

  /** Open it on the year the tapped holiday belongs to. Stable, because every
   *  day cell in three periods holds a reference to it. */
  const openHolidays = useCallback((year: number) => {
    setEditingDay(null);
    setNameSeed(null);
    setHolidayYear(year);
  }, []);

  /** Leave the name-day search. */
  const closeNames = () => setNameSeed(null);

  /** Open it on the name that was tapped — as a list, not a search. Stable,
   *  for the same reason as {@link openHolidays}. */
  const openNames = useCallback((name: string) => {
    setEditingDay(null);
    setNameQuery("");
    setNameSeed(name);
  }, []);

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

  // The country pack as this reader's workplace sees it: the eves they have
  // told us they work are ordinary days again, and the ones they do not are
  // days off the vacation planner stops offering to spend an allowance on.
  // Resolved once, here, so every view and the planner agree on the year.
  // `withEveChoices` caches its derived packs, so this is a stable reference
  // for as long as the choices hold — which is what the memoized views need.
  const pack = withEveChoices(getLocale(live.localeId), eveChoices(live));
  const toggles = useMemo(
    () => effectiveToggles(live),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live.localeId, live.weekNumbers, live.nameDays],
  );
  const cellLayout = useMemo(
    () => monthCellLayout(live),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      live.monthDayCorner,
      live.monthNameDayCorner,
      live.monthHolidayCorner,
      live.monthNote,
    ],
  );
  // Crossing off the days that have gone — off unless it has been turned on
  // (Settings → Calendar → Passed days). Resolved once here, from the live
  // look, so the dialog previews the stroke as it is chosen.
  const pastMark = useMemo(
    () => pastMarkOf(live),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live.pastMark, live.pastMarkScope],
  );
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
    const onEditDay = interactive ? setEditingDay : NOOP;
    const onCommit = interactive ? store.setEntry : NOOP;
    const onOpenNames = interactive ? openNames : NOOP;
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
          pastMark={pastMark}
          textSize={live.textSize}
          doc={store.doc}
          editingDay={editing}
          onEditDay={onEditDay}
          onCommit={onCommit}
          onPrevious={nav.previous}
          onNext={nav.next}
          onOpenHolidays={openHolidays}
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
        pastMark={pastMark}
        textSize={live.textSize}
        doc={store.doc}
        editingDay={editing}
        onEditDay={onEditDay}
        onCommit={onCommit}
        onPrevious={nav.previous}
        onNext={nav.next}
        onOpenHolidays={openHolidays}
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
        layout={cellLayout}
        pastMark={pastMark}
        textSize={live.textSize}
        scales={scales}
        doc={store.doc}
        editingDay={editing}
        onEditDay={onEditDay}
        onCommit={onCommit}
        onPrevious={nav.previous}
        onNext={nav.next}
        onOpenHolidays={openHolidays}
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
        // Pressing the view you are already in is how you get back to today —
        // the switcher's own "you are here" slot doubles as the way home,
        // which is what frees the left-hand button for the namespace menu.
        onViewChange={(view) => {
          setEditingDay(null);
          closeHolidays();
          closeNames();
          if (view === settings.view) setAnchor(dayKeyOf(new Date()));
          else update("view", view);
        }}
        namespaces={namespaces.list}
        activeNamespace={namespaces.activeSlug}
        onSwitchNamespace={(slug) => {
          setEditingDay(null);
          closeHolidays();
          closeNames();
          namespaces.switchTo(slug);
        }}
        onManageNamespaces={() => setNamespacesOpen(true)}
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

      {/* Create / switch / rename / restyle / delete a namespace. The app owns
          the registry (`useNamespaces`); the framework owns the dialog. */}
      <NamespacesModal
        open={namespacesOpen}
        onClose={() => setNamespacesOpen(false)}
        namespaces={namespaces.list}
        activeNamespace={namespaces.activeSlug}
        onSwitch={namespaces.switchTo}
        onCreate={namespaces.create}
        onRename={namespaces.rename}
        onSetAppearance={namespaces.setAppearance}
        onRemove={namespaces.remove}
        labels={{
          heading: t("namespaces.heading"),
          blurb: t("namespaces.blurb"),
          newAction: t("namespaces.newAction"),
          namePlaceholder: t("namespaces.namePlaceholder"),
          nameLabel: t("namespaces.nameLabel"),
          create: t("namespaces.create"),
          nameRequired: t("namespaces.nameRequired"),
          colorLabel: t("namespaces.colorLabel"),
          glyphLabel: t("namespaces.glyphLabel"),
          glyphNone: t("namespaces.glyphNone"),
          save: t("namespaces.save"),
          cancel: t("namespaces.cancel"),
          renameAction: t("namespaces.renameAction"),
          deleteAction: t("namespaces.deleteAction"),
          delete: t("namespaces.delete"),
          deleteConfirm: (name) => t("namespaces.deleteConfirm", { name }),
          switchTo: (name) => t("namespaces.switchTo", { name }),
          defaultBadge: t("namespaces.defaultBadge"),
          close: t("namespaces.close"),
        }}
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

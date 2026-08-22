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
  NamespacesModal as CalendarsModal,
  applyFaviconHref,
  namespaceFaviconHref as calendarFaviconHref,
} from "@niclaslindstedt/oss-framework/namespaces";
import { UpdateToast, usePwaUpdate } from "@niclaslindstedt/oss-framework/pwa";
import {
  DEFAULT_THEME_APPEARANCE,
  FAMILY_DEFAULT_THEME,
  useApplyTheme,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";

import { DayListView } from "./app/DayListView.tsx";
import { DayZoom } from "./app/DayZoom.tsx";
import { loadCalFonts } from "./app/fonts.ts";
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
import type { ListArrival } from "./app/listHome.ts";
import { getLocale, withEveChoices } from "./app/locale/index.ts";
import { showsArrows, swipeAxis } from "./app/navSwipe.ts";
import { logStore } from "./app/log.ts";
import { cacheIdForBase } from "./app/pwa.ts";
import { applyRoomVars } from "./app/roomScale.ts";
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
import { useBackup } from "./app/useBackup.ts";
import { useReset } from "./app/useReset.ts";
import { useCalendarStore } from "./app/useCalendarStore.ts";
import { useCalendars } from "./app/useCalendars.ts";
import { pinShell } from "./app/shellScroll.ts";
import { syncThemeColor, watchSystemThemeColor } from "./app/themeColor.ts";
import {
  DEFAULT_LOOK,
  clampVacationDays,
  effectiveToggles,
  eveChoices,
  headerInkOf,
  monthCellLayout,
  pastMarkOf,
  stripLayoutOf,
  stripNoteFlows,
  swipeDirectionFor,
  useAppSettings,
  weekDateSizeFor,
  weekFormatFor,
  weekRowsOf,
} from "./app/useAppSettings.ts";
import {
  SCOPE_OF_VIEW,
  facesOf,
  styleVars,
  stylesSignature,
} from "./app/viewStyle.ts";
import { status } from "./output.ts";

// The default look is the printed one: paper is light, so the calendar opens
// light whatever the device is set to. "Follow device" is one tap away in
// Settings → Appearance (with the dark palettes behind it), persisted per
// device.
const DEFAULT_APPEARANCE: ThemeAppearance = {
  ...DEFAULT_THEME_APPEARANCE,
  theme: FAMILY_DEFAULT_THEME.light,
};

// What an untouched install reads like — the yardstick an import measures a
// file's settings against. A device still sitting on both of these has made no
// choice to defend, so it adopts the file's rather than asking (see
// `storage/backup.ts`). Hoisted so the identity is stable across renders.
const BACKUP_DEFAULTS = {
  look: DEFAULT_LOOK,
  appearance: DEFAULT_APPEARANCE,
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

  // How each piece of a day is set, in each view, projected onto `<html>` as
  // CSS variables — one prefixed pair per scope, which the `.cal-scope-*`
  // classes in `src/styles.css` map down onto the names the `.cal-font-*` /
  // `.cal-size-*` rules paint with (see `viewStyle.ts`).
  //
  // On `<html>` rather than on the shell below so the settings dialog's
  // samples — which render through the same `MonthCellFrame` and the same
  // strip margins the views use — are painted at the settings they are
  // previewing, wherever the modal ends up in the tree.
  //
  // Keyed on the signature rather than the object: the draft is rebuilt on
  // every edit and the views these feed are memoized, so comparing by value
  // is what keeps an unrelated setting from re-rendering three periods' worth
  // of day cells.
  const styles = live.styles;
  const signature = stylesSignature(styles);
  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(styleVars(styles))) {
      root.style.setProperty(name, value);
    }
    loadCalFonts(facesOf(styles));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Keep the room factor current: every printed size is multiplied by it, and
  // it is a function of the window's size, so a rotation or a resized desktop
  // window is a different answer. The safe areas need no such listener — they
  // are the stylesheet's own arithmetic (`src/app/safeArea.ts` explains why),
  // and `env()` re-resolves on its own.
  useEffect(() => {
    const measure = () => applyRoomVars();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

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
  // How many times the reader has asked to be put back at today. Going home
  // is a press, not a value: the anchor can already *be* today's day and the
  // view still not be showing it — the day list keeps the month it is on
  // while you scroll away down it — and a `setAnchor` that lands on the value
  // it already held puts nothing back. So the press is counted, and the deck
  // is keyed on the count as well as the anchor.
  const [homings, setHomings] = useState(0);
  // How the calendar got to the period it is on: opened on it, or paged
  // forward or back to it. Only the day list reads it, and only to decide
  // which end of a month it opens at (`listHome.ts`) — the other two views
  // fill a screen, so there is no "where in the period" for them to land at.
  const [arrival, setArrival] = useState<ListArrival>("open");
  const today = dayKeyOf(new Date());
  const parts = parseDayKey(anchor) ?? { year: 2026, month: 1, day: 1 };

  // The day being edited, if any (shared across views).
  const [editingDay, setEditingDay] = useState<DayKey | null>(null);

  // The day being held up close, if any: what a long press on a day opens
  // (`DayZoom`). One at a time, and never at the same time as the in-cell
  // editor — the zoom carries an editor of its own.
  const [zoomDay, setZoomDay] = useState<DayKey | null>(null);

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

  // Calendars: separate calendars in the same app, each its own document in
  // the same backend. The registry and the active pointer live in the app
  // (`useCalendars`, the framework's "store stays in the app" seam); the
  // document store keys off the active slug, so switching swaps the notes
  // under the same month.
  const calendars = useCalendars(settings.backend);
  const store = useCalendarStore(
    settings.backend,
    settings.demoData,
    calendars.activeSlug,
  );
  // Import / export, over the same backend the store is saving through: a
  // backup is a copy of what is actually stored, not of what was asked for.
  const backup = useBackup({
    settings,
    appearance,
    defaults: BACKUP_DEFAULTS,
    backend: store.effectiveBackend,
    calendars,
    store,
    commitLook,
    setAppearance,
  });
  // Emptying a calendar, over the same backend: the other thing you can do to
  // the notes as a whole once you have a copy of them.
  const reset = useReset({
    backend: store.effectiveBackend,
    calendars,
    store,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarsOpen, setCalendarsOpen] = useState(false);

  // Re-badge the browser tab with the active calendar's glyph, so a pinned
  // work calendar and a personal one are told apart in the tab strip. A
  // calendar that picked no glyph keeps the app's own mark.
  const activeCalendar = calendars.activeCalendar;
  useEffect(() => {
    applyFaviconHref(
      calendarFaviconHref(
        activeCalendar,
        `${import.meta.env.BASE_URL}icons/icon.svg`,
      ),
    );
  }, [activeCalendar]);

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
    setArrival(direction === 1 ? "forward" : "back");
    setAnchor((prev) =>
      settings.view === "week"
        ? addDays(prev, 7 * direction)
        : addMonths(prev, direction),
    );
  };

  /** Put the calendar back at today: the current period, from its top. */
  const goToday = () => {
    setArrival("open");
    setAnchor(dayKeyOf(new Date()));
    setHomings((n) => n + 1);
  };

  /** Leave the holidays screen and go back to the calendar. */
  const closeHolidays = () => setHolidayYear(null);

  /** Open it on the year the tapped holiday belongs to. Stable, because every
   *  day cell in three periods holds a reference to it. */
  const openHolidays = useCallback((year: number) => {
    setEditingDay(null);
    setNameSeed(null);
    setZoomDay(null);
    setHolidayYear(year);
  }, []);

  /** Hold a day up close. Stable, for the same reason: every day of every
   *  period the deck holds carries a reference to it. */
  const openZoom = useCallback((day: DayKey) => {
    setEditingDay(null);
    setZoomDay(day);
  }, []);

  /** Leave the name-day search. */
  const closeNames = () => setNameSeed(null);

  /** Open it on the name that was tapped — as a list, not a search. Stable,
   *  for the same reason as {@link openHolidays}. */
  const openNames = useCallback((name: string) => {
    setEditingDay(null);
    setZoomDay(null);
    setNameQuery("");
    setNameSeed(name);
  }, []);

  /** A picked name day: go to it in the year on display, and leave the
   *  search. The almanac has no year of its own, so the day the calendar was
   *  already showing is the only sensible one to land in. */
  const goToNameDay = (month: number, day: number) => {
    setNameSeed(null);
    setArrival("open");
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
  // The strip row's arrangement, shared by the week planner and the day list
  // — they print the same row at two heights (`stripRow.tsx`).
  const stripLayout = useMemo(
    () => stripLayoutOf(live),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      live.stripDaySlot,
      live.stripNameDaySlot,
      live.stripHolidaySlot,
      live.stripWeekSlot,
    ],
  );
  // Whether a note in one of those rows flows under the margins or keeps the
  // column between them — off the live look, so the dialog previews the row
  // the reader is choosing rather than the one they saved.
  const noteFlow = stripNoteFlows(live);
  // Crossing off the days that have gone — off unless it has been turned on
  // (Settings → Calendar → Passed days). Resolved once here, from the live
  // look, so the dialog previews the stroke as it is chosen.
  const pastMark = useMemo(
    () => pastMarkOf(live),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live.pastMark, live.pastMarkScope],
  );
  // The heading's colour band, resolved once from the live look — so the
  // dialog previews the band, and the week numbers printed in the same ink,
  // as the colour is picked. `null` is the plain heading.
  const headerInk = headerInkOf(live);
  // How the week planner sizes its rows. Grown rows make that view a scroller,
  // which the deck has to be told about (`scrolls` below) so a vertical drag
  // is left to the pane instead of being taken as a page turn.
  const weekRows = weekRowsOf(live);
  const weekFormat = weekFormatFor(live);
  const weekDateSize = weekDateSizeFor(live);
  // Which way a swipe turns the page, and — the same answer read again —
  // whether the heading still has arrows to point with. Off the live look, so
  // the dialog's preview shows both as they are chosen.
  const swipe = swipeDirectionFor(live);
  const arrows = showsArrows(swipe);
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
    const onZoomDay = interactive ? openZoom : NOOP;
    if (settings.view === "list") {
      return (
        <DayListView
          year={on.year}
          month={on.month}
          today={today}
          pack={pack}
          showWeekNumbers={toggles.weekNumbers}
          showNameDays={toggles.nameDays}
          showDayOfYear={live.weekDayOfYear}
          layout={stripLayout}
          noteFlow={noteFlow}
          rowMode={live.listRows}
          weekFormat={weekFormat}
          headerInk={headerInk}
          arrows={arrows}
          arrival={arrival}
          pastMark={pastMark}
          textSize={styles.strip.entry.size}
          doc={store.doc}
          editingDay={editing}
          onEditDay={onEditDay}
          onCommit={onCommit}
          onPrevious={nav.previous}
          onNext={nav.next}
          onOpenHolidays={openHolidays}
          onOpenNames={onOpenNames}
          onZoomDay={onZoomDay}
        />
      );
    }
    return settings.view === "week" ? (
      <WeekPlannerView
        anchor={at}
        today={today}
        pack={pack}
        showWeekNumbers={toggles.weekNumbers}
        showNameDays={toggles.nameDays}
        showDayOfYear={live.weekDayOfYear}
        layout={stripLayout}
        noteFlow={noteFlow}
        rowMode={weekRows}
        weekFormat={weekFormat}
        dateSize={weekDateSize}
        headerInk={headerInk}
        arrows={arrows}
        pastMark={pastMark}
        textSize={styles.strip.entry.size}
        doc={store.doc}
        editingDay={editing}
        onEditDay={onEditDay}
        onCommit={onCommit}
        onPrevious={nav.previous}
        onNext={nav.next}
        onOpenHolidays={openHolidays}
        onOpenNames={onOpenNames}
        onZoomDay={onZoomDay}
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
        headerInk={headerInk}
        arrows={arrows}
        pastMark={pastMark}
        textSize={styles.month.entry.size}
        nameDayScale={styles.month.nameDays.size}
        holidayScale={styles.month.holidays.size}
        doc={store.doc}
        editingDay={editing}
        onEditDay={onEditDay}
        onCommit={onCommit}
        onPrevious={nav.previous}
        onNext={nav.next}
        onOpenHolidays={openHolidays}
        onOpenNames={onOpenNames}
        onZoomDay={onZoomDay}
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
        // Every press of the switcher lands on today — the switcher's own "you
        // are here" slot doubles as the way home, which is what frees the
        // left-hand button for the calendar menu. Pressing a *different* view
        // goes to today as well: the three views are three readings of the
        // same calendar rather than three places you keep a position in, and
        // carrying a browsed-away period across the switch left you looking at
        // a week in March with no idea it was not this one.
        onViewChange={(view) => {
          setEditingDay(null);
          closeHolidays();
          closeNames();
          if (view !== settings.view) update("view", view);
          goToday();
        }}
        calendars={calendars.list}
        activeCalendar={calendars.activeSlug}
        onSwitchCalendar={(slug) => {
          setEditingDay(null);
          closeHolidays();
          closeNames();
          calendars.switchTo(slug);
        }}
        onManageCalendars={() => setCalendarsOpen(true)}
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
            // re-centres, rather than carrying a month's drag into a week. The
            // paging axis is in the key for the same reason: the track's
            // resting transform is written to the DOM directly, so turning the
            // deck on its side is a fresh deck rather than a re-styled one.
            key={`${settings.view}:${swipe}`}
            itemKey={`${anchor}@${homings}`}
            // Left/right by default; up/down for a reader who would rather
            // scroll a calendar than flick through it, in which case the day
            // list simply carries on scrolling into the month above or below
            // (`navSwipe.ts`, and `atScrollEnd` in the deck).
            axis={swipeAxis(swipe)}
            scrolls={
              settings.view === "list" ||
              (settings.view === "week" && weekRows === "dynamic")
            }
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            renderItem={renderPeriod}
          />
        )}
      </main>

      {/* A day held up close — what a long press on any day opens. The note
          it prints is the same note the calendar behind it shows, so an edit
          made here lands in the cell as it is typed. */}
      <DayZoom
        day={zoomDay}
        view={settings.view}
        pack={pack}
        showWeekNumbers={toggles.weekNumbers}
        showNameDays={toggles.nameDays}
        headerInk={headerInk}
        textSize={styles[SCOPE_OF_VIEW[settings.view]].entry.size}
        text={zoomDay ? (store.doc.entries[zoomDay] ?? "") : ""}
        onCommit={store.setEntry}
        onClose={() => setZoomDay(null)}
        onOpenHolidays={openHolidays}
        onOpenNames={openNames}
      />

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

      {/* Create / switch / rename / restyle / delete a calendar. The app owns
          the registry (`useCalendars`); the framework owns the dialog — which
          is why the two props below still say "namespace": that is the
          framework's generic word for the slot, and the app's word for what
          is in it is set at the import above. */}
      <CalendarsModal
        open={calendarsOpen}
        onClose={() => setCalendarsOpen(false)}
        namespaces={calendars.list}
        activeNamespace={calendars.activeSlug}
        onSwitch={calendars.switchTo}
        onCreate={calendars.create}
        onRename={calendars.rename}
        onSetAppearance={calendars.setAppearance}
        onRemove={calendars.remove}
        labels={{
          heading: t("calendars.heading"),
          blurb: t("calendars.blurb"),
          newAction: t("calendars.newAction"),
          namePlaceholder: t("calendars.namePlaceholder"),
          nameLabel: t("calendars.nameLabel"),
          create: t("calendars.create"),
          nameRequired: t("calendars.nameRequired"),
          colorLabel: t("calendars.colorLabel"),
          glyphLabel: t("calendars.glyphLabel"),
          glyphNone: t("calendars.glyphNone"),
          save: t("calendars.save"),
          cancel: t("calendars.cancel"),
          renameAction: t("calendars.renameAction"),
          deleteAction: t("calendars.deleteAction"),
          delete: t("calendars.delete"),
          deleteConfirm: (name) => t("calendars.deleteConfirm", { name }),
          switchTo: (name) => t("calendars.switchTo", { name }),
          defaultBadge: t("calendars.defaultBadge"),
          close: t("calendars.close"),
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
        calendarSlug={calendars.activeSlug}
        calendarName={calendars.activeCalendar.name}
        calendarCount={calendars.list.length}
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
        backup={backup}
        reset={reset}
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

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The English UI catalog — the catalog's TYPE SOURCE: `sv.ts` must satisfy
// `Catalog`, so adding a string here forces the Swedish translation too.
// These are the app-chrome strings; calendar-domain names (months, weekdays,
// name days) come from the country packs in `../locale/`, not from here.

export const en = {
  app: {
    title: "Calendar",
  },
  topbar: {
    today: "Today",
    previous: "Previous",
    next: "Next",
    settings: "Settings",
    viewSwitcher: "View",
    viewMonth: "Month",
    viewWeek: "Week",
    viewList: "Day list",
    week: "Week {n}",
  },
  editor: {
    placeholder: "Type here — keep it short…",
    hint: "Enter saves · Esc closes",
    editDay: "Edit {date}",
  },
  weekdays: {
    // The "(week) w" prefix printed before week numbers in the grid margin.
    weekShort: "w.",
  },
  settings: {
    title: "Settings",
    close: "Close",
    sections: "Settings sections",
    chooseSection: "Choose a settings section",
    closeSection: "Close section menu",
    tabGeneral: "General",
    tabAppearance: "Appearance",
    tabEntries: "Entries",
    tabStorage: "Storage",
    tabDeveloper: "Developer",
    tabLogs: "Logs",
    language: "Language",
    languageChoose: "Interface language",
    languageHint:
      "The language of the app's own text. The calendar's own names follow the country calendar.",
    languageEnglish: "English",
    languageSwedish: "Svenska",
    country: "Country calendar",
    countryChoose: "Country",
    countryHint:
      "Sets the start of week, week numbers, red days, and name days.",
    weekNumbers: "Week numbers",
    weekNumbersHint: "Show ISO week numbers in the month grid.",
    nameDays: "Name days",
    nameDaysHint: "Show the day's names on the calendar.",
    entryText: "Entry text",
    textSize: "Text size",
    textSizeHint:
      "Dynamic shrinks a note as you write so it always fits its day; the fixed steps keep every note the same size.",
    textSizeDynamic: "Dynamic",
    textSizeSmall: "Small",
    textSizeMedium: "Medium",
    textSizeLarge: "Large",
    dayListRows: "Day list rows",
    rows: "Row height",
    dayListRowsHint:
      "Fixed keeps every row the same height; Dynamic grows a row with its text.",
    rowsFixed: "Fixed",
    rowsDynamic: "Dynamic",
    resetToDefaults: "Reset to defaults",
  },
  storage: {
    heading: "Where your calendar is stored",
    hint: "One backend is active at a time. Switching loads the document from the new backend.",
    browser: "This browser",
    browserHint: "Stored in this browser's local storage. No setup.",
    folder: "Local folder",
    folderHint: "A folder on this device (Chromium browsers only).",
    folderConnect: "Choose folder…",
    folderReconnect: "Reconnect folder…",
    dropbox: "Dropbox",
    dropboxHint: "A file in your Dropbox app folder.",
    gdrive: "Google Drive",
    gdriveHint: "A file in a Drive folder the app creates.",
    connect: "Connect",
    disconnect: "Disconnect",
    active: "Active",
    use: "Use",
    demo: "Demo data",
    demoHint: "A read-only sample calendar (developer mode).",
    statusSaved: "Saved",
    statusSaving: "Saving…",
    statusError: "Save failed: {error}",
    statusLoading: "Loading…",
  },
  developer: {
    devMode: "Developer mode",
    devModeHint: "Unlocks the demo-data backend, logs, and build info.",
    captureLogs: "Capture logs",
    captureLogsHint: "Keep the in-app log across reloads on this device.",
    demoData: "Demo data",
    demoDataHint:
      "Swap storage for an in-memory sample calendar. Nothing is written to disk; turning it off returns to your real calendar.",
    build: "Build",
    version: "Version",
    commit: "Commit",
    buildNumber: "Build number",
    slot: "Slot",
    sourceBranch: "Source branch",
    checkForUpdates: "Check for updates",
  },
  logs: {
    heading: "In-app log",
  },
  update: {
    ready: "A new version is ready",
    action: "Reload",
    dismiss: "Not now",
  },
  common: {
    close: "Close",
    cancel: "Cancel",
    save: "Save",
  },
};

export type Catalog = typeof en;

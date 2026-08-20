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
    previous: "Previous",
    next: "Next",
    settings: "Settings",
    viewSwitcher: "View",
    viewMonth: "Month",
    viewWeek: "Week",
    viewList: "Day list",
    week: "Week {n}",
    // The week planner prints the number in its right-hand margin, where a
    // printed almanac sets it: one letter and the number, in the heading's
    // colour. Swedish calendars print "v 32"; English ones "w 32".
    weekMark: "w {n}",
  },
  calendars: {
    // The top menu's left-hand button — the one that used to say "Today".
    // The framework ships this feature as "namespaces", a generic slot an app
    // files documents under; this app files exactly one kind of document, so
    // the reader is offered the thing rather than the slot.
    switcher: "Calendar: {name}",
    menu: "Calendars",
    manage: "Manage calendars…",
    heading: "Calendars",
    blurb:
      "Each calendar keeps its own notes — one for home, one for work. Switch between them from the top menu, or give one an icon and a colour.",
    newAction: "New calendar",
    namePlaceholder: "Calendar name",
    nameLabel: "Calendar name",
    create: "Create",
    nameRequired: "A name is required",
    colorLabel: "Colour",
    glyphLabel: "Icon",
    glyphNone: "No icon",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    renameAction: "Rename",
    deleteAction: "Delete calendar",
    delete: "Delete",
    deleteConfirm:
      "Delete \u201c{name}\u201d and all of its notes? This can't be undone.",
    switchTo: "Switch to {name}",
    defaultBadge: "Default",
    // The two calendars a first run is seeded with (see `useCalendars`).
    seedPersonal: "Personal",
    seedWork: "Work",
  },
  editor: {
    // The editor has no placeholder — a day you press is a caret on a blank
    // cell. This is its accessible name.
    label: "Note for this day",
    hint: "Enter adds a line · Esc closes",
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
    tabCalendar: "Calendar",
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
    weekNumbersHint: "Show ISO week numbers in the calendar.",
    nameDays: "Name days",
    nameDaysHint: "Show the day's names on the calendar.",
    eves: "Holiday eves",
    evesHint:
      "By law an eve is an ordinary working day, and in practice most collective agreements hand some of them back. These start from what the agreements usually say — change any your workplace treats differently. A day off here is one the vacation planner stops asking you to book.",
    eveOff: "Day off",
    eveHalf: "Half day",
    eveWork: "Working",
    evesReset: "Back to the agreements",
    evesFollowing: "Following your country's collective agreements.",
    vacation: "Vacation",
    vacationDays: "Vacation days a year",
    vacationDaysHint:
      "Your paid annual leave. The vacation planner spends it on the days that buy the most time off.",
    vacationOpenPlanner: "Open the vacation planner",
    vacationOpenPlannerHint:
      "Saves your settings and opens the planner for the year you are looking at. You can also get there by tapping a holiday's name in any view.",
    viewStyle: "View",
    viewStyleHint:
      "How each view prints a day. Pick the view, then tap a quadrant of the sample to choose what is printed there and set each piece below. The sample is the real thing — every change lands in it as you make it.",
    viewStylePicker: "View to adjust",
    viewStyleShared:
      "The week planner and the day list print the same row, so they share these settings — the picker changes which of the two the sample shows.",
    stripLaneTop: "Left margin, top",
    stripLaneBottom: "Left margin, bottom",
    stripRailTop: "Right margin, top",
    stripRailBottom: "Right margin, bottom",
    cellDayNumber: "Day number",
    cellTopRight: "Top right",
    cellTopLeft: "Top left",
    cellBottomRight: "Bottom right",
    cellBottomLeft: "Bottom left",
    cellHolidays: "Holiday name",
    cellNameDays: "Name days",
    cellWeekNumber: "Week number",
    cellCloseMenu: "Close the corner menu",
    cellNote: "Your note",
    cellNoteTop: "Top",
    cellNoteMiddle: "Middle",
    cellNoteBottom: "Bottom",
    fonts: "Face",
    fontYourText: "Your text",
    fontPrint: "Almanac",
    fontSerif: "Serif",
    fontSans: "Sans",
    fontMono: "Mono",
    fontDyslexic: "Dyslexic",
    textSize: "Size",
    textSizeEntryHint:
      "Your text on Dynamic shrinks as you write so a note always fits its day; the fixed steps keep every note the same size. Either way a day takes only what fits — once it is full it accepts no more text.",
    textSizeDynamic: "Dynamic",
    textSizeSmall: "Small",
    textSizeMedium: "Medium",
    textSizeLarge: "Large",
    textSizeHuge: "Huge",
    textSizeSampleHoliday: "All Saints",
    textSizeSampleNote: "Dinner 18:00",
    pastDays: "Passed days",
    pastDaysHint:
      "Cross off the days that have gone, the way you would on a paper calendar. Today is never crossed — the run of marks stops at it.",
    pastMark: "Mark",
    pastMarkNone: "Off",
    pastMarkCross: "Cross ✕",
    pastMarkSlash: "Slash /",
    pastMarkScope: "Covers",
    pastMarkScopeCell: "Whole day",
    pastMarkScopeDate: "The date",
    dayListRows: "Day list rows",
    rows: "Row height",
    dayListRowsHint:
      "Fixed keeps every row the same height; Dynamic grows a row with its text.",
    rowsFixed: "Fixed",
    rowsDynamic: "Dynamic",
    heading: "Heading",
    headingHint:
      "A printed calendar sets the month over a coloured bar and prints its week numbers in the same colour. Off leaves the heading plain and the week numbers in the page's own ink.",
    headerColor: "Colour",
    headerColorNone: "Off",
    headerColorRed: "Red",
    headerColorBlue: "Blue",
    headerColorGreen: "Green",
    headerColorPlum: "Plum",
    headerColorOchre: "Ochre",
    weekPlanner: "Week planner",
    weekPlannerHint:
      "The week strip: the date and the day's names down the left, your notes in the middle, and the week number and the holiday's name in the right-hand margin.",
    weekDayOfYear: "Day of year",
    weekDayOfYearHint:
      "Print each day's number in the year (1–366) beside the weekday. The day list prints it too.",
    weekDateSize: "Date size",
    weekFormat: "Week number",
    weekFormatHint: "The day list prints its week numbers the same way.",
    weekRows: "Week planner rows",
    weekRowsHint:
      "Fixed fits the whole week on one screen; Dynamic grows a day with its text and scrolls.",
    theme: "Theme",
    themeMode: "Mode",
    themeSystem: "Follow device",
    themeSystemNote:
      "The calendar turns dark when your device does, and light again when it doesn't.",
    themeLight: "Light",
    themeDark: "Dark",
    themeCustom: "Custom",
    themeVariant: "Variant",
    themeColours: "Colours",
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
    dropboxHint: "One folder per calendar in your Dropbox app folder.",
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
    device: "Device",
    viewport: "Viewport",
    /** The four safe-area insets, top / right / bottom / left. */
    safeAreas: "Safe areas",
    /** The gap this device is giving the last row of a view. */
    bottomGutter: "Bottom gutter",
    /** The space this device is leaving above the top menu's buttons. */
    topbarLead: "Top menu lead",
    displayMode: "Display mode",
  },
  holidays: {
    /** Title of the holidays screen. */
    title: "Holidays",
    tabList: "Holidays",
    tabPlanner: "Planner",
    back: "Back to the calendar",
    empty: "No holidays this year.",
    workday: "Workday",
    halfDay: "Half day",
    /** e.g. "4 days off" */
    daysOff: "{n} days off",
    oneDayOff: "1 day off",
    /** The planner's summary line. */
    summary: "{spent} days booked buys {off} days off",
    longest: "Longest break {n} days",
    unspent: "{n} days left to spend as you like",
    allowance: "Allowance {n} days",
    noBudget: "Set your vacation days in Settings to plan the year.",
    nothingToPlan: "This year's holidays already fall on your days off.",
    /** Heading above the days to request in one break. */
    book: "Book",
    bookOne: "Book 1 day",
    bookMany: "Book {n} days",
  },
  names: {
    /** Title of the name-day search. */
    title: "Name days",
    placeholder: "Search for a name",
    clear: "Clear the name",
    close: "Close the name search",
    /** Heading above the names that only sound close to the query. */
    similar: "Similar names",
    matches: "{n} names",
    oneMatch: "1 name",
    noResults: "No name like “{query}” in the almanac.",
    unavailable: "This country calendar has no name days.",
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

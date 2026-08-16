// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Swedish UI catalog. Must satisfy `Catalog` (typed from `en.ts`), so a
// string added to English without a Swedish translation fails `tsc`.

import type { Catalog } from "./en.ts";

export const sv: Catalog = {
  app: {
    title: "Kalender",
  },
  topbar: {
    today: "Idag",
    previous: "Föregående",
    next: "Nästa",
    settings: "Inställningar",
    viewMonth: "Månad",
    viewWeek: "Vecka",
    viewList: "Daglista",
    week: "Vecka {n}",
  },
  editor: {
    placeholder: "Skriv här — håll det kort…",
    hint: "Enter sparar · Esc stänger",
    editDay: "Redigera {date}",
  },
  weekdays: {
    weekShort: "v.",
  },
  settings: {
    title: "Inställningar",
    close: "Stäng",
    tabGeneral: "Allmänt",
    tabAppearance: "Utseende",
    tabStorage: "Lagring",
    tabDeveloper: "Utvecklare",
    tabLogs: "Logg",
    language: "Språk",
    languageEnglish: "English",
    languageSwedish: "Svenska",
    country: "Landskalender",
    countryHint:
      "Styr veckans första dag, veckonummer, röda dagar och namnsdagar.",
    weekNumbers: "Veckonummer",
    weekNumbersHint: "Visa ISO-veckonummer i månadsvyn.",
    nameDays: "Namnsdagar",
    nameDaysHint: "Visa dagens namn i kalendern.",
    dayListRows: "Daglistans rader",
    dayListRowsHint:
      "Fast ger alla rader samma höjd; Dynamisk låter raden växa med texten.",
    rowsFixed: "Fast",
    rowsDynamic: "Dynamisk",
    resetToDefaults: "Återställ till standard",
  },
  storage: {
    heading: "Var din kalender lagras",
    hint: "En lagringsplats är aktiv åt gången. Vid byte läses dokumentet från den nya platsen.",
    browser: "Den här webbläsaren",
    browserHint: "Sparas i webbläsarens lokala lagring. Ingen konfiguration.",
    folder: "Lokal mapp",
    folderHint: "En mapp på den här enheten (endast Chromium-webbläsare).",
    folderConnect: "Välj mapp…",
    folderReconnect: "Återanslut mapp…",
    dropbox: "Dropbox",
    dropboxHint: "En fil i din Dropbox-appmapp.",
    gdrive: "Google Drive",
    gdriveHint: "En fil i en Drive-mapp som appen skapar.",
    connect: "Anslut",
    disconnect: "Koppla från",
    active: "Aktiv",
    use: "Använd",
    demo: "Demodata",
    demoHint: "En skrivskyddad exempelkalender (utvecklarläge).",
    statusSaved: "Sparad",
    statusSaving: "Sparar…",
    statusError: "Kunde inte spara: {error}",
    statusLoading: "Läser in…",
  },
  developer: {
    devMode: "Utvecklarläge",
    devModeHint: "Låser upp demodata, loggar och bygginformation.",
    captureLogs: "Spara loggar",
    captureLogsHint: "Behåll appens logg mellan omladdningar på denna enhet.",
    demoData: "Demodata",
    demoDataHint:
      "Byter lagringen mot en exempelkalender i minnet. Inget skrivs till disk; stäng av för att återgå till din riktiga kalender.",
    build: "Bygge",
    version: "Version",
    commit: "Commit",
    buildNumber: "Byggnummer",
    slot: "Plats",
    sourceBranch: "Källgren",
    checkForUpdates: "Sök efter uppdateringar",
  },
  logs: {
    heading: "Appens logg",
  },
  update: {
    ready: "En ny version är redo",
    action: "Ladda om",
    dismiss: "Inte nu",
  },
  common: {
    close: "Stäng",
    cancel: "Avbryt",
    save: "Spara",
  },
};

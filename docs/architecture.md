# Architecture

Calendar is a frontend-only, local-first PWA built on
[`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework).
There is no server: the whole app is static files, and the document lives in
the storage backend the user picks.

## Rendering runtime

The renderer is **Preact**. `@preact/preset-vite` compiles JSX against
`preact/jsx-runtime` and aliases `react` / `react-dom` onto `preact/compat`,
so the framework — built against React — resolves to Preact. App code imports
hooks from `"react"` (the supported compat path); only `src/main.tsx` touches
Preact's own `render`. Do not add `react`/`react-dom` as dependencies.

## Module map

```
src/
├── main.tsx              boot: styles, LanguageRoot, <App/>
├── App.tsx               shell: top bar, active view, settings, update toast
├── output.ts             §19.4 central output module (semantic log helpers)
└── app/
    ├── locale/           country packs (en-GB, sv-SE) — see features/locales.md
    ├── i18n/             UI-string catalogs (framework createI18n)
    ├── storage/          backend registry + OAuth flows + demo adapter
    ├── types.ts          CalendarDoc: { version, entries: { "YYYY-MM-DD": text } }
    ├── migrations.ts     version chain (framework createMigrator)
    ├── useCalendarStore.ts  load/save through the active StorageAdapter
    ├── useAppSettings.ts    persisted app settings (country, view, dev mode…)
    ├── entryFont.ts      entry sizing: the shrink-to-fit curve and the three
    │                     fixed steps (pure, tested)
    ├── monthImage.ts     the month-image seam (packs plug in later)
    ├── MonthGridView.tsx / WeekPlannerView.tsx / DayListView.tsx
    ├── DayEntry.tsx      shared read/edit entry surface
    ├── TopBar.tsx        the only chrome — no sidebar
    ├── settings/         the tabbed settings dialog: SettingsModal.tsx (shell
    │                     + draft/Save), tabs.tsx (header + rail), one file
    │                     per tab section
    ├── log.ts            the in-app log store
    └── pwa.ts            cache-id convention shared with pwa-plugin.ts
```

Dependency direction: views → stores → framework. Nothing imports framework
internals — only published subpaths (`…/calendar`, `…/storage`, `…/theme`, …).

## Date model

Days are the framework's `DayKey` (`"YYYY-MM-DD"`); month grids and week
strips come from `buildMonthGrid` / `buildWeekStrip`, week numbers from
`isoWeek`. The app stores nothing about time zones — a day is a calendar day.

## PWA pipeline

`pwa-plugin.ts` hand-rolls the service worker at build time (no Workbox): a
"prompt to update" precaching worker plus `version.json` and
`precache-manifest.json`, exactly what the framework's `usePwaUpdate` hook
consumes. The cache id comes from `src/app/pwa.ts` — the one value the app
and the plugin must agree on; change them together.

## Storage

See [storage.md](storage.md) for the backend model, and
`src/app/storage/backends.ts` for the wiring.

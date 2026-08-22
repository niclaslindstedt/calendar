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
    ├── locale/           country packs (en-GB, sv-SE) + eves.ts (which
    │                     holiday eves are worked) — see features/locales.md
    ├── i18n/             UI-string catalogs (framework createI18n)
    ├── storage/          backend registry + OAuth flows + demo adapter;
    │                     paths.ts names each calendar's document (pure, tested)
    ├── types.ts          CalendarDoc: { version, entries: { "YYYY-MM-DD": text } }
    ├── migrations.ts     version chain (framework createMigrator)
    ├── useCalendarStore.ts  load/save the active calendar's document through
    │                     the active StorageAdapter
    ├── useCalendars.ts   the calendar registry + active pointer — separate
    │                     calendars, one document each (features/calendars.md)
    ├── useAppSettings.ts    persisted app settings (country, view, dev mode…)
    ├── entryFont.ts      entry sizing: the shrink-to-fit curve and the three
    │                     fixed steps (pure, tested)
    ├── entryFit.ts       the same sizing measured against the real box: shrink
    │                     to fit, end an overlong note in an ellipsis, refuse a
    │                     full day
    ├── entryDom.ts       the note as the browser holds it while you write in
    │                     it — the editable box's text and caret
    ├── pastDays.ts       which days are past and what the "crossed off" mark
    │                     is made of (pure, tested); PastMark.tsx draws it
    ├── listHome.ts       where the day list opens a month — today's week on
    │                     the month you arrive on, and the edge you paged in
    │                     through (its 1st forward, its last day back) on one
    │                     you turned the page to (pure, tested)
    ├── monthImage.ts     the month-image seam (packs plug in later)
    ├── weekSearch.ts     the year's weeks and the readings a typed query has
    │                     — a week number, or a date written any of the ways
    │                     people write one, `12/8` meaning both (pure, tested);
    │                     WeekSearch.tsx is the screen a tapped week number
    │                     opens
    ├── SwipeDeck.tsx     the pager both directions are built from: up and down
    │                     turns the period, left and right turns the view, and
    │                     the calendar stacks one of each
    ├── MonthGridView.tsx / WeekPlannerView.tsx / DayListView.tsx
    ├── monthCell.tsx     the month cell's arrangement: the corners its pieces
    │                     are parked in, and the note flowing around the day
    │                     number where the cell is wide enough for it
    ├── DayEntry.tsx      shared entry surface — one box, read or written, so
    │                     a note being typed has the shape it will be read in
    ├── stripRow.tsx      the week planner's and the day list's shared row: two
    │                     margins with the note between them, or — the
    │                     reader's call — flowing around them
    ├── DayZoom.tsx       one day as a page of its own — what a long press on
    │                     a day opens, where a note the cell had to clamp is
    │                     read and written in full
    ├── TopBar.tsx        the only chrome — no sidebar
    ├── CalendarMenu.tsx  the top-left switcher (button + dropdown)
    ├── TopBarButton.tsx  the shared 36 px icon button
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

## The native wrapper

`native/` is a separate Expo / React Native project — its own `package.json`,
lockfile and `node_modules` — that ships this same app to the App Store and
Google Play. It packs `dist/` into `native/assets/webroot.zip`, unpacks it on
first launch and serves it from a loopback HTTP server, then points a WebView
at that origin. The one thing it adds is Home Screen widgets.

The dependency direction is one-way and strict: **nothing in `src/` knows the
wrapper exists.** The wrapper reads the shipped app from the outside — a
script injected into the page reports the `calendar:` / `oss:cache:` slice of
`localStorage`, and `native/src/snapshot.ts` derives a small widget snapshot
from it. That module is therefore the only reader of the app's storage layout
that is not the app, which is why it is pure and pinned by
`tests/native_snapshot_test.ts` in the root suite.

See [features/native-app.md](features/native-app.md) for what it gives a
reader, and `native/README.md` for how it is put together.

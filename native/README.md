# The native wrapper

A **thin** Expo / React Native shell around the calendar web app, so it can
ship to the App Store and Google Play — and so it can put **Home Screen
widgets** on a phone, which a PWA cannot.

Thin is the design, not an aspiration. The wrapper:

- packs the built web app into `assets/webroot.zip`, unpacks it on first
  launch and serves it from a **loopback HTTP server** (`src/local-server.ts`);
- points a `WebView` at that origin, and gets out of the way — the status bar
  and safe-area bands follow the page's own theme, off-origin links go to the
  system browser, and Android's back button drives the WebView's history;
- copies the page's notes into a shared container so the **widgets** can print
  them (`src/injected.ts` → `src/snapshot.ts` → `modules/widget-bridge`).

That is the entire list. **Nothing in the repo's `src/` knows this exists**,
and no feature is added here that the web app does not already have. If the
wrapper ever needs the web app changed to accommodate it, that is a sign it
has stopped being thin.

## Layout

| Path                      | What it is                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `App.tsx`                 | The whole app: a WebView, a spinner, and a failure screen.                                           |
| `src/local-server.ts`     | Unpacks `assets/webroot.zip` and serves it on a **fixed** loopback port.                             |
| `src/injected.ts`         | The one script injected into the page: reports theme + storage, kills the service worker.            |
| `src/snapshot.ts`         | **Pure.** Raw `localStorage` → the widget snapshot. Tested from the root suite.                      |
| `src/widgets.ts`          | Publishes a snapshot through the native bridge; degrades to "no widgets" when it is absent.          |
| `modules/widget-bridge/`  | A local Expo module: writes the snapshot into the shared container and reloads the widget timelines. |
| `targets/widget/`         | The iOS WidgetKit extension (SwiftUI), generated into Xcode by `@bacons/apple-targets`.              |
| `widgets/android/`        | The Android app widget (`RemoteViews`), copied into the app module by `plugins/with-widgets.js`.     |
| `plugins/with-widgets.js` | Wires the widgets into both native projects during `expo prebuild`.                                  |
| `scripts/bundle-web.mjs`  | Builds the web app and packs `dist/` into `assets/webroot.zip`.                                      |

`ios/` and `android/` are **prebuild output**: regenerated from `app.config.js`
and `plugins/` by `expo prebuild --clean`, gitignored, and the source of truth
for nothing. Never edit them.

## Working on it

```sh
make native-install      # or: npm --prefix native install
make native-bundle       # build the web app into assets/webroot.zip
make native-typecheck
make native-prebuild     # inspect what the config plugins generate
```

Then run it on a device or simulator (needs Xcode / Android Studio):

```sh
cd native
npm run ios        # bundles the web app first, then expo run:ios
npm run android
```

`npm run bundle` must have run at least once before any native build — the
wrapper serves that zip, and without it the app launches to a blank screen.

To point a build at a deployed slot instead of the bundled copy (debugging
only — a store build must never do this):

```sh
EXPO_PUBLIC_CALENDAR_URL=https://calendar.niclaslindstedt.se/preview/ npm run ios
```

## The widgets

Two on iOS, one on Android, all read-only:

- **Today** (iOS, small + medium) — the date, and the note you left on it.
- **Upcoming** (iOS, medium + large) — the next days you have written on.
- **Upcoming** (Android, resizable) — the same list.

They print **the date and your note**, and deliberately not name days or
holidays: those come from the country packs in `src/app/locale/`, which
compute moving feasts per year, and reproducing that in Swift and Kotlin would
be a second implementation of the app's domain.

### How the data gets there

```
WebView (localStorage)
   │  injected.ts  — posts the calendar: / oss:cache: slice + the theme
   ▼
App.tsx  → widgets.ts → snapshot.ts   — derives a small, windowed snapshot
   │
   ▼  modules/widget-bridge
iOS: UserDefaults(suiteName: group.se.niclaslindstedt.calendar)
Android: SharedPreferences("calendar_widget")
   │
   ▼
targets/widget (SwiftUI)  /  widgets/android (RemoteViews)
```

The snapshot is windowed (yesterday → +60 days), capped, and written only when
it actually changed — publishing wakes a widget process on both platforms, and
a note is saved keystroke by keystroke.

**The App Group id is pinned in four files that must agree**:
`app.config.js`, `plugins/with-widgets.js`, `modules/widget-bridge/index.ts`
(and its Swift twin), and `targets/widget/expo-target.config.js`. Changing it
after release orphans every installed widget's data.

## Things that will bite you

- **The port in `src/local-server.ts` is fixed on purpose.** A web origin is
  scheme + host + port, and `localStorage` is keyed by origin — so a random
  port would hand the WebView an empty store on every launch, and every note
  the user wrote would appear to vanish.
- **`localhost`, not `127.0.0.1`.** App Transport Security blocks the literal
  address from `WKWebView` even with exception domains declared. The failure
  mode is a silent blank page on iOS.
- **The service worker is unregistered** (`src/injected.ts`). The origin is
  stable across app updates, so a worker registered by an older build would
  keep answering from its precache after a store update had already unpacked
  the new one.

## Releasing

See [`RELEASING.md`](RELEASING.md).

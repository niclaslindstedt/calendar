# The native wrapper

A **thin** Expo / React Native shell around the calendar web app, so it can
ship to the App Store and Google Play — and so it can do the three things a
PWA cannot: put **Home Screen widgets** on a phone, read the device's
**contacts** so the calendar can mark the reader's people, and sync the notes
through the reader's own **iCloud Drive**.

Thin is the design, not an aspiration. The wrapper:

- packs the built web app into `assets/webroot.zip`, unpacks it on first
  launch and serves it from a **loopback HTTP server** (`src/local-server.ts`);
- points a `WebView` at that origin, and gets out of the way — the status bar
  and safe-area bands follow the page's own theme, off-origin links go to the
  system browser, and Android's back button drives the WebView's history;
- copies the page's notes into a shared container so the **widgets** can print
  them (`src/injected.ts` → `src/snapshot.ts` → `modules/widget-bridge`);
- answers the page when it asks for **contacts** (`src/contactsBridge.ts` →
  `src/contacts.ts`), handing over names and birthdays and nothing else;
- answers the page when it asks to read or write a file in the app's
  **iCloud** container (`src/icloudBridge.ts` → `src/icloud.ts` →
  `modules/icloud-store`);
- opens a cloud provider's sign-in in an **authentication session** when the
  page asks for one (`src/authSessionBridge.ts` → `src/authSession.ts` →
  `expo-web-browser`) — see [Signing in to Dropbox](#signing-in-to-dropbox).

That is the entire list, and it is deliberately not empty: **App Store
guideline 4.2 rejects a build that is only a viewer for a website**, so the
wrapper has to do things the browser cannot. Widgets, contacts and iCloud are
those things. Adding a fourth is allowed; adding one that makes `src/` aware
of this wrapper is not.

**Nothing in the repo's `src/` knows this exists.** The widgets read the
shipped app from the outside. Contacts and iCloud, which the web app has to
_drive_, work the other way round without breaking that rule: the app looks
for a contacts or an iCloud **capability** on `window` and this installs one,
so a browser (which has none) simply does not show the feature. The app never
asks what it is running inside.

The wrapper also decides nothing about the calendar. It reads names and
birthdays; which day a name is celebrated on, how a spelling folds, and what a
29 February birthday does in a common year are the web app's, in
`src/app/people/celebrations.ts`, against the country packs it already
ships.

## Layout

| Path                       | What it is                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                  | The whole app: a WebView, a spinner, and a failure screen.                                                                         |
| `src/local-server.ts`      | Unpacks `assets/webroot.zip` and serves it on a **fixed** loopback port.                                                           |
| `src/injected.ts`          | The one script injected into the page: reports theme + storage, kills the service worker.                                          |
| `src/snapshot.ts`          | **Pure.** Raw `localStorage` → the widget snapshot. Tested from the root suite.                                                    |
| `src/contactsBridge.ts`    | **Pure.** The injected contacts provider, and the request/response plumbing. Tested from the root suite.                           |
| `src/contacts.ts`          | Reads names and birthdays through `expo-contacts`. Two fields, read-only, no storage.                                              |
| `src/icloudBridge.ts`      | **Pure.** The injected iCloud provider, and the request/response plumbing. Tested from the root suite.                             |
| `src/icloudWire.ts`        | **Import-free.** The shapes that cross the iCloud bridge — see the note in the file.                                               |
| `src/icloud.ts`            | Runs one iCloud request against the native module. Degrades to "unavailable" when it is absent.                                    |
| `src/authSessionBridge.ts` | **Pure.** The injected sign-in provider (`window.__ossAuthSession`) and its request/response plumbing. Tested from the root suite. |
| `src/authSession.ts`       | Opens one sign-in in an authentication session (`expo-web-browser`) and hands back where it ended.                                 |
| `src/scriptText.ts`        | **Import-free.** Splicing text safely into an injected script; shared by every bridge.                                             |
| `modules/icloud-store/`    | A local Expo module: list / read / write / remove inside the app's iCloud container. **Apple only.**                               |
| `plugins/with-icloud.js`   | Declares the container as a document scope (`NSUbiquitousContainers`), so it shows up in the Files app.                            |
| `src/widgets.ts`           | Publishes a snapshot through the native bridge; degrades to "no widgets" when it is absent.                                        |
| `modules/widget-bridge/`   | A local Expo module: writes the snapshot into the shared container and reloads the widget timelines.                               |
| `targets/widget/`          | The iOS WidgetKit extension (SwiftUI), generated into Xcode by `@bacons/apple-targets`.                                            |
| `widgets/android/`         | The Android app widgets (`RemoteViews`), copied into the app module by `plugins/with-widgets.js`.                                  |
| `plugins/with-widgets.js`  | Wires the widgets into both native projects during `expo prebuild`.                                                                |
| `scripts/bundle-web.mjs`   | Builds the web app and packs `dist/` into `assets/webroot.zip`.                                                                    |

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

Four of them, on both platforms, all read-only. Every one is the same idea —
**a span of days, each printed whether or not it carries a note** (see
`WidgetSpan` in `targets/widget/Provider.swift` and `Span` in
`widgets/android/CalendarWidgetProvider.kt`, which have to agree):

| Widget          | Span                                       | iOS sizes |
| --------------- | ------------------------------------------ | --------- |
| **Today**       | Today.                                     | S, M      |
| **Next 3 days** | Today and the two days after it.           | S, M      |
| **This week**   | The whole week today falls in.             | S, M, L   |
| **Work week**   | That week minus the pack's `restWeekdays`. | S, M, L   |

Empty days are printed, not skipped: a week with two things in it should look
like a week with two things in it. That is what makes these calendar widgets
rather than to-do lists.

Whole week and work week are **two widgets, not one with a setting**. A
configurable widget on iOS means an `AppIntent` configuration, which raises
the widget's floor to iOS 17 and has no equivalent on the Android side short
of a configuration Activity; two entries in the picker cost a `Widget` struct
and a receiver each, and work everywhere.

They print **the date and the note**, and deliberately not name days or
holidays: those come from the country packs in `src/app/locale/`, which
compute moving feasts per year, and reproducing that in Swift and Kotlin would
be a second implementation of the app's domain.

Where a week starts and which of its days are not worked **do** travel in the
snapshot, mirrored from the packs by `WEEK_RULES` in `src/snapshot.ts`. That
mirror is duplication, and what makes it safe is the root suite's
`tests/native_snapshot_test.ts`: it reads the real packs, so the table cannot
drift, and a new country pack cannot be added without adding its row.

### How the data gets there

```
WebView (localStorage)
   │  injected.ts  — posts the calendar: / oss:cache: slice + the theme
   ▼
App.tsx  → widgets.ts → snapshot.ts   — derives a small, windowed snapshot
   │
   ▼  modules/widget-bridge
iOS: UserDefaults(suiteName: group.se.agilator.calendar)
Android: SharedPreferences("calendar_widget")
   │
   ▼
targets/widget (SwiftUI)  /  widgets/android (RemoteViews)
```

The snapshot is windowed (a week back → +60 days), capped, and written only
when it actually changed — publishing wakes a widget process on both
platforms, and a note is saved keystroke by keystroke. It reaches a week back
because the week widgets print the week TODAY is in, and on the last day of
that week it began six days ago.

**The App Group id is pinned in four files that must agree**:
`app.config.js`, `plugins/with-widgets.js`, `modules/widget-bridge/index.ts`
(and its Swift twin), and `targets/widget/expo-target.config.js`. Changing it
after release orphans every installed widget's data.

## The iCloud backend

The web app already syncs to a picked local folder. iCloud Drive is that
backend with a different transport underneath: a folder the device syncs,
rather than one the browser was handed a grant to.

```
Settings → Storage → iCloud Drive
   │  src/app/storage/backends.ts — a file-store adapter over the host
   ▼
window.__calendarICloud        — installed by src/icloudBridge.ts
   │  postMessage (request)  /  injectJavaScript (answer)
   ▼
App.tsx → src/icloud.ts → modules/icloud-store
   │
   ▼
iCloud.se.agilator.calendar/Documents/
   calendar.json, calendar.<slug>.json, …
```

Everything is filed under the container's `Documents` folder, which
`plugins/with-icloud.js` publishes as a document scope — so every calendar
shows up under **Calendar** in the Files app, named exactly as it would be in a
picked local folder.

**The container id is committed, never derived from the bundle id**, and is
spelled in two kinds of place that must agree: `identifiers.js` (read by the
entitlements in `app.config.js` and by `plugins/with-icloud.js`), and
`modules/icloud-store/index.ts` with its Swift twin, which cannot read a build
variable. The root suite's `tests/native_icloud_test.ts` compares them.
Changing it after release strands every synced copy in the old container.

It is **not** the App Group. The widgets read their snapshot from the page's
own storage, whichever backend is active; nothing on the iCloud path touches
`group.se.agilator.calendar`.

### What crosses, and what doesn't

The bridge carries paths and file contents as text, and nothing else — a
calendar is one JSON document with nothing binary beside it. Nothing is
cached on the native side and nothing is logged.

### Android

There is no iCloud on Android, and the module says so rather than pretending:
`modules/icloud-store` declares only the `apple` platform, so
`requireOptionalNativeModule` returns `null` there and the backend is reported
unavailable — which means the web app never lists it. The Android build keeps
the same local folder, Dropbox and on-device backends the website has.

## Signing in to Dropbox

The page's own Dropbox sign-in is a redirect: consent at dropbox.com, then
back to the page's origin with a code, which the page trades for tokens using
the PKCE verifier it kept in `sessionStorage`. That cannot finish in here. The
providers refuse consent inside an embedded WebView, so `App.tsx` sends an
off-origin page to Safari — and Dropbox then redirects **Safari** to
`http://localhost:8231…`, an origin it has not registered, in a browser that
does not hold the verifier.

So the wrapper offers the page an **authentication session**
(`ASWebAuthenticationSession` on iOS, a Custom Tab on Android): a browser sheet
over the app that closes as soon as the provider redirects to the app's own
scheme, and hands that URL back.

```
Settings → Storage → Dropbox → Connect
   │  src/app/storage/backends.ts — getAuthSessionHost() is present, so
   │  connectDropboxAuthSession(appKey, host)   (oss-framework)
   ▼
window.__ossAuthSession.open(authorizeUrl)   — installed by src/authSessionBridge.ts
   │  postMessage (request)  /  injectJavaScript (answer)
   ▼
App.tsx → src/authSession.ts → WebBrowser.openAuthSessionAsync(url, "se.agilator.calendar://oauth")
   │  the reader consents in the sheet; Dropbox redirects to
   │  se.agilator.calendar://oauth?code=…&state=dropbox and the sheet closes
   ▼
the page checks the state, trades the code (same verifier, same redirect URI)
```

As with contacts and iCloud, the page asks for a **capability**, not for this
wrapper: the host lives at `window.__ossAuthSession`, a name the framework
owns (`AUTH_SESSION_HOST_PROPERTY`), so the website — which has no host —
keeps its redirect flow and the desktop app keeps its loopback one. The
wrapper never sees a token: it opens an `https:` URL (nothing else is
accepted) and returns the callback URL, unread; a closed sheet comes back as
`null`, which the page reports as "cancelled" rather than as an error.

**The redirect URI is `<scheme>://oauth`**, and the scheme is the **bundle
id** (`app.config.js`'s `scheme`, from `APP_BUNDLE_ID` via `identifiers.js`):
reverse-DNS, as RFC 8252 §7.1 asks, so no other app can claim it. In the
store build that is `se.agilator.calendar://oauth`; a plain checkout builds as
`dev.local.calendar://oauth`. Dropbox requires the exact URI to be
registered, so the Dropbox app behind `VITE_DROPBOX_APP_KEY` must list
`se.agilator.calendar://oauth` (and `dev.local.calendar://oauth`, to sign in
from a development build) under **Settings → OAuth 2 → Redirect URIs** in the
[App Console](https://www.dropbox.com/developers/apps), next to the website's
and the desktop app's. Without it Dropbox shows "Invalid redirect_uri" in the
sheet. The scheme needs no Info.plist entry of its own for the sheet to catch
it; Expo registers it anyway from `scheme`.

The widgets never name the scheme: tapping one opens the app itself (the
default on iOS, the launch intent on Android), so there is no deep link to
keep in step with it.

Other off-origin links are unchanged: they still leave for the system browser.

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
- **`url(forUbiquityContainerIdentifier:)` blocks.** It hits the disk and the
  iCloud account, so it never runs on the main thread — every entry point in
  the Swift module is an `AsyncFunction`, and the resolved URL is cached.

## Releasing

See [`RELEASING.md`](RELEASING.md).

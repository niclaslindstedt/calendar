# Configuration

All configuration is optional, build-time environment (Vite `VITE_*` vars).
Copy `.env.example` to `.env` and fill in what you need — the app builds and
runs with none of them set.

| Variable                  | Effect                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_DROPBOX_APP_KEY`    | Dropbox PKCE app key. Unset **hides** the Dropbox backend in Settings → Storage.                                                                    |
| `VITE_DROPBOX_APP_FOLDER` | The Dropbox app-folder name (fixed by your Dropbox app config; shown in Settings → Storage). Default `calendar`.                                    |
| `VITE_BASE`               | Deploy base path — one per deployment slot (`/`, `/preview/`, `/branch/`), set by the Pages workflow. Default `/`. See [deployment](deployment.md). |
| `VITE_SOURCE_REF`         | The branch parked in the `/branch/` slot, shown in its build label. Set by the Pages workflow; unset everywhere else.                               |

## Setting up the cloud backends

**Dropbox**: create an app at <https://www.dropbox.com/developers/apps> with
scoped access and an **App folder** named `calendar`, add your deploy
origin(s) to the redirect URIs (the app derives its redirect URI from
`origin + pathname`, without a trailing slash) — plus `http://127.0.0.1:53682/`,
`:53683/` and `:53684/` for the desktop app, and `se.agilator.calendar://oauth`
(the bundle id as the scheme) for the phone app, see
[native/README.md](../native/README.md#signing-in-to-dropbox) — and put the app key in
`VITE_DROPBOX_APP_KEY`. Grant it `files.metadata.read`,
`files.content.read` and `files.content.write` — the app never leaves its own
folder.

Name the app folder something else and `VITE_DROPBOX_APP_FOLDER` has to say
so: Dropbox fixes that name in the app's configuration and the API's root
_is_ that folder, so the value is never sent with a request — it is only what
Settings → Storage prints when it tells the user where their calendar sits.
Inside it, each calendar gets a folder of its own — see
[storage](storage.md).

**iCloud Drive** needs none of this: it has no client id and no environment
variable. The web build never talks to iCloud; the row appears only where a
host offers an iCloud provider — the App Store app — and its container is
registered with Apple, not configured here (see `native/RELEASING.md`).

## Runtime settings

Everything the user changes at runtime (country, language, view, theme,
storage choice, developer mode) is persisted per device in `localStorage`
under `calendar:*` keys — no server, no account.

The keys worth knowing by name:

| Key                        | Holds                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `calendar:settings`        | The settings dialog's choices.                                                                  |
| `calendar:appearance`      | Theme, accent, font family.                                                                     |
| `calendar:language`        | UI language (separate from the country calendar).                                               |
| `calendar:backend`         | The active storage backend.                                                                     |
| `calendar:calendars`       | The [calendar](features/calendars.md) registry — names, icons, colours.                         |
| `calendar:calendar:active` | Which calendar is on screen.                                                                    |
| `calendar:document`        | The default calendar's notes, when the browser backend is active (others are suffixed by slug). |

The calendar registry is device-local by design: the _documents_ sync through
the backend you chose, the list of them does not.

> The registry shipped under `calendar:namespaces` and
> `calendar:namespace:active` while the feature was called "namespaces". A
> device that still has those keys is moved onto the names above the first
> time it loads the app; nothing is lost, and the old keys are dropped.

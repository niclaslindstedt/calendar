# Configuration

All configuration is optional, build-time environment (Vite `VITE_*` vars).
Copy `.env.example` to `.env` and fill in what you need — the app builds and
runs with none of them set.

| Variable                  | Effect                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_DROPBOX_APP_KEY`    | Dropbox PKCE app key. Unset **hides** the Dropbox backend in Settings → Storage.                                                                    |
| `VITE_GOOGLE_CLIENT_ID`   | Google OAuth client id (GIS token client). Unset **hides** the Google Drive backend.                                                                |
| `VITE_DROPBOX_APP_FOLDER` | The Dropbox app-folder name (fixed by your Dropbox app config; shown in Settings → Storage). Default `nird-calendar`.                               |
| `VITE_GDRIVE_APP_FOLDER`  | The folder the app creates in My Drive for the document. Default `Calendar`.                                                                        |
| `VITE_BASE`               | Deploy base path — one per deployment slot (`/`, `/preview/`, `/branch/`), set by the Pages workflow. Default `/`. See [deployment](deployment.md). |
| `VITE_SOURCE_REF`         | The branch parked in the `/branch/` slot, shown in its build label. Set by the Pages workflow; unset everywhere else.                               |

## Setting up the cloud backends

**Dropbox**: create an app at <https://www.dropbox.com/developers/apps> with
scoped access and an **App folder** named `nird-calendar`, add your deploy
origin(s) to the redirect URIs (the app derives its redirect URI from
`origin + pathname`, without a trailing slash), and put the app key in
`VITE_DROPBOX_APP_KEY`. Grant it `files.metadata.read`,
`files.content.read` and `files.content.write` — the app never leaves its own
folder.

Name the app folder something else and `VITE_DROPBOX_APP_FOLDER` has to say
so: Dropbox fixes that name in the app's configuration and the API's root
_is_ that folder, so the value is never sent with a request — it is only what
Settings → Storage prints when it tells the user where their calendar sits.
Inside it, each namespace gets a folder of its own — see
[storage](storage.md).

**Google Drive**: create an OAuth client id in the Google Cloud console with
the Drive API enabled and your deploy origin in the allowed JavaScript
origins, and put the client id in `VITE_GOOGLE_CLIENT_ID`. The app uses the
least-privilege `drive.file` scope — it can only see files it created.

## Runtime settings

Everything the user changes at runtime (country, language, view, theme,
storage choice, developer mode) is persisted per device in `localStorage`
under `calendar:*` keys — no server, no account.

The keys worth knowing by name:

| Key                         | Holds                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `calendar:settings`         | The settings dialog's choices.                                                                      |
| `calendar:appearance`       | Theme, accent, font family.                                                                         |
| `calendar:language`         | UI language (separate from the country calendar).                                                   |
| `calendar:backend`          | The active storage backend.                                                                         |
| `calendar:namespaces`       | The [namespace](features/namespaces.md) registry — names, icons, colours.                           |
| `calendar:namespace:active` | Which namespace is on screen.                                                                       |
| `calendar:document`         | The default namespace's calendar, when the browser backend is active (others are suffixed by slug). |

The namespace registry is device-local by design: the _documents_ sync through
the backend you chose, the list of them does not.

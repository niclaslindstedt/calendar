# Storage & the document

## The document

Your whole calendar is one small JSON document:

```json
{
  "version": 1,
  "entries": {
    "2026-08-16": "Dinner Ada 18:00",
    "2026-08-22": "Car service 07:45"
  }
}
```

Days are ISO `YYYY-MM-DD` keys; values are the plain text you typed. Empty
notes are removed rather than stored. `version` drives the migration chain in
`src/app/migrations.ts` — older documents are upgraded on load.
A sample document lives in [`examples/calendar-document.json`](../examples/calendar-document.json).

There is one such document **per calendar** — see
[calendars](features/calendars.md). The shape is the same either way; only
where it is stored differs.

## Backends

One backend is active at a time (Settings → Storage). Switching loads the
document from the new backend.

| Backend          | Where the data lives                              | Notes                                              |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- |
| **This browser** | `localStorage` on the device                      | The default; zero setup.                           |
| **Local folder** | `calendar.json` in a folder you pick              | File System Access API — Chromium browsers only.   |
| **Dropbox**      | `<calendar>/calendar.json` in the app folder      | PKCE OAuth; requires `VITE_DROPBOX_APP_KEY`.       |
| **Google Drive** | `calendar.json` in a Drive folder the app creates | GIS popup OAuth; requires `VITE_GOOGLE_CLIENT_ID`. |
| **Demo data**    | In memory only                                    | Developer mode; a static sample calendar.          |

The file names above are the **default** calendar's. Every other calendar is
a sibling document beside it — `calendar:document:<slug>` in the browser,
`calendar.<slug>.json` in a local folder or on Drive — reached through the
same connection. Switching calendar saves any pending edit first, then loads
the other document; switching backends carries every calendar over the moment
each one is next opened and saved.

**Dropbox is the exception**: it gets a folder per calendar rather than a run
of suffixed files, so the app folder reads as the list of calendars the
switcher shows.

```
Apps/nird-calendar/
├── default/
│   └── calendar.json
└── work/
    └── calendar.json
```

The folder is named for the calendar's **slug**, fixed when it was created —
renaming a calendar changes what the switcher says, not where its notes live.
The default calendar is a folder like any other, so nothing sits loose at the
app folder's root. Settings → Storage prints the full path of the calendar on
screen. The app folder's own name is fixed by the Dropbox app the build points
at (`VITE_DROPBOX_APP_FOLDER`, default `nird-calendar`) — see
[configuration](configuration.md).

Deleting a calendar deletes its Dropbox folder outright; on the other
backends its document is emptied instead, because a storage adapter can write
but not delete.

The cloud backends are wrapped in an offline mirror: the last-loaded copy is
cached on the device, so the calendar opens (read-only fresh, editable once
reloaded) without a network; saves retry when you're back online. Each
calendar gets its own mirror, so one calendar's cache can never be served for
another's document.

## Conflicts

Saves carry the last-seen revision. If another device pushed first, the app
adopts the newer remote copy and notes it in the in-app log — with per-day
plain-text notes, last-writer-wins is the honest, simple policy.

## Demo data

Settings → Developer → **Demo data** swaps storage for an in-memory
`StorageAdapter` (`src/app/storage/demoAdapter.ts`) seeded with static sample
entries around the current month. Nothing touches disk; flipping it off (or
reloading) returns to the real backend with your document untouched.

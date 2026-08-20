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

## Import and export

Settings → Storage → **Import and export** takes a copy of everything out of
the app, and merges one back in. It is the way to move to another device, to
keep a backup of your own, or to put a phone and a laptop back in step when
they aren't sharing a cloud backend.

**Export** writes one JSON file, `calendar-backup-YYYY-MM-DD.json`:

```json
{
  "kind": "nird-calendar-backup",
  "version": 1,
  "exportedAt": "2026-08-20T09:00:00.000Z",
  "settings": { "localeId": "sv-SE", "weekNumbers": null, "…": "…" },
  "appearance": { "theme": "githubDark", "…": "…" },
  "calendars": [
    {
      "slug": "default",
      "name": "Personal",
      "entries": { "2026-08-16": "Dinner Ada 18:00" }
    },
    { "slug": "work", "name": "Work", "glyph": "briefcase", "entries": {} }
  ]
}
```

It carries the look settings, the theme, and **every** calendar with its
notes — read from whichever backend is active, not just the one on screen.
What it deliberately does not carry is the _connection_: the chosen backend,
the Dropbox / Drive tokens and the picked folder are this device's own account
state, and a file that held them would either be a secret or a lie on the
machine it was opened on. So an imported calendar lands in whatever backend
that device is already using.

**Import is a merge, not a restore.** Three rules:

- a calendar the device doesn't have is **added**, notes and all;
- a day only one side has is **kept**, whichever side it came from;
- a day both sides have written differently — or a calendar the two sides name
  differently — is a **conflict**.

Conflicts are the only thing you are asked about. A dialog lists them one per
row — the app settings as a row of their own, then each contested calendar —
and each row is a two-way choice: **Keep mine** or **Use the file**. The
winner decides the contested days and the calendar's name and icon; every
uncontested day is taken either way, so nothing is lost whichever way you
answer. A file that only brings new things is applied without a dialog, and a
file whose contents this device already has says so and does nothing.

The settings are treated as one blob: a device still sitting on the defaults
adopts the file's without being asked (it has made no choice to defend), and
one that has been set up gets the question.

A file that isn't a backup — or one written by a newer version of the app than
this one — is refused with a line saying which. Everything inside a file that
_is_ one is coerced back onto values the app can draw: a calendar's slug is
re-derived (it is a storage location — a key, a file name, a folder), an
unknown theme falls back to the device's, and non-text notes are dropped, the
same treatment a hand-edited document already gets.

Import and export are unavailable while **demo data** is on: there is nothing
real to copy out of an in-memory sample, and nothing that would survive an
import into it.

## Demo data

Settings → Developer → **Demo data** swaps storage for an in-memory
`StorageAdapter` (`src/app/storage/demoAdapter.ts`) seeded with static sample
entries around the current month. Nothing touches disk; flipping it off (or
reloading) returns to the real backend with your document untouched.

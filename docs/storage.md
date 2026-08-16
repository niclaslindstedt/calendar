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

## Backends

One backend is active at a time (Settings → Storage). Switching loads the
document from the new backend.

| Backend          | Where the data lives                              | Notes                                              |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- |
| **This browser** | `localStorage` on the device                      | The default; zero setup.                           |
| **Local folder** | `calendar.json` in a folder you pick              | File System Access API — Chromium browsers only.   |
| **Dropbox**      | `calendar.json` in your Dropbox app folder        | PKCE OAuth; requires `VITE_DROPBOX_APP_KEY`.       |
| **Google Drive** | `calendar.json` in a Drive folder the app creates | GIS popup OAuth; requires `VITE_GOOGLE_CLIENT_ID`. |
| **Demo data**    | In memory only                                    | Developer mode; a static sample calendar.          |

The cloud backends are wrapped in an offline mirror: the last-loaded copy is
cached on the device, so the calendar opens (read-only fresh, editable once
reloaded) without a network; saves retry when you're back online.

## Conflicts

Saves carry the last-seen revision. If another device pushed first, the app
adopts the newer remote copy and notes it in the in-app log — with per-day
plain-text notes, last-writer-wins is the honest, simple policy.

## Demo data

Settings → Developer → **Demo data** swaps storage for an in-memory
`StorageAdapter` (`src/app/storage/demoAdapter.ts`) seeded with static sample
entries around the current month. Nothing touches disk; flipping it off (or
reloading) returns to the real backend with your document untouched.

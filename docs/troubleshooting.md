# Troubleshooting

## Install / build

**`npm install` fails with 401/403 on `@niclaslindstedt/oss-framework`** —
the dependency resolves from GitHub Packages, which requires auth even for
public packages. Put a `read:packages` token in `~/.npmrc`:
`//npm.pkg.github.com/:_authToken=<token>`.

**The build fails resolving `@fontsource/...`** — run `npm install`; the
theme engine lazy-loads the optional font families from real packages.

## Storage

**Dropbox / Google Drive don't appear in Settings → Storage** — the backends
are hidden unless `VITE_DROPBOX_APP_KEY` / `VITE_GOOGLE_CLIENT_ID` were set
at build time. See [configuration.md](configuration.md).

**"Local folder" is missing** — the File System Access API is
Chromium-only (Chrome, Edge, Brave, Arc). Firefox and Safari can't offer it.

**The folder backend asks for permission again** — the OS re-prompts after a
browser restart; reconnecting from Settings → Storage re-grants it.

**Google Drive disconnects after closing the browser** — GIS popup tokens
are short-lived and session-scoped by design; reconnect from Settings.

## The calendar

**Week numbers are missing** — the UK pack hides them by default; flip
Settings → General → Week numbers, or switch the country to Sverige.

**Name days are missing** — the UK has no name-day tradition, so the toggle
only exists for countries whose pack carries a table (Sverige today).

**My text is tiny** — that's the point: the note shrinks to fit its cell so
the month always fits one screen. Trim the note, or use the week planner /
day list, which give each day more room.

## PWA

**The app doesn't update** — updates wait for your OK: look for the "a new
version is ready" prompt, or Settings → Developer → Check for updates. In
dev (`npm run dev`) no service worker registers at all.

**The app sits up under the status bar / Dynamic Island** — it should settle
back within a moment on its own. This was iOS's doing: opening the keyboard
scrolls the page to reveal the field even though the app itself never
scrolls, and closing the dialog over a still-focused field (Settings →
General → Vacation days) left that offset stranded. The dialog now lets go of
the keyboard before it closes, and the shell pins itself back if anything
else shifts it. If one ever sticks, closing and reopening the app clears it.

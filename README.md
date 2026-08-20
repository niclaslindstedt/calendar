# calendar

> A wall-calendar PWA that doesn't nag you. A monthly view in the style of a
> classic Swedish wall calendar — week numbers, red Sundays, name days — where
> you click a date and type a short note ("Dinner Ada 18:00") that's meant to
> be **read by you later**, not turned into a reminder.

[![ci](https://github.com/niclaslindstedt/calendar/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/calendar/actions/workflows/ci.yml)
[![release](https://github.com/niclaslindstedt/calendar/actions/workflows/release.yml/badge.svg)](https://github.com/niclaslindstedt/calendar/actions/workflows/release.yml)
[![pages](https://github.com/niclaslindstedt/calendar/actions/workflows/pages.yml/badge.svg)](https://github.com/niclaslindstedt/calendar/actions/workflows/pages.yml)
[![seo](https://github.com/niclaslindstedt/calendar/actions/workflows/seo.yml/badge.svg)](https://github.com/niclaslindstedt/calendar/actions/workflows/seo.yml)
[![spec](https://img.shields.io/badge/OSS__SPEC-v2.9.0-blueviolet)](OSS_SPEC.md)
[![license](https://img.shields.io/badge/license-PolyForm--NC--1.0.0-blue.svg)](LICENSE)

**[calendar.niclaslindstedt.se](https://calendar.niclaslindstedt.se)** — open
it in a browser and install it from there for offline use. No download, no
account, no server.

## What it is

A frontend-only, local-first calendar PWA built on
[`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework).
Three views, all month-scoped:

- **Month grid** — the whole month on one screen, like a paper wall calendar:
  weekday headers, ISO week numbers in the margin, Sundays in red, name days
  small in each cell, your note text in the cell (it shrinks as it grows, so
  every word counts).
- **Week planner** — one row per weekday for the current week, with room to
  read longer notes.
- **Day list** — the month as a vertical scroll, one row per day with the name
  days beside the number — more space per day when you need it.

## Why

Calendar apps want to _remind_ you. This one doesn't: it's a surface you
glance at, like the calendar on the kitchen wall. No notifications, no
accounts, no server — your entries are a small JSON document on your device,
optionally synced to a storage backend you control.

- **Local-first**: works offline, installable as a PWA.
- **Internationalized properly**: country packs (UK & Sweden today) adjust the
  start of week, week numbers, name days, and the holidays — each pack is one
  self-contained file that's easy to copy for a new country.
- **Knows which eves you actually work**: Julafton and Midsommarafton are
  working days by law and days off under almost every collective agreement,
  so they ship that way — and every Swedish eve can be set to a day off, a
  half day, or a working day when your workplace differs.
- **Finds your name day even if the almanac spells it differently**: tap a
  name to browse the almanac alphabetically, and search it by how a name
  sounds — "Nicklas" finds Niklas, "Sophia" finds Sofia.
- **Storage your way**: browser storage, a local folder, Dropbox (a folder per
  calendar in the app folder), or Google Drive.
- **Separate calendars in one app**: keep home and work apart — each calendar
  with its own notes, all in the same backend.
- **Take it with you**: export your settings and every calendar to one file,
  and import it on another device — a merge, not an overwrite, so it only asks
  you where the two actually disagree.

## Prerequisites

- Node.js ≥ 22 (`.nvmrc` pins 24), npm ≥ 10
- A GitHub personal access token with `read:packages` (for the
  `@niclaslindstedt/oss-framework` dependency — see Install)

## Install

The framework dependency resolves from the GitHub Packages npm registry, which
requires auth even for public packages. Put a `read:packages` token in your
`~/.npmrc`:

```sh
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
git clone https://github.com/niclaslindstedt/calendar.git
cd calendar
npm install
```

## Quick start

```sh
npm run dev
```

Open the printed URL. Click any date and type — the text lands on the calendar
and persists in your browser. The cogwheel (top right) opens Settings.

## Usage

- **Click a date** to type into it — the caret lands in the day itself, with
  no dialog and no placeholder. Enter starts a new line in the note; Escape,
  Ctrl/⌘+Enter or clicking away closes the editor. The text is plain text;
  keep it short — it shrinks to fit, and when it can shrink no further the day
  is full. A note too long for the space it is shown in ends in an ellipsis.
- **Press and hold a day** to open it as a page of its own — the whole note,
  at about four times the size a month cell can hold it at, and a comfortable
  place to write it.
- **Swipe** in any view to turn the page — left and right by default, or up
  and down if you set Settings → Calendar → Navigation that way, in which case
  the day list simply keeps scrolling into the month above or below.
- **Arrows** flanking the month heading page between months (or weeks, in the
  week planner). They are printed only while the swipe is left/right, which is
  the way they point.
- **View switcher** in the top bar toggles Month grid / Week planner / Day
  list — and every press of it jumps back to today, including a press on the
  view you are already in. The day list opens the current month at the week
  you are in.
- **Calendar switcher** (top left) keeps separate calendars in the same app:
  one for home, one for work, each with its own notes in the same storage
  backend.
- **Settings (cogwheel)**: a tabbed dialog — country (UK / Sweden), language
  (English / Swedish), week numbers and name days on/off, which holiday eves
  you work, the month cell's layout, which way a swipe turns the page,
  crossing off the days that have passed, a
  face per part of a day (date, holiday, name days, your text), a size per
  part of a day (small / medium / large, plus dynamic for your own text,
  each with a sample beside the buttons), the theme,
  storage backend, import / export, developer mode, and logs. Look changes
  preview live behind the dialog and are kept with Save; Cancel drops them.

## Configuration

All configuration is optional build-time environment (`.env`, see
[`.env.example`](.env.example)):

| Variable                  | Purpose                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `VITE_DROPBOX_APP_KEY`    | Dropbox PKCE app key; unset hides the Dropbox backend        |
| `VITE_GOOGLE_CLIENT_ID`   | Google OAuth client id; unset hides the Google Drive backend |
| `VITE_DROPBOX_APP_FOLDER` | Dropbox app-folder name (default `nird-calendar`)            |
| `VITE_GDRIVE_APP_FOLDER`  | Drive folder name (default `Calendar`)                       |
| `VITE_BASE`               | Deploy base path (set by CI; default `/`)                    |

See [`docs/configuration.md`](docs/configuration.md).

## Deployment

The app is deployed to GitHub Pages under three slots on one domain: `/` (the
latest release), `/preview/` (current `main`), and `/branch/` (a feature branch
a maintainer parks there for review). Releases are cut by dispatching the
`release` workflow, which sizes the bump from the changelog fragments in
`.changes/unreleased/`, collates them into `CHANGELOG.md`, tags, and deploys.
See [`docs/deployment.md`](docs/deployment.md).

## Examples

[`examples/`](examples/) contains a sample calendar document
(`calendar-document.json`) in the exact shape the app stores — useful for
seeding a storage backend by hand or inspecting the format.

## Troubleshooting

- **`npm install` fails with 401 on `@niclaslindstedt/oss-framework`** — your
  `~/.npmrc` lacks a `read:packages` token for `npm.pkg.github.com`.
- **The Dropbox / Google Drive backends don't appear in Settings → Storage** —
  the corresponding `VITE_*` env var wasn't set at build time.
- **"Local folder" backend is missing** — it needs the File System Access API
  (Chromium browsers only).

More in [`docs/troubleshooting.md`](docs/troubleshooting.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Storage & sync](docs/storage.md)
- [Deployment & releases](docs/deployment.md)
- [Calendars (keeping several)](docs/features/calendars.md)
- [Locale packs (adding a country)](docs/features/locales.md)
- [Troubleshooting](docs/troubleshooting.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). This repo conforms to
[`OSS_SPEC.md`](OSS_SPEC.md); run the
[validate script](https://github.com/niclaslindstedt/oss-spec/blob/main/scripts/validate.sh)
before opening a PR.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) © Niclas Lindstedt

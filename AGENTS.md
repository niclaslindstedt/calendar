# Agent guidance for calendar

This file is the canonical source of truth for AI coding agents working in this
repo. `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `GEMINI.md`, and
`.github/copilot-instructions.md` are symlinks to this file.

## OSS Spec conformance

This repository adheres to [`OSS_SPEC.md`](OSS_SPEC.md), a prescriptive
specification for open source project layout, documentation, automation, and
governance. A copy of the spec lives at the repository root so contributors and
AI agents can consult it without leaving the repo.

Run `oss-spec validate .` (or the standalone
[`validate.sh`](https://github.com/niclaslindstedt/oss-spec/blob/main/scripts/validate.sh))
to verify conformance. When in doubt about a layout, naming, or workflow
decision, consult the relevant section of `OSS_SPEC.md` — it is the source of
truth for the conventions this repo follows.

## Build and test commands

```sh
make install       # npm install (needs GitHub Packages auth — see below)
make build         # production build (vite build)
make test          # full test suite (vitest)
make lint          # eslint + tsc --noEmit
make fmt           # prettier --write
make fmt-check     # verify formatting (CI)
make icons         # regenerate the PWA icons + og image from the app mark
make bump          # print the semver bump the fragments imply (read-only)
make changelog VERSION=X.Y.Z   # preview a release's CHANGELOG section
```

The `@niclaslindstedt/oss-framework` dependency comes from the **GitHub
Packages** npm registry (see `.npmrc`). GitHub Packages requires auth even for
public packages, so local installs need a `read:packages` token in `~/.npmrc`
(`//npm.pkg.github.com/:_authToken=<token>`); CI authenticates with the
workflow's `GITHUB_TOKEN`.

### Dependency install in web sessions

Claude Code on the web runs `.claude/hooks/session-start.sh` on `SessionStart`
(wired up in `.claude/settings.json`), so **dependencies install automatically
in the background**. The hook resolves a GitHub Packages token from the
environment (`NODE_AUTH_TOKEN` / `GITHUB_PAT` / `GH_TOKEN` / `GITHUB_TOKEN`,
first wins), writes it to `~/.npmrc`, and runs `npm install` — the committed
project `.npmrc` stays token-free. It runs in **async** mode, so
`node_modules` may still be populating for a moment after the session opens;
if a `make` target fails on a missing dependency, wait and retry.

## Commit and PR conventions

- All commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- PRs are squash-merged; the **PR title** becomes the single commit on `main`,
  so it must follow conventional-commit format.
- Breaking changes use `<type>!:` or a `BREAKING CHANGE:` footer.
- **A PR that changes user-visible behaviour ships a changelog fragment** in
  `.changes/unreleased/` (see "Releases and changelog" below). The `changeset`
  CI job enforces this; opt out with the `no-changelog` label. The changelog
  and the semver bump are derived from those fragments, **not** from the
  commit stream.

### Watching a PR after you open it

Don't babysit a PR with polling. **Do not** schedule `send_later`, cron jobs,
`ScheduleWakeup`, or timed self-check-ins to re-check CI or merge state — those
just burn turns. Open the PR, confirm the checks you can see are green, then
stop. CI failures and review comments are delivered to the session as webhook
events, so you'll be woken when there's actually something to act on.

## Releases and changelog

### Deployment slots

The app is hosted on GitHub Pages under the custom domain
**calendar.niclaslindstedt.se** (set by `public/CNAME`, which Vite copies into
every build; the Pages workflow keeps a single CNAME at the root of the
artifact). `.github/workflows/pages.yml` assembles up to three slots into one
Pages artifact in a single run (OSS_SPEC §11.5):

- `/` — the highest released `v*` tag. Before the first release exists, `main`
  is served here instead and there is no `/preview/` slot.
- `/preview/` — the current `main`. Every push to `main` rebuilds it.
- `/branch/` — an opt-in slot for a feature branch, on a URL that never
  changes so a reviewer's install survives the swap. A maintainer dispatches
  `pages.yml` with a `branch_ref`; the build is force-pushed to the
  auto-managed `branch-deploy` orphan branch and rehydrated into every
  subsequent deploy until the next dispatch overwrites it. Delete
  `branch-deploy` to clear the slot.

The base path each slot is built with comes from `VITE_BASE` (`/`,
`/preview/`, `/branch/`). Everything that must differ per slot is derived from
that one value in **`src/app/slot.ts`** — do not re-derive it elsewhere:

- the precache cache id (`cacheIdForBase`), so the slots never poison each
  other's precache;
- the manifest `id` / `scope` / `start_url` and the installed app's name, so
  the three install as separate apps (§11.4.8);
- the `robots` meta — only production is indexed, `/preview/` and `/branch/`
  ship `noindex,nofollow` (and `public/robots.txt` disallows both paths);
- the service worker's **navigation denylist**: the production worker is
  scoped at `/`, which spans the other slots too, so without the denylist a
  PWA installed from `/preview/` would silently be served the production
  shell;
- the build label's slot suffix (`pre`, `br-<branch>`), shown in
  Settings → Developer → Build alongside the slot and the parked source
  branch.

> **Storage caveat.** All three slots share one origin and `localStorage` is
> per-origin (not per-path), so `/preview/` and `/branch/` read and write the
> **same** calendar document as production. Namespace the storage keys by base
> path before using the secondary slots for destructive testing.

### Cutting a release

Releases are manual to _trigger_ but automatic to _size_: dispatch
`.github/workflows/release.yml` (`workflow_dispatch` only) and leave `bump` on
its `auto` default. There is deliberately **no separate version-bump
workflow** — the bump is a function of the fragments, derived by
`scripts/release/compute-bump.mjs`, taking the **highest** level any fragment
implies:

- `patch` — only `Fixed` / `Security` fragments.
- `minor` — any `Added` / `Changed` / `Removed` / `Deprecated` fragment.
- `major` — any fragment flagged `breaking: true`: a change to the persisted
  `CalendarDoc` shape that `src/app/migrations.ts` can't carry forward, or a
  deliberate UX overhaul. A genuinely breaking removal is `type: Removed`
  **plus** `breaking: true`, not `Removed` alone.

Set `bump` to an explicit `patch` / `minor` / `major` on dispatch only to
override that derivation; preview it locally with `make bump` (read-only).

The workflow then collates `.changes/unreleased/` into a dated `CHANGELOG.md`
section, bumps `package.json`, tags `vX.Y.Z`, publishes a GitHub Release whose
body is that section, and chains into `pages.yml` so the tag is served at `/`
immediately rather than waiting for the next push. Preview the changelog
locally with `make changelog VERSION=X.Y.Z` (it _consumes_ the fragments — run
on a scratch branch).

The optional `commit` input cuts a release from an earlier commit when `main`
has advanced past it: the release commit is built on that commit and **only
the tag** is pushed, leaving `main` untouched. Because production is resolved
from the highest semver tag rather than the nearest reachable one, that
release is still what `/` serves.

### Changeset fragments

When a PR introduces a **user-visible** change, drop a small markdown file in
`.changes/unreleased/<unix-ts>-<slug>.md`:

```
---
type: Added
title: Short title
doc: locales        # optional
breaking: true      # optional — forces a major release bump
---

One sentence users will read in the changelog.
```

`type:` is one of `Added | Changed | Fixed | Removed | Security | Deprecated`
(Keep a Changelog). `title:` (optional) is a short noun phrase bolded at the
head of the bullet; the body is a **one-sentence** summary. `doc:` (optional,
big features only) is the slug of a feature doc at `docs/features/<slug>.md` —
the collator appends `[Learn more](feature:<slug>)`; create the doc in the
same PR. The timestamp filename prefix keeps the lexical sort deterministic so
collation roughly mirrors commit order.

Parsing and validation are shared by the collator and the bump-computer
(`scripts/release/fragments.mjs`), so a fragment that collates is the same
fragment the bump was computed from — an unknown `type:`, a malformed line, or
an empty body fails the release run loudly. The `changeset` job in `ci.yml`
enforces a fragment per PR; pure refactors, CI/build/test tweaks and docs-only
edits pass via the skip-list in `scripts/release/check-changeset.mjs` — extend
it when adding new "obviously not user-visible" path patterns.

## Architecture summary

This is a **frontend-only, local-first PWA** — there is no server. It is built
on [`oss-framework`](https://github.com/niclaslindstedt/oss-framework) (same
adoption seam as the sibling `contacts` app; see the framework's
`demo/ADOPTION.md`).

The framework owns the UI kit and generic mechanics: components, modals, the
theme engine, storage adapters (localStorage / local folder / Dropbox /
Google Drive), the i18n runtime, logging, calendar date math
(`buildMonthGrid`, `isoWeek`, `DayKey`), and the PWA update state machine.

### The renderer is Preact

`preact` is the only renderer dependency — **never add `react` or `react-dom`
back.** `@preact/preset-vite` compiles JSX against `preact/jsx-runtime` and
aliases `react` / `react-dom` (and their `/jsx-runtime` + `/client` subpaths)
onto `preact/compat`; `tsconfig.json` `paths` and `package.json` `overrides`
mirror that for `tsc` and npm. App code keeps importing hooks and types from
`"react"`, which is the supported compat path; only `src/main.tsx` uses
Preact's own `render`. Two differences bite in new code: use `e.currentTarget`
rather than `e.target` in event handlers, and spell string-valued attributes
like SVG's `focusable` as `"false"` rather than a JSX boolean.

The app owns the domain and the stores ("store stays in the app"):

- `src/app/types.ts` — the `CalendarDoc` model: `entries` keyed by `DayKey`
  (`"YYYY-MM-DD"`), plain text per day.
- `src/app/locale/` — the **country packs** (en-GB, sv-SE): start of week,
  week numbers, name days, month/weekday names. Each pack is one
  self-contained file so a new country is a copy-paste + register. **Keep it
  that way** — no cross-imports between packs, no country conditionals
  outside this folder.
- `src/app/i18n/` — UI strings (framework `createI18n`); `en.ts` is the
  catalog's type source, `sv.ts` must satisfy it.
- `src/app/useCalendarStore.ts` — the document store over the framework's
  storage adapters (debounced save, migrations, offline cache). Which
  document it holds is (backend, namespace); a change to either flushes any
  pending save and loads the other one.
- `src/app/useNamespaces.ts` — the **namespace** registry and the active
  pointer, over the framework's `namespaces` module ("store stays in the
  app"). A namespace is a whole separate calendar: same backend, same
  settings, its own document. The registry is device-local; the documents
  sync. See `docs/features/namespaces.md`.
- `src/app/storage/` — backend registry + connect flows + the developer-mode
  demo-data adapter (`demoAdapter.ts`, an in-memory `StorageAdapter` with
  static data). `paths.ts` is the one place that turns a namespace slug into
  a storage location — pure and tested, because the **default** namespace has
  to keep the un-suffixed names a pre-namespace calendar was written under.
- `src/app/MonthGridView.tsx`, `WeekPlannerView.tsx`, `DayListView.tsx` — the
  three views; `DayEntry.tsx` is the shared click-to-type entry surface with
  the auto-shrinking text. `entryFont.ts` owns the pre-layout sizing curve and
  the three fixed steps; `entryFit.ts` measures that guess against the box the
  view actually left (shrink to fit, clamp an overrun to an ellipsis, refuse
  the keystroke that would overflow a full day). A view says which it is with
  `DayEntry`'s `bounded` prop — set where the surface clips (month cells, week
  rows, a fixed-height day-list row), clear where the row grows with its
  text.
- `src/app/textSize.ts` — how big the almanac's _own_ pieces are printed (the
  date, a holiday's name, the day's names, the week number). Each is a scale
  of the measured default rather than a px value, published to `<html>` as one
  CSS variable per piece (`App.tsx`) and multiplied by the site's own base
  size in `src/styles.css` (`.cal-size-*`, which read a `--cal-base` set at
  the call site). Your own text is not one of them — it is sized by
  `entryFont.ts` against the room a view leaves it.
- `src/app/monthImage.ts` — the month-image seam. Returns `null` today;
  yearly image packs (2026, 2027, …) plug in here later, with a `large`
  (month view) and `small` (day list) variant per month.
- `src/output.ts` — the §19.4 central output module (semantic log helpers
  over the in-app log store).
- `pwa-plugin.ts` — emits the service worker + version/precache manifests the
  framework's `usePwaUpdate` consumes; shares the cache-id convention with
  `src/app/pwa.ts` — change them together.

Dependency direction: views → stores → framework. Nothing imports from the
framework's internals — only its published subpaths.

### Reach for the framework first

Before building any UI primitive, gesture, or generic mechanic, **check
whether `@niclaslindstedt/oss-framework` already ships it**. Its `.d.ts`
files under `node_modules/@niclaslindstedt/oss-framework/dist/**` list every
export. Only build app-local UI when the framework genuinely has no fit.

### Keep the framework current

Before starting a task, check the newest release with
`npm view @niclaslindstedt/oss-framework version`, bump the `package.json`
range if a newer one exists, reinstall, and work against that.

## Where new code goes

| Change type      | Goes in                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| New feature      | `src/app/...`                                                             |
| New country pack | `src/app/locale/<bcp47>.ts` + register in `src/app/locale/index.ts`       |
| Tests            | `tests/...`                                                               |
| Docs update      | `docs/...`                                                                |
| Examples         | `examples/...`                                                            |
| LLM prompt       | `prompts/<name>/<major>_<minor>_<patch>.md` (see `prompts/README.md`)     |
| Changelog entry  | `.changes/unreleased/<unix-ts>-<slug>.md` (never `CHANGELOG.md` directly) |

## Portrait mobile is the primary target

This is a phone-first PWA — most people open it one-handed, in **portrait**,
installed to the home screen. A desktop browser at 1400 px wide will hide
every layout bug that actually matters here, so **any change that touches
layout, chrome, spacing, or typography is not done until it has been looked at
in a portrait phone viewport.** That includes changes that "obviously" only
affect one view: the three views share the top menu, the period heading, and
the layout constants in `src/app/layout.ts`.

### How to verify

Drive the dev server with Playwright (Chromium is preinstalled at
`/opt/pw-browsers/chromium`; do **not** run `playwright install`) and
screenshot each view:

```js
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 }, // iPhone 15/16 portrait
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark", // and again with "light"
  locale: "sv-SE", // and again with "en-GB"
});
```

Check **all three views** (month, week, day list) in **both themes** and
**both country packs** — the packs differ in whether week numbers and name
days are on, which changes the column count in the day list and the grid
template in the month view. Screenshot, then _look at the screenshot_; do not
infer from the diff.

### What to check

- **Nothing overflows or overlaps.** 393 px is the budget. The top menu is the
  usual casualty — a label that wraps to two lines there (or a control that
  slides under the cogwheel) is a bug, not a cosmetic nit.
- **No dead gutters.** A fixed-width column that is empty under the current
  settings must not be rendered at all — an always-reserved `w-7` week gutter
  is 36 px of wasted left margin on every row when week numbers are off.
- **Nothing meaningful is truncated, and no word is split.** A month cell is
  47 px wide in portrait. `truncate` there renders a name day as "B…";
  `break-words` is barely better, because it splits eagerly against whatever
  is left on the current line ("Mart" / "a") and strands the comma of
  `"Bernhard, Bernt"` at the head of line two. The month cell's answer is to
  **float** the date so short text flows beside it and long text drops below,
  and to leave `overflow-wrap` at its default so a word that doesn't fit
  moves down whole. That only works while every value fits a full line, so
  **the shipped font size is a measured constant, not a taste call** — measure
  with `canvas.measureText` over the real strings (`src/app/locale/*.ts`) in
  the cell's computed font before changing it. Today: 7.5 px on the 45.8 px
  line a band gets at 393 px, widest name "Bartolomeus" at 42.1 px. The reader
  can scale that default (Settings → Calendar → Text size), which is the one
  sanctioned way past it: the measurement is what the cell _ships_ at, so it
  stays the ladder's middle stop and the default.
- **A soft hyphen is an opportunity, and a greedy line breaker takes the last
  one that fits.** So `hyphenate` only seeds them into words that cannot fit a
  caption line whole (`MIN_HYPHENATED_LETTERS`, also measured): a name carrying
  hyphens it does not need gets split to top up the line before it, and
  "Elsa, Isa-bella" is wrong where "Elsa," / "Isabella" is right. Re-measure
  the constant with the font. The band does not grow with the size setting, so
  the _threshold_ is derived from the live scale
  (`minHyphenatedLetters`) rather than taken as the constant — a month cell on
  Large breaks "Henri-etta" where one on Medium leaves it whole.
- **The month cell's arrangement is a setting, not a layout.** Which corner
  holds the number, the holiday and the name days comes from
  Settings → Calendar; `MonthCellFrame` (`src/app/monthCell.tsx`) is the one
  place that turns those choices into bands, and the settings preview renders
  through it too — so a change there has to be checked in both.
- **Touch targets are ≥ 36 px square** (`h-9 w-9`), the sibling `notes` app's
  header-action size.
- **The safe areas are respected.** The top menu's vertical padding lives in
  `.cal-topbar` (`src/styles.css`): it adds `env(safe-area-inset-top)` on top
  of its own padding everywhere _except_ an installed iOS PWA, where the inset
  is the whole status-bar band and already clears the island — there it takes
  the `max()` of the two instead, so the island-to-buttons gap matches the
  buttons-to-hairline gap rather than reading as double it. Every view's
  bottom gutter is `CONTENT_BOTTOM_PAD` (`src/app/layout.ts`), which is a
  handle on `--cal-bottom-gutter` in the same stylesheet — the value has to
  live there because the installed iOS PWA needs a different one and only a
  media query knows it is one. **On iOS the bottom inset is not evidence.**
  The gutter has shipped twice derived from `env(safe-area-inset-bottom)` and
  twice the bottom row still came out under the swipe bar, so the iOS value
  takes the larger of the inset and the 34 px an iPhone's home indicator
  occupies and adds the clear margin on top. Settings → Developer → Device
  prints what a device actually reports — quote that rather than reasoning
  about it.
- **The month grid still fills exactly one screen** — six week rows, no
  scrollbar, nothing clipped.

Landscape and desktop must not be _broken_, but portrait is what gets
optimised when the two pull against each other.

## Test conventions

- **All tests live in separate files** in `tests/` — never inline in source
  files.
- Test files are named with a `_test` suffix (e.g. `locale_test.ts`), per §20
  of `OSS_SPEC.md`; vitest picks up `tests/**/*_test.ts`.
- Tests cover the pure domain modules (locale packs, entry text sizing,
  migrations, demo data, i18n catalog parity) and run in a node environment —
  no DOM.

## Source file size

- Non-test source files must stay under **1000 physical lines** (§20.5 of
  `OSS_SPEC.md`). Prefer splitting by concern over relaxing the cap.
- A file may opt out with `oss-spec:allow-large-file: <reason>` in its first
  20 lines; the reason must be real.

## Documentation sync points

| When you change…                    | Update…                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| the document model / migrations     | `docs/storage.md`, `tests/migrations_test.ts`                                                               |
| locale packs / name days            | `docs/features/locales.md`, `tests/locale_test.ts`                                                          |
| storage backends                    | `docs/storage.md`, `docs/configuration.md`                                                                  |
| namespaces / where a document lives | `docs/features/namespaces.md`, `docs/storage.md`, `docs/configuration.md`, `tests/namespace_paths_test.ts`  |
| settings surface                    | `docs/getting-started.md`                                                                                   |
| user-visible features               | a fragment in `.changes/unreleased/` (the changelog is collated from those at release time); update `docs/` |
| deployment slots / hosting          | `docs/deployment.md`, `tests/slot_test.ts`                                                                  |
| the release flow / fragments        | this file's "Releases and changelog", `docs/deployment.md`, `tests/changeset_test.ts`                       |

## Website staleness

The app **is** the website (§11.2): `pages.yml` builds one `dist/` per
deployment slot and deploys the merged tree to
**calendar.niclaslindstedt.se**. There is no separate `website/` tree to keep
in sync — but `index.html`'s SEO head (title, description, canonical,
OG/Twitter/JSON-LD) and `public/` (CNAME, robots.txt, sitemap.xml, llms.txt,
og.png) must be kept truthful as features change. The canonical URL, the
sitemap `<loc>`, robots' `Sitemap:` line, and `public/CNAME` must all name the
same host — `scripts/check-seo.mjs` fails the `seo` workflow if they drift
apart, so change them together.

## Maintenance skills

Per §21 of `OSS_SPEC.md`, this repo ships agent skills for keeping drift-prone
artifacts in sync with their sources of truth. Skills live under
`.agent/skills/<name>/` and are also accessible via the `.claude/skills`
symlink.

| Skill           | When to run                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `maintenance`   | When several artifacts have likely drifted at once — umbrella skill that runs every `update-*` skill in the correct order. |
| `update-docs`   | After any change to user-visible behavior, configuration keys, or the storage/locale surface.                              |
| `update-readme` | After any change that alters user-visible behavior, commands, or install instructions.                                     |

Each skill has a `SKILL.md` (the playbook) and a `.last-updated` file (the
baseline commit hash). The `maintenance` skill owns a **Registry** table
listing every `update-*` skill — add a row whenever you create a new sync
skill.

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
- The release pipeline (`version-bump.yml` → `release.yml`) derives the next
  semver and the changelog from the commit stream — write subjects users can
  read.

### Watching a PR after you open it

Don't babysit a PR with polling. **Do not** schedule `send_later`, cron jobs,
`ScheduleWakeup`, or timed self-check-ins to re-check CI or merge state — those
just burn turns. Open the PR, confirm the checks you can see are green, then
stop. CI failures and review comments are delivered to the session as webhook
events, so you'll be woken when there's actually something to act on.

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
  storage adapters (debounced save, migrations, offline cache).
- `src/app/storage/` — backend registry + connect flows + the developer-mode
  demo-data adapter (`demoAdapter.ts`, an in-memory `StorageAdapter` with
  static data).
- `src/app/MonthGridView.tsx`, `WeekPlannerView.tsx`, `DayListView.tsx` — the
  three views; `DayEntry.tsx` is the shared click-to-type entry surface with
  the auto-shrinking text (`entryFont.ts` owns the sizing curve).
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

| Change type      | Goes in                                                               |
| ---------------- | --------------------------------------------------------------------- |
| New feature      | `src/app/...`                                                         |
| New country pack | `src/app/locale/<bcp47>.ts` + register in `src/app/locale/index.ts`   |
| Tests            | `tests/...`                                                           |
| Docs update      | `docs/...`                                                            |
| Examples         | `examples/...`                                                        |
| LLM prompt       | `prompts/<name>/<major>_<minor>_<patch>.md` (see `prompts/README.md`) |

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

| When you change…                | Update…                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| the document model / migrations | `docs/storage.md`, `tests/migrations_test.ts`                                                        |
| locale packs / name days        | `docs/features/locales.md`, `tests/locale_test.ts`                                                   |
| storage backends                | `docs/storage.md`, `docs/configuration.md`                                                           |
| settings surface                | `docs/getting-started.md`                                                                            |
| user-visible features           | `CHANGELOG.md` is generated from commits — write a clear conventional-commit subject; update `docs/` |

## Website staleness

The app **is** the website (§11.2): `pages.yml` builds `dist/` with the Pages
base path and deploys it. There is no separate `website/` tree to keep in
sync — but `index.html`'s SEO head (title, description, OG/Twitter/JSON-LD)
and `public/` (robots.txt, sitemap.xml, llms.txt, og.png) must be kept
truthful as features change.

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

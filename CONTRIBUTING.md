# Contributing to calendar

Thanks for your interest! This document describes how to set up a dev
environment, the conventions we follow, and how to get a change merged.

## Prerequisites

- Node.js ≥ 22 (CI pins 24 — see `.nvmrc`), npm ≥ 10
- A GitHub personal access token with `read:packages` in `~/.npmrc` — the
  `@niclaslindstedt/oss-framework` dependency resolves from GitHub Packages
  (see the README's Install section)

## Getting the source

```sh
git clone https://github.com/niclaslindstedt/calendar.git
cd calendar
npm install
```

## Build, test, lint

```sh
make build
make test
make lint
make fmt-check
```

## Development workflow

1. Fork the repo.
2. Create a topic branch: `git checkout -b feat/<slug>` or `fix/<slug>`.
3. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   <type>(<scope>): <summary>
   ```
   Types: `feat`, `fix`, `perf`, `docs`, `test`, `refactor`, `chore`, `ci`,
   `build`, `style`. Breaking changes: `<type>!:` or `BREAKING CHANGE:` footer.
4. If the change is **user-visible**, add a changelog fragment (below).
5. Open a PR. The **PR title** must be conventional-commit format because we
   squash-merge and that title becomes the commit message on `main`.
6. CI must be green and at least one reviewer must approve.

## Changelog fragments

`CHANGELOG.md` is never edited by hand: it is collated at release time from
small fragments, and the semver bump is derived from them too. A PR that
changes what users see adds one file:

```
.changes/unreleased/1786400010-week-numbers-toggle.md

---
type: Added
title: Week numbers toggle
---

Week numbers can be switched off in Settings → Calendar.
```

`type` is one of `Added | Changed | Fixed | Removed | Security | Deprecated`
(Keep a Changelog); `title` is optional; the body is one sentence a user will
read. Add `breaking: true` when an older build can't survive the change — it
forces a major release.

The `changeset` CI job requires a fragment on any PR touching user-visible
code. Pure refactors, CI/build tweaks, tests and docs pass automatically via
the skip-list in `scripts/release/check-changeset.mjs`; anything else that is
genuinely invisible can be opted out with the `no-changelog` label. Preview
what your fragments imply with `make bump` and
`make changelog VERSION=X.Y.Z`. More in
[`docs/deployment.md`](docs/deployment.md).

## Tests

Tests live in `tests/` with a `_test` suffix (OSS_SPEC §20.2) and cover the
pure domain modules — the locale packs, the month/week builders, entry text
sizing, migrations, and the demo-data backend. Run one file with
`npx vitest run tests/locale_test.ts`. UI changes should keep the boot smoke
path working: `npm run build && npm run preview` and click through adding an
entry to a day.

## Documentation

If your change touches user-visible behavior, update the relevant `docs/`
topic and the README quick start. See `AGENTS.md` for the full sync table.

## Adding a country/locale pack

Locale packs are deliberately self-contained: copy `src/app/locale/sv-se.ts`
(or `en-gb.ts`), rename, fill in the fields (week start, week numbers, name
days, month/weekday names), and register it in `src/app/locale/index.ts`.
Nothing else needs to change. See `docs/features/locales.md`.

## Governance

This is a single-maintainer project: [@niclaslindstedt](https://github.com/niclaslindstedt)
merges PRs and makes final decisions. Disputes are resolved in the PR thread;
sustained, high-quality contributions are the path to being invited as a
maintainer. If the project is abandoned, the license permits noncommercial
forks — open an issue first so a successor can be blessed.

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

See [SECURITY.md](SECURITY.md). Do **not** open public issues for security
problems.

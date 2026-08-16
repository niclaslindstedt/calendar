# Deployment & releases

Calendar is hosted on GitHub Pages at **<https://calendar.niclaslindstedt.se>**.
There is no server: a deploy is a static build of the app, and the app _is_ the
website (OSS_SPEC §11.2).

## The three slots

One Pages domain carries three builds at once, on disjoint path prefixes
(OSS_SPEC §11.5). All three are assembled by a single run of
`.github/workflows/pages.yml` and deployed as one artifact.

| Slot           | URL                                            | Built from                    | For                             | Indexed |
| -------------- | ---------------------------------------------- | ----------------------------- | ------------------------------- | ------- |
| **Production** | `https://calendar.niclaslindstedt.se/`         | the highest released `v*` tag | everyone                        | yes     |
| **Staging**    | `https://calendar.niclaslindstedt.se/preview/` | current `main`                | dogfooding the next release     | no      |
| **Branch**     | `https://calendar.niclaslindstedt.se/branch/`  | one parked feature branch     | reviewing a PR on a real device | no      |

Production is resolved from the **highest semver tag**, not from the nearest
reachable commit — a release cut from an earlier commit is still what `/`
serves, whatever `main` has done since. Until the first release tag exists,
`main` is served at `/` and there is no `/preview/` slot.

Deploys are triggered by:

- a push to `main` — rebuilds `/preview/` and re-emits `/` from the current
  release tag;
- the release workflow chaining in after it tags, so a release reaches `/`
  without waiting for the next push;
- a manual `workflow_dispatch`, which is also how a branch is parked (below).

### Parking a branch in `/branch/`

Dispatch the `pages` workflow with `branch_ref` set to the branch name. The
build is force-pushed to the auto-managed `branch-deploy` orphan branch, and
**every** later Pages run rehydrates `/branch/` from there — so ordinary
deploys and releases leave the parked build alone until the next dispatch
overwrites it. The URL never changes, only what sits behind it, which is what
lets an installed PWA on a reviewer's phone survive the swap. Delete the
`branch-deploy` branch to clear the slot.

### What differs between slots

Each slot is a complete, independently installable PWA. Everything that has to
differ is derived from the slot's base path in `src/app/slot.ts`:

- **Separate installs** — the manifest `id` / `scope` / `start_url` and the
  app name (`Calendar`, `Calendar pre`, `Calendar br`), so installing the
  preview doesn't overwrite the production tile.
- **Separate caches** — a per-slot service-worker precache id, so one slot's
  assets never end up served by another.
- **Separate navigation scope** — the production worker is scoped at `/`,
  which spans `/preview/` and `/branch/` too; it explicitly declines their
  navigations so a preview install can never be handed the production shell.
- **Indexability** — only production is indexable. The secondary slots ship
  `noindex,nofollow` and are disallowed in `robots.txt`; every slot's
  canonical URL points at production.
- **Build identity** — the build label carries a slot suffix (`pre`,
  `br-<branch>`), visible with the slot and source branch under
  Settings → Developer → Build.

> **Careful:** all three slots share one origin, and browser storage is
> per-origin, not per-path. The preview and branch slots read and write the
> **same** calendar document as production — don't use them for destructive
> testing.

### The custom domain

`public/CNAME` holds `calendar.niclaslindstedt.se`. Vite copies it into every
slot's build; the Pages workflow keeps exactly one copy, at the root of the
merged artifact, and fails the deploy if it is missing. The canonical URL in
`index.html`, the `<loc>` in `public/sitemap.xml`, the `Sitemap:` line in
`public/robots.txt` and that CNAME must all name the same host —
`scripts/check-seo.mjs` fails CI if they drift.

## Cutting a release

Dispatch `.github/workflows/release.yml` and leave `bump` on `auto`. There is
no separate version-bump workflow: the workflow

1. derives the semver bump from the changeset fragments in
   `.changes/unreleased/` (`breaking: true` → major; `Added` / `Changed` /
   `Removed` / `Deprecated` → minor; `Fixed` / `Security` → patch — the
   highest wins),
2. collates those fragments into a dated `CHANGELOG.md` section and deletes
   them,
3. bumps `package.json`, commits, tags `vX.Y.Z` and pushes,
4. publishes a GitHub Release whose body is that changelog section,
5. chains into the Pages workflow so `/` serves the new tag immediately.

Preview both halves locally before dispatching:

```sh
make bump                       # what the release would be sized as
make changelog VERSION=0.2.0    # what the CHANGELOG section would say
```

`make changelog` consumes the fragments, so run it on a scratch branch.

Set `bump` explicitly only to override the derivation. Set `commit` to release
from an earlier commit when `main` has moved on: the release commit is built
on that commit and only the tag is pushed, leaving `main` untouched —
reconciling `main` afterwards is the maintainer's job.

## Adding a changelog entry

Never edit `CHANGELOG.md` by hand. A PR with user-visible impact adds a
fragment instead:

```
.changes/unreleased/1786400010-week-numbers-toggle.md

---
type: Added
title: Week numbers toggle
---

Week numbers can be switched off in Settings → Calendar.
```

`type` is one of `Added | Changed | Fixed | Removed | Security | Deprecated`.
Add `breaking: true` when an older build can't survive the change. The
`changeset` CI job requires a fragment on any PR touching user-visible code;
label the PR `no-changelog` to opt a genuinely invisible change out.

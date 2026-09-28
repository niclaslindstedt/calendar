---
name: update-docs
description: "Use when docs/ may be stale. Discovers commits since the last docs update, maps changed source surfaces to their doc topics, and brings docs/ back into sync."
---

# Updating the docs

## Tracking mechanism

`.agents/skills/update-docs/.last-updated` contains the git commit hash from
the last successful run. Empty means "never run" — fall back to the initial
commit of the repository.

## Topic map

| Source surface                                                                                                         | Doc                             |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| views, editor, settings (`src/app/*.tsx`)                                                                              | `docs/getting-started.md`       |
| module layout, renderer, PWA plumbing                                                                                  | `docs/architecture.md`          |
| env vars (`.env.example`, `vite.config.ts`)                                                                            | `docs/configuration.md`         |
| storage backends, document model, migrations                                                                           | `docs/storage.md`               |
| locale packs (`src/app/locale/`)                                                                                       | `docs/features/locales.md`      |
| month images seam (`src/app/monthImage.ts`)                                                                            | `docs/features/month-images.md` |
| failure modes users hit                                                                                                | `docs/troubleshooting.md`       |
| deploy slots, release flow, fragments (`.github/workflows/{pages,release}.yml`, `scripts/release/`, `src/app/slot.ts`) | `docs/deployment.md`            |

## Discovery process

1. Read the baseline and list commits since (same shape as `update-readme`).
2. For each commit touching a surface in the topic map, re-read the source and
   verify the doc still describes reality — settings names, backend labels,
   file names, env vars.
3. Rewrite only what drifted; keep each doc scoped to its topic.
4. Write the current HEAD hash to `.last-updated` and commit both together
   (`docs: …`).

## Update checklist

- [ ] Read the baseline from `.last-updated` and list the commits since
- [ ] Walk the topic map and read every affected doc
- [ ] Update each doc in place, scoped to its topic
- [ ] Check the cross-links between docs, and from the README, still resolve
- [ ] Run `make fmt-check` and `make test`
- [ ] Write the new baseline:

      git rev-parse HEAD > .agents/skills/update-docs/.last-updated

## Verification

1. Re-read every edited section against the current source: settings names,
   backend labels, file names and env vars match the code.
2. Every internal link resolves.
3. `.last-updated` was rewritten.

## Skill self-improvement

1. **Grow the topic map** with any source → doc relationship you discovered.
2. **Record recurring patterns** you had to invent.
3. **Commit the skill edit** alongside the docs change.

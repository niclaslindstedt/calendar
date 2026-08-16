---
name: update-docs
description: "Use when docs/ may be stale. Discovers commits since the last docs update, maps changed source surfaces to their doc topics, and brings docs/ back into sync."
---

# Updating the docs

**Governing spec sections:** §11.1 (`docs/` — required topics), §21.5 (this
skill is mandated because `docs/` is a drift-prone artifact).

## Tracking mechanism

`.agent/skills/update-docs/.last-updated` contains the git commit hash from
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

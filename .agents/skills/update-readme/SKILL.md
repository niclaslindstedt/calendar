---
name: update-readme
description: "Use when README.md may be stale. Discovers commits since the last README update, identifies what user-facing surfaces changed, and brings README.md back into sync."
---

# Updating the README

`README.md` is the primary user-facing documentation for calendar. It keeps
its sections (What it is / Why / Prerequisites / Install / Quick start / Usage
/ Configuration / Deployment / Native app / Examples / Troubleshooting /
Documentation / Contributing / License) truthful. It goes stale whenever a
view, setting, storage backend, locale pack, or env variable changes without
a matching edit.

## Tracking mechanism

`.agents/skills/update-readme/.last-updated` contains the git commit hash from
the last successful run. Empty means "never run" — fall back to the initial
commit of the repository.

## Discovery process

1. Read the baseline:

   ```sh
   baseline=$(cat .agents/skills/update-readme/.last-updated)
   git log --oneline "${baseline:-$(git rev-list --max-parents=0 HEAD)}"..HEAD
   ```

2. For each commit, decide whether it changed a user-facing surface: the
   settings modal (`src/app/settings*`), the views (`src/app/*View.tsx`),
   the storage registry (`src/app/storage/`), the locale packs
   (`src/app/locale/`), env variables (`.env.example`, `vite.config.ts`),
   or the npm scripts / Makefile targets.

3. Update the matching README sections. Keep the tone: short, concrete, no
   marketing filler. The Usage section must describe what a user actually
   clicks.

4. Write the current HEAD hash to `.last-updated` and commit both together
   (`docs(readme): …`).

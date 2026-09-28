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

## Mapping table

| Changed path                                          | README section                      |
| ----------------------------------------------------- | ----------------------------------- |
| `src/app/*View.tsx`, the editor, `src/app/settings*`  | Usage, Quick start                  |
| `src/app/storage/`                                    | What it is, Usage, Configuration    |
| `src/app/locale/`                                     | What it is, Usage                   |
| `.env.example`, `vite.config.ts`, `src/vite-env.d.ts` | Configuration                       |
| `package.json` scripts, `Makefile`, `.nvmrc`          | Prerequisites, Install, Quick start |
| `.github/workflows/pages.yml`, `src/app/slot.ts`      | Deployment                          |
| `native/`                                             | Native app (iOS & Android)          |
| `examples/`                                           | Examples                            |
| `docs/` (a page added, moved or renamed)              | Documentation                       |
| `docs/troubleshooting.md`                             | Troubleshooting                     |

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

## Update checklist

- [ ] Read the baseline from `.last-updated` and list the commits since
- [ ] Walk the mapping table for every changed path
- [ ] Update each affected section in place, keeping the section order
- [ ] Check every link in the README still resolves (docs, examples, badges)
- [ ] Run `make fmt-check`
- [ ] Write the new baseline:

      git rev-parse HEAD > .agents/skills/update-readme/.last-updated

## Verification

1. Every command in Install and Quick start runs as written on a fresh
   checkout.
2. Every setting, backend and locale the README names exists in the app, and
   nothing the app ships is missing from Usage.
3. `.last-updated` was rewritten.

## Skill self-improvement

1. **Grow the mapping table** with any changed path → section relationship
   you had to discover by hand.
2. **Keep the section list true** when a README section is added or renamed.
3. **Commit the skill edit** alongside the README change.

---
name: maintenance
description: "Use when you want to bring every drift-prone artifact in the repo back into sync. Dispatches to all individual update-* skills in the correct order, aggregates their results, and leaves a single combined change ready to review."
---

# Maintenance

This is the umbrella skill for calendar, mandated by §21.6 of `OSS_SPEC.md`.
It does no rewriting itself — it decides which sync skills are stale, runs
each one, and reports a combined summary. Use it when you do not know which
specific artifact is out of date, or when several have likely drifted at once
(for example, after a large merge).

## When to run

- After a big merge from the default branch when you are not sure which
  surfaces moved.
- On a cadence (weekly / before a release) as a "drift sweep".
- When CI flags a staleness check but it is unclear which skill to invoke.

Do **not** use this skill for a targeted fix — if you know exactly which
artifact is stale, call the corresponding `update-*` skill directly.

## Registry

The registry is the single source of truth for which sync skills exist in this
repo. Every `update-*` directory under `.agent/skills/` must appear here
exactly once. Add rows whenever you create a new sync skill.

| Skill           | Fixes                                  | Spec sections | Run order |
| --------------- | -------------------------------------- | ------------- | --------- |
| `update-docs`   | `docs/*.md` vs. source of truth        | §11.1         | 1         |
| `update-readme` | `README.md` vs. current public surface | §3            | 2         |

Run order matters: docs first (they are the deeper source README summarizes),
then the README.

## Process

1. For each registry row in run order, read that skill's `.last-updated`
   baseline and `git log --oneline <baseline>..HEAD` to decide whether its
   watched surface changed.
2. Run each stale skill's playbook.
3. Update each run skill's `.last-updated` to the current HEAD hash.
4. Summarize what changed in one place (the PR body or the commit message).

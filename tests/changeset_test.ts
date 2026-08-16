// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The release-sizing brain. The release workflow runs `compute-bump.mjs` with
// `bump: auto` and trusts the single word it prints on stdout to pick
// patch/minor/major, then hands the same fragments to `collate-changelog.mjs`
// to write the CHANGELOG section. These tests drive the real scripts the way
// the workflow does — in a temp working directory holding fragment files — so
// the stdout contract, the type→bump mapping, and the rendered bullet shape
// stay locked down.
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPTS = join(process.cwd(), "scripts", "release");
const CHANGELOG_STUB = `# Changelog\n\n## [Unreleased]\n\n## [0.1.0] - 2026-01-01\n\n### Added\n\n- Something older.\n`;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "changeset-"));
  mkdirSync(join(dir, ".changes", "unreleased"), { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function fragment(name: string, front: string, body = "A change."): void {
  writeFileSync(
    join(dir, ".changes", "unreleased", name),
    `---\n${front}\n---\n\n${body}\n`,
  );
}

function run(script: string, args: string[] = []): string {
  return execFileSync("node", [join(SCRIPTS, script), ...args], {
    cwd: dir,
    encoding: "utf8",
  }).trim();
}

describe("compute-bump", () => {
  it("maps Fixed/Security fragments to patch", () => {
    fragment("1-a.md", "type: Fixed");
    fragment("2-b.md", "type: Security");
    expect(run("compute-bump.mjs")).toBe("patch");
  });

  it("escalates to minor for Added/Changed/Removed/Deprecated", () => {
    fragment("1-a.md", "type: Fixed");
    fragment("2-b.md", "type: Added");
    expect(run("compute-bump.mjs")).toBe("minor");

    fragment("3-c.md", "type: Removed");
    expect(run("compute-bump.mjs")).toBe("minor");
  });

  it("escalates to major on a breaking fragment whatever its type", () => {
    fragment("1-a.md", "type: Fixed\nbreaking: true");
    expect(run("compute-bump.mjs")).toBe("major");
  });

  it("takes the highest level across all fragments", () => {
    fragment("1-a.md", "type: Fixed");
    fragment("2-b.md", "type: Changed");
    fragment("3-c.md", "type: Security");
    expect(run("compute-bump.mjs")).toBe("minor");
  });

  it("fails rather than guessing when there are no fragments", () => {
    expect(() => run("compute-bump.mjs")).toThrow();
  });

  it("fails loudly on an unknown type", () => {
    fragment("1-a.md", "type: Whatever");
    expect(() => run("compute-bump.mjs")).toThrow();
  });
});

describe("collate-changelog", () => {
  beforeEach(() => {
    writeFileSync(join(dir, "CHANGELOG.md"), CHANGELOG_STUB);
  });

  it("groups fragments by type under a dated version heading", () => {
    fragment("1-a.md", "type: Added\ntitle: A feature", "It does a thing.");
    fragment("2-b.md", "type: Fixed", "It stopped doing a wrong thing.");
    run("collate-changelog.mjs", ["0.2.0"]);

    const md = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
    expect(md).toMatch(/## \[0\.2\.0\] - \d{4}-\d{2}-\d{2}/);
    expect(md).toContain("### Added\n\n- **A feature** — It does a thing.");
    expect(md).toContain("### Fixed\n\n- It stopped doing a wrong thing.");
    // The anchor survives for the next round, and history is kept.
    expect(md).toContain("## [Unreleased]");
    expect(md).toContain("## [0.1.0]");
  });

  it("consumes the fragments it collated", () => {
    fragment("1-a.md", "type: Added");
    run("collate-changelog.mjs", ["0.2.0"]);
    expect(readdirSync(join(dir, ".changes", "unreleased"))).toEqual([]);
  });

  it("appends a Learn more link when a fragment names a feature doc", () => {
    fragment("1-a.md", "type: Added\ndoc: locales", "Adds a country pack.");
    run("collate-changelog.mjs", ["0.2.0"]);
    expect(readFileSync(join(dir, "CHANGELOG.md"), "utf8")).toContain(
      "[Learn more](feature:locales)",
    );
  });

  it("refuses to write an empty release", () => {
    expect(() => run("collate-changelog.mjs", ["0.2.0"])).toThrow();
  });
});

describe("extract-section", () => {
  it("prints just the requested version's body", () => {
    writeFileSync(join(dir, "CHANGELOG.md"), CHANGELOG_STUB);
    fragment("1-a.md", "type: Added", "A brand new thing.");
    run("collate-changelog.mjs", ["0.2.0"]);

    const notes = run("extract-section.mjs", ["0.2.0"]);
    expect(notes).toContain("A brand new thing.");
    expect(notes).not.toContain("Something older.");
    expect(notes).not.toContain("## [0.2.0]");
  });
});

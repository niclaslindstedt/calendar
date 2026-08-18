// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The bottom gutter is a stylesheet value with a TypeScript handle, so the
// test is a contract between the two: `layout.ts` must name variables the
// stylesheet actually defines, and the iOS-standalone override must still
// clear a home indicator whose inset reports nothing.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CONTENT_BOTTOM_PAD, LIST_BOTTOM_PAD } from "../src/app/layout.ts";

const css = readFileSync(
  fileURLToPath(new URL("../src/styles.css", import.meta.url)),
  "utf8",
);

/** The name inside a `var(--x)` reference. */
function varName(reference: string): string {
  const match = /^var\((--[a-z0-9-]+)\)$/.exec(reference);
  if (!match) throw new Error(`not a bare var() reference: ${reference}`);
  return match[1];
}

/** The declaration's value, from the last place the stylesheet sets it. */
function declaration(name: string): string {
  const matches = [
    ...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g")),
  ].map((m) => m[1].replace(/\s+/g, " ").trim());
  if (matches.length === 0) throw new Error(`${name} is never declared`);
  return matches[matches.length - 1];
}

describe("the shared bottom gutter", () => {
  it("is a custom property the stylesheet defines", () => {
    expect(() => declaration(varName(CONTENT_BOTTOM_PAD))).not.toThrow();
    expect(() => declaration(varName(LIST_BOTTOM_PAD))).not.toThrow();
  });

  it("keeps the day list's gutter taller than the shared one", () => {
    // The day list scrolls its last row into view, so it needs more than a
    // laid-out view does — and it derives that from the shared gutter rather
    // than restating it, so the two can never drift apart.
    expect(declaration(varName(LIST_BOTTOM_PAD))).toContain(
      varName(CONTENT_BOTTOM_PAD),
    );
  });

  it("clears the home indicator on an installed iOS PWA", () => {
    // The last declaration wins, and the iOS one is scoped to
    // `display-mode: standalone`. It must not simply pass the inset through:
    // the inset is what could not be trusted, so the band's own 34 px is the
    // floor and the clear margin is added on top.
    const ios = declaration(varName(CONTENT_BOTTOM_PAD));
    expect(ios).toContain("34px");
    expect(ios).toContain("env(safe-area-inset-bottom, 0px)");
    expect(ios).toContain("var(--cal-gutter-margin)");
  });

  it("scopes the iOS value to an installed iOS PWA", () => {
    // Everything between the block that overrides the gutter and the `@supports`
    // that opens it: an installed app on iOS, and nothing else. A browser tab
    // keeps the plain value, where there is no home indicator to clear.
    const override = css.lastIndexOf("--cal-bottom-gutter");
    const opener = css.lastIndexOf("@supports", override);
    expect(opener).toBeGreaterThan(-1);
    const guard = css.slice(opener, override);
    expect(guard).toContain("-webkit-touch-callout: none");
    expect(guard).toContain("display-mode: standalone");
  });

  it("leaves a visible margin below the last row on every device", () => {
    // 16 px of breathing room, not the hairline the gutter used to leave once
    // the home indicator had taken its share.
    expect(declaration("--cal-gutter-margin")).toBe("16px");
  });
});

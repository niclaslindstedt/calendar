// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The bottom gutter and the top menu's leading space are runtime values with
// a TypeScript handle and a stylesheet fallback, so this is a contract
// between the three: `layout.ts` must name variables the stylesheet actually
// defines, the fallbacks must be usable on their own, and — the reason all of
// this moved out of CSS — the stylesheet must never wrap `env()` in a
// `min()`, `max()` or `clamp()` again.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CONTENT_BOTTOM_PAD, LIST_BOTTOM_PAD } from "../src/app/layout.ts";
import { GUTTER_MARGIN, HEADER_PAD } from "../src/app/safeArea.ts";

const css = readFileSync(
  fileURLToPath(new URL("../src/styles.css", import.meta.url)),
  "utf8",
);

/** The stylesheet with its comments stripped, so a `max(env(…))` quoted in
 *  prose — this file's own history is written up in those comments — is not
 *  mistaken for a declaration. */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** The name inside a `var(--x)` reference. */
function varName(reference: string): string {
  const match = /^var\((--[a-z0-9-]+)\)$/.exec(reference);
  if (!match) throw new Error(`not a bare var() reference: ${reference}`);
  return match[1];
}

/** The declaration's value, from the last place the stylesheet sets it. */
function declaration(name: string): string {
  const matches = [
    ...rules.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g")),
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

  it("falls back to the device's band plus the visible margin", () => {
    // Whatever the fallback is, it is what the app lays out with until
    // `safeArea.ts` has measured — so it clears the device's own band and
    // still leaves something to read as an end.
    const fallback = declaration(varName(CONTENT_BOTTOM_PAD));
    expect(fallback).toContain("env(safe-area-inset-bottom, 0px)");
    expect(fallback).toContain("var(--cal-gutter-margin)");
  });

  it("leaves a visible margin below the last row on every device", () => {
    // 16 px of breathing room, not the hairline the gutter used to leave once
    // the home indicator had taken its share. The stylesheet's margin and the
    // one `safeArea.ts` adds are the same margin.
    expect(declaration("--cal-gutter-margin")).toBe(`${GUTTER_MARGIN}px`);
  });
});

describe("the top menu's vertical rhythm", () => {
  it("spends the same pad under the buttons that safeArea.ts floors at", () => {
    // A bar whose gaps match reads as centred; the two constants saying so
    // live in different languages, so this is what keeps them equal.
    expect(declaration("--cal-header-pad")).toBe(`${HEADER_PAD / 16}rem`);
  });

  it("takes its leading space from the published custom property", () => {
    expect(declaration("padding-top")).toContain("--cal-topbar-lead");
  });

  it("falls back to the pad stacked on the inset, which is what a tab wants", () => {
    const fallback = declaration("padding-top");
    expect(fallback).toContain("var(--cal-header-pad)");
    expect(fallback).toContain("env(safe-area-inset-top, 0px)");
  });
});

describe("the stylesheet's arithmetic on the safe areas", () => {
  it("never puts env() inside min(), max() or clamp()", () => {
    // The one rule this file exists to hold. `max(…env()…)` is not a value
    // the installed iOS app computes: as a declaration it is dropped, and as
    // a custom property it fails later at substitution and takes the whole
    // property down to its initial value with it. Two gutters and one header
    // pad were lost to it before anyone read the geometry back off a device.
    const offenders = [
      ...rules.matchAll(/(?:min|max|clamp)\(([^()]|\([^()]*\))*\)/g),
    ]
      .map((m) => m[0])
      .filter((call) => call.includes("env("));
    expect(offenders).toEqual([]);
  });
});

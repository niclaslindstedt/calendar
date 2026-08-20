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

import {
  CONTENT_BOTTOM_PAD,
  LIST_BOTTOM_PAD,
  WEEK_GUTTER_COLUMN,
  monthGridColumns,
} from "../src/app/layout.ts";
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

describe("the strip lane's first line", () => {
  // The date and the weekday beside it are aligned on their capitals, which
  // takes `text-box-trim` — `align-items` aligns line boxes, and a line box
  // carries a share of the font size as leading, so the weekday drifted
  // further above the date the larger the reader set it (2 px at the day
  // list's 20 px, 4 px at the week planner's 24 px, ~10 px at its 60 px
  // ceiling). A constant cannot replace it: the amount is a font metric, and
  // the date's face is a setting.
  it("trims both boxes to their caps rather than padding one of them", () => {
    const rule = css.slice(css.indexOf("@supports (text-box-edge: cap"));
    expect(rule).toContain(".cal-strip-date");
    expect(rule).toContain(".cal-strip-weekday");
    expect(rule.slice(0, 400)).toContain("text-box-trim: trim-start");
    expect(rule.slice(0, 400)).toContain("text-box-edge: cap alphabetic");
  });

  it("keeps the trim behind @supports, so an older engine is unharmed", () => {
    // Safari before 18.2 and Chrome before 133 have no `text-box-trim`; there
    // the lane keeps the line-box alignment this replaces rather than losing
    // the declaration and the layout with it.
    expect(css).toContain("@supports (text-box-edge: cap alphabetic)");
  });
});

describe("the room factor in the stylesheet", () => {
  // `roomScale.ts` publishes `--cal-<scope>-room`; the stylesheet is the other
  // half of that contract. Every printed size has to carry it, or a piece is
  // left at the phone's measurement while everything around it grows — which
  // is the bug this whole factor exists to fix, reintroduced one rule at a
  // time.
  const SIZE_RULES = [
    ".cal-cell-nameday",
    ".cal-cell-holiday",
    ".cal-size-day",
    ".cal-size-holiday",
    ".cal-size-nameday",
    ".cal-size-week",
    ".cal-strip-weekday",
  ];

  /** Every body the stylesheet gives a selector, joined — a selector can be
   *  declared more than once (the cap-trim `@supports` block also names
   *  `.cal-strip-weekday`), and what matters here is that one of them carries
   *  the factor, not which. */
  function ruleBody(selector: string): string {
    const bodies: string[] = [];
    let at = rules.indexOf(`${selector} {`);
    while (at >= 0) {
      const open = rules.indexOf("{", at);
      bodies.push(rules.slice(open + 1, rules.indexOf("}", open)));
      at = rules.indexOf(`${selector} {`, open);
    }
    if (bodies.length === 0) throw new Error(`${selector} has no rule`);
    return bodies.join("\n");
  }

  it("multiplies every printed size by it", () => {
    for (const selector of SIZE_RULES) {
      expect(ruleBody(selector)).toContain("var(--cal-room");
    }
  });

  it("maps it down in both scopes, so neither falls through to the other", () => {
    for (const scope of ["month", "strip"]) {
      expect(ruleBody(`.cal-scope-${scope}`)).toContain(
        `--cal-room: var(--cal-${scope}-room`,
      );
    }
  });

  it("grows the margins that hold the type it grew", () => {
    // A lane or a rail left at the phone's width while its contents grow is a
    // week number wrapped onto two lines in a 96 px margin.
    for (const selector of [".cal-strip-lane", ".cal-strip-rail"]) {
      expect(ruleBody(selector)).toContain("var(--cal-room");
    }
  });

  it("caps what those margins may take of the row", () => {
    // Both widths are linear in the reader's scale *and* the room factor, and
    // the two multiply. Without a ceiling the margins take three quarters of a
    // desk-width row at the ladder's top step and the note — the thing the
    // calendar is for — gets what is left.
    for (const selector of [".cal-strip-lane", ".cal-strip-rail"]) {
      expect(ruleBody(selector)).toMatch(/max-width:\s*\d+%/);
    }
  });
});

describe("the month grid's week gutter", () => {
  // A lane holding printed type is a printed size, and this one was the width
  // the room factor missed: 20 px measured at the gutter's own 10 px, left
  // flat while the number in it reached 30 px on a desk monitor at the
  // ladder's top step — so it drew ten pixels past its column, through the
  // first day column's rule.
  it("carries both factors that size the number in it", () => {
    expect(WEEK_GUTTER_COLUMN).toContain("var(--cal-size-week");
    expect(WEEK_GUTTER_COLUMN).toContain("var(--cal-room");
  });

  it("keeps the measured 20 px as what it starts from", () => {
    expect(WEEK_GUTTER_COLUMN).toContain("1.25rem");
  });

  it("leads the seven day columns with it, and only when it is printed", () => {
    // Both the weekday header row and every week row lay out with this, so a
    // gutter in one and not the other would knock the headers off their days.
    expect(monthGridColumns(true)).toBe(
      `grid-template-columns: ${WEEK_GUTTER_COLUMN} repeat(7, minmax(0, 1fr))`,
    );
    expect(monthGridColumns(false)).toBe(
      "grid-template-columns: repeat(7, minmax(0, 1fr))",
    );
    // No dead gutter when the country prints no week numbers.
    expect(monthGridColumns(false)).not.toContain("1.25rem");
  });
});

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
import {
  HEADING_CLEARANCE,
  HEADING_GAP,
  HEADING_HEIGHT,
  HEADING_META,
  HEADING_TITLE,
} from "../src/app/PeriodHeading.tsx";
import { LIST_HOME_TUCK } from "../src/app/DayListView.tsx";
import { GUTTER_MARGIN, HEADER_PAD } from "../src/app/safeArea.ts";
import { STRIP_ROW_EDGE, WEEK_RULE_WIDTH } from "../src/app/stripRow.tsx";

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

/** Every body the stylesheet gives a selector, joined — a selector can be
 *  declared more than once, and what matters is that one of them carries the
 *  declaration, not which. */
function ruleBodyOf(selector: string): string {
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

describe("the pinned heading's height", () => {
  // The day list pins the heading over its own scroll and keeps exactly this
  // much clear at the top of the scrollport, so a row the month opens on
  // lands under the heading rather than behind it. The constant is derived
  // from two Tailwind classes in `PeriodHeading` — change either and the
  // clearance is wrong by the difference, silently, in the one view that
  // scrolls. So it is re-derived here from the file itself.
  const source = readFileSync(
    fileURLToPath(new URL("../src/app/PeriodHeading.tsx", import.meta.url)),
    "utf8",
  );

  /** A Tailwind spacing step, in rem. */
  const step = (units: number) => units * 0.25;

  /** The single `<n>` in the first `<prefix>-<n>` the source carries. */
  function scale(prefix: string): number {
    const match = new RegExp(`\\b${prefix}-(\\d+)\\b`).exec(source);
    if (!match) throw new Error(`PeriodHeading no longer sets ${prefix}-*`);
    return step(Number(match[1]));
  }

  it("is the arrow button plus the padding above and below it", () => {
    // The arrows are the tallest thing in the row — both titles the views set
    // are shorter than their own buttons — so the row's height does not
    // depend on which view is asking for it.
    expect(HEADING_HEIGHT).toBe(`${scale("h") + 2 * scale("py")}rem`);
  });

  it("leaves air under the band, and grows it with the screen", () => {
    // The gap is a measured length like every other one here, so it carries
    // the room factor — a strip row on a desk monitor is set larger, and a
    // gap held at the phone's 12 px between larger rows is the same crowding
    // one size up.
    expect(HEADING_GAP).toContain("0.75rem");
    expect(HEADING_GAP).toContain("var(--cal-room");
  });

  it("clears the band and that gap at the top of the scrollport", () => {
    // What the day list keeps clear is both, or a row it scrolls to lands
    // flush against the band while an unscrolled one has air under it.
    expect(HEADING_CLEARANCE).toContain(HEADING_HEIGHT);
    expect(HEADING_CLEARANCE).toContain(HEADING_GAP);
  });
});

describe("the row the day list opens on", () => {
  // The list opens on today's week, and that row opens a week, so it draws
  // the week rule. Left at the scroller's plain clearance the rule came to
  // rest a few pixels below the masthead — a line across the top of the
  // screen with nothing above it. The row asks for the difference itself, and
  // the deck reads it back off the row's computed style.
  it("gives up the air under the band and the rule's own thickness", () => {
    expect(LIST_HOME_TUCK).toContain(HEADING_GAP);
    expect(LIST_HOME_TUCK).toContain(WEEK_RULE_WIDTH);
  });

  it("asks for it as a negative scroll margin — past the padding, not short of it", () => {
    // `scroll-margin-top` is the browser's own sign convention: a positive one
    // holds the target further from the scrollport's edge, so a row that means
    // to land *behind* the pinned band sets a negative one. Get this backwards
    // and the rule lands twice as far below the masthead as it started.
    expect(LIST_HOME_TUCK).toContain("-1 *");
  });

  it("takes the rule's thickness from the stylesheet that draws it", () => {
    // The rule is CSS's; the arithmetic on it is TypeScript's. This is what
    // keeps the two the same number.
    expect(ruleBodyOf(".cal-strip-row.cal-strip-break")).toContain(
      `border-top: ${WEEK_RULE_WIDTH}`,
    );
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

describe("the strip row's two arrangements", () => {
  // The lane and the rail are one pair of margins laid out two ways
  // (`stripNoteFlow`): floated, so a note runs under them, or flexed, so it
  // keeps the column between them. Which one a row is in is a class on its
  // body, and the danger is a rule that leaks — a float left on the shared
  // margin rule would put the note under the date in *both*, which is the
  // setting doing nothing.
  const flowBody = ".cal-strip-body-flow";
  const columnBody = ".cal-strip-body-column";

  it("floats the margins only under the flowing body", () => {
    for (const margin of [".cal-strip-lane", ".cal-strip-rail"]) {
      expect(rules).toContain(`${flowBody} > ${margin} {`);
    }
    // …and nothing else in the stylesheet floats anything, so the column
    // arrangement cannot inherit one by accident.
    for (const [, selector] of rules.matchAll(
      /([^{}]+)\{([^{}]*float:[^{}]*)\}/g,
    )) {
      expect(selector).toContain(flowBody);
    }
  });

  it("keeps the note in a column of its own under the other", () => {
    // A flex item rather than a box in a formatting context: this is the
    // arrangement where the margins are columns and the note is what is
    // between them.
    expect(rules).toContain(`${columnBody} > .cal-strip-note {`);
    expect(ruleBodyOf(`${columnBody} > .cal-strip-note`)).toContain("flex:");
  });

  it("puts the rail last in that row, though the markup puts it first", () => {
    // Source order is the flowing arrangement's: a right float placed after
    // the note would simply drop below it. So the column reorders instead.
    expect(ruleBodyOf(`${columnBody} > .cal-strip-rail`)).toContain("order:");
  });

  it("measures the note against the body in both", () => {
    // `entryFit.ts` reads the slot's height off the note's box, so a box that
    // shrink-wrapped its text would report the height the text is already
    // using and never shrink it.
    expect(ruleBodyOf(".cal-strip-note")).toContain("height: 100%");
  });
});

describe("the period heading's type", () => {
  // One masthead for the whole app. The month grid used to set its title
  // larger and in caps while the two strip views set theirs smaller and in
  // lower case, which read as three calendars rather than three views of one —
  // so the views no longer carry typography of their own, and this is what
  // says so.
  const views = [
    "MonthGridView.tsx",
    "WeekPlannerView.tsx",
    "DayListView.tsx",
    "HolidaysView.tsx",
  ];

  it("is the heading's own, not each view's", () => {
    for (const view of views) {
      const source = readFileSync(
        fileURLToPath(new URL(`../src/app/${view}`, import.meta.url)),
        "utf8",
      );
      expect(source).not.toContain("titleClass");
      expect(source).not.toContain("metaClass");
    }
  });

  it("prints the month in the wall calendar's caps", () => {
    expect(HEADING_TITLE).toContain("uppercase");
    expect(HEADING_TITLE).toContain("cal-serif");
  });

  it("stays inside the line box the band's height is measured from", () => {
    // `HEADING_HEIGHT` is the arrow button plus its padding, and the day list
    // scrolls by that number. A title whose line box outgrew the 2.25 rem
    // arrows would make the band taller than the constant says it is —
    // `text-3xl` is exactly 2.25 rem, and the `text-4xl` the month view used
    // to reach for at `sm` was 2.5 rem.
    expect(HEADING_TITLE).toContain("sm:text-3xl");
    expect(HEADING_TITLE).not.toContain("text-4xl");
    // The year is the quieter half, so it never leads the line box either.
    expect(HEADING_META).toContain("text-lg");
  });
});

describe("the strip row's edges", () => {
  // The week planner and the day list print the same row, so they cancel the
  // same gutter with the same class — a row that bled in one view and not the
  // other is two calendars.
  const source = (name: string) =>
    readFileSync(
      fileURLToPath(new URL(`../src/app/${name}`, import.meta.url)),
      "utf8",
    );

  it("is the one both strip views print with", () => {
    for (const view of ["DayListView.tsx", "WeekPlannerView.tsx"]) {
      expect(source(view)).toContain("STRIP_ROW_EDGE");
    }
  });

  it("cancels the views' own gutter on a phone and gives it back past sm", () => {
    // The views pad themselves `px-3` up to `sm`, so the row's negative margin
    // is exactly that: the rules reach the screen's edges, and past `sm` the
    // calendar is a centred column again and the row goes back inside it.
    for (const view of ["DayListView.tsx", "WeekPlannerView.tsx"]) {
      expect(source(view)).toContain("px-3 sm:px-6");
    }
    expect(STRIP_ROW_EDGE).toContain("-mx-3");
    expect(STRIP_ROW_EDGE).toContain("sm:mx-0");
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

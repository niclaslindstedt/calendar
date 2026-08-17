// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Hyphenation is what lets a name too long for a month cell's line break
// readably instead of being clipped. Every break point it offers has to be one
// the language actually permits, so the whole Swedish almanac is checked
// against the rules rather than a handful of samples.

import { describe, expect, it } from "vitest";

import {
  MIN_HYPHENATED_LETTERS,
  SOFT_HYPHEN,
  hyphenPoints,
  hyphenate,
} from "../src/app/locale/hyphenate.ts";
import { getLocale } from "../src/app/locale/index.ts";

const sv = getLocale("sv-SE");
const en = getLocale("en-GB");

/** The word split at its offered break points, for readable assertions. The
 *  length gate is off here: these cases are about which boundaries the rules
 *  permit, not about which words are long enough to be offered them. */
function pieces(word: string, rules = sv.hyphenation): string[] {
  return hyphenate(word, rules, { minWordLength: 0 }).split(SOFT_HYPHEN);
}

/** Every name in the pack's table, deduplicated. */
function allNames(pack = sv): string[] {
  const table = pack.nameDays ?? {};
  return [...new Set(Object.values(table).flat())];
}

describe("hyphenPoints (Swedish)", () => {
  it("breaks Henrietta at a syllable boundary, not mid-cluster", () => {
    // The example that motivated this: "Henri-etta", never "Henrie-tta".
    const parts = pieces("Henrietta");
    expect(parts).toEqual(["Hen", "ri", "et", "ta"]);
    expect(parts).not.toContain("tta");
  });

  it("divides a two-consonant run rather than applying maximal onset", () => {
    // The rule Swedish actually follows. "gn" begins "gnaga", but a naive
    // maximal-onset implementation turns that into "Ma-gnus"; the correct
    // break is "Mag-nus". Same for every ordinary pair.
    expect(pieces("Magnus")).toEqual(["Mag", "nus"]);
    expect(pieces("Signe")).toEqual(["Sig", "ne"]);
    expect(pieces("Rasmus")).toEqual(["Ras", "mus"]);
    expect(pieces("Kasper")).toEqual(["Kas", "per"]);
    expect(pieces("Ludvig")).toEqual(["Lud", "vig"]);
    expect(pieces("Fredrik")).toEqual(["Fred", "rik"]);
    expect(pieces("Kristoffer")).toEqual(["Kris", "tof", "fer"]);
  });

  it("uses the onset list only for runs of three or more", () => {
    // Where a long run genuinely has a legal onset inside it, the compound
    // boundary falls out for free.
    expect(pieces("Alexandra")).toEqual(["Alex", "an", "dra"]);
    expect(pieces("Torbjörn")).toEqual(["Tor", "björn"]);
    expect(pieces("Alfred")).toEqual(["Al", "fred"]);
    expect(pieces("Gertrud")).toEqual(["Ger", "trud"]);
  });

  it("keeps a compound's second word whole", () => {
    // "fr" can begin a syllable, so it travels with the following vowel —
    // "Lång-fredagen", not "Långf-redagen".
    expect(pieces("Långfredagen")).toEqual(["Lång", "fre", "da", "gen"]);
  });

  it("splits the long holiday names readably", () => {
    expect(pieces("Midsommarafton")).toEqual([
      "Mid",
      "som",
      "ma",
      "raf",
      "ton",
    ]);
    expect(pieces("Midsommardagen")).toEqual([
      "Mid",
      "som",
      "mar",
      "da",
      "gen",
    ]);
  });

  it("never splits a diphthong", () => {
    // "eu" spells one sound; breaking it would read as a misspelling.
    expect(pieces("Bartolomeus").some((p) => p.endsWith("e"))).toBe(false);
    expect(
      hyphenate("Bartolomeus", sv.hyphenation, { minWordLength: 0 }),
    ).not.toContain(`e${SOFT_HYPHEN}u`);
  });

  it("leaves short words alone", () => {
    for (const word of ["Ada", "Per", "Kaj", "Uno", "Eva"]) {
      expect(hyphenate(word, sv.hyphenation)).toBe(word);
    }
  });

  it("keeps punctuation and spacing untouched", () => {
    const out = hyphenate("Karin, Kajsa", sv.hyphenation);
    expect(out.replaceAll(SOFT_HYPHEN, "")).toBe("Karin, Kajsa");
    expect(out).toContain(", ");
  });

  it("preserves the original text exactly once the hyphens are removed", () => {
    for (const name of allNames()) {
      expect(hyphenate(name, sv.hyphenation).replaceAll(SOFT_HYPHEN, "")).toBe(
        name,
      );
    }
  });
});

describe("break points are legal across the whole almanac", () => {
  const names = allNames();

  it("covers the real table", () => {
    expect(names.length).toBeGreaterThan(500);
  });

  it("never strands one or two letters at either end", () => {
    for (const name of names) {
      for (const p of hyphenPoints(name, sv.hyphenation)) {
        expect(p).toBeGreaterThanOrEqual(sv.hyphenation.minLeading);
        expect(name.length - p).toBeGreaterThanOrEqual(
          sv.hyphenation.minTrailing,
        );
      }
    }
  });

  it("never breaks inside a consonant run that cannot start a syllable", () => {
    // The defect this guards against is "Henrie-tta": a break whose right-hand
    // side begins with a cluster no Swedish syllable could.
    const { vowels, onsets } = sv.hyphenation;
    for (const name of names) {
      const lower = name.toLowerCase();
      for (const p of hyphenPoints(name, sv.hyphenation)) {
        // Consonants immediately after the break must form a legal onset.
        let run = "";
        for (let i = p; i < lower.length && !vowels.includes(lower[i]); i++) {
          run += lower[i];
        }
        if (run.length > 1) {
          expect(
            onsets.includes(run),
            `${name} breaks at ${p} leaving illegal onset "${run}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("always leaves a vowel on both sides of a break", () => {
    // A fragment with no vowel is not a syllable.
    const { vowels } = sv.hyphenation;
    const hasVowel = (s: string) =>
      [...s.toLowerCase()].some((c) => vowels.includes(c));
    for (const name of names) {
      for (const p of hyphenPoints(name, sv.hyphenation)) {
        expect(hasVowel(name.slice(0, p)), `${name}@${p} left`).toBe(true);
        expect(hasVowel(name.slice(p)), `${name}@${p} right`).toBe(true);
      }
    }
  });
});

// The gate that keeps a greedy line breaker from splitting a name it could
// have moved whole: a soft hyphen is an opportunity, and the breaker takes the
// last one that fits. "Elsa, Isabella" must break at the comma.
describe("only words too long for a caption line are offered breaks", () => {
  it("leaves every name in the Swedish almanac whole", () => {
    for (const name of allNames()) {
      expect(hyphenate(name, sv.hyphenation)).toBe(name);
    }
  });

  it("breaks a pair of names after the comma, not inside the second", () => {
    expect(hyphenate("Elsa, Isabella", sv.hyphenation)).toBe("Elsa, Isabella");
    expect(hyphenate("Marika, Marita", sv.hyphenation)).toBe("Marika, Marita");
  });

  it("still breaks the long holiday compounds", () => {
    for (const name of [
      "Midsommarafton",
      "Midsommardagen",
      "Långfredagen",
      "Trettondedag jul",
    ]) {
      expect(hyphenate(name, sv.hyphenation)).toContain(SOFT_HYPHEN);
    }
  });

  it("keeps the measured assumption honest", () => {
    // The constant is only sound while no name-day word reaches the gate:
    // words of that length are measured to fit a caption line whole, and the
    // holiday compounds that do not fit are all longer. ("Gustav Adolf" is
    // two words, and it is words that get broken, not entries.)
    for (const word of allNames().flatMap((name) => name.split(/\P{L}+/u))) {
      expect(word.length).toBeLessThan(MIN_HYPHENATED_LETTERS);
    }
  });
});

describe("English rules", () => {
  it("keeps vowel digraphs together", () => {
    // "ea" spells one sound; breaking it would read as a misspelling.
    expect(
      hyphenate("Easter", en.hyphenation, { minWordLength: 0 }),
    ).not.toContain(`e${SOFT_HYPHEN}a`);
  });

  it("keeps x with the vowel before it", () => {
    // "x" spells /ks/ and cannot open a syllable in either language.
    expect(hyphenate("Boxing", en.hyphenation, { minWordLength: 0 })).toBe(
      `Box${SOFT_HYPHEN}ing`,
    );
    expect(pieces("Alexander")).toEqual(["Alex", "an", "der"]);
    expect(pieces("Alexandra")).toEqual(["Alex", "an", "dra"]);
  });

  it("keeps a three-letter tail, unlike Swedish", () => {
    for (const p of hyphenPoints("Christopher", en.hyphenation)) {
      expect("Christopher".length - p).toBeGreaterThanOrEqual(3);
    }
  });

  it("handles the bank-holiday names without mangling them", () => {
    for (const year of [2026, 2027]) {
      for (const h of en.holidays(year)) {
        expect(
          hyphenate(h.name, en.hyphenation).replaceAll(SOFT_HYPHEN, ""),
        ).toBe(h.name);
      }
    }
  });
});

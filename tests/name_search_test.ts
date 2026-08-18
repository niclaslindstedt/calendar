// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { getLocale, nameKey } from "../src/app/locale/index.ts";
import {
  allNames,
  editAllowance,
  editDistance,
  nameDayIndex,
  searchNames,
} from "../src/app/nameSearch.ts";

const sv = getLocale("sv-SE");
const en = getLocale("en-GB");
const key = (name: string) => nameKey(name, sv.nameSpelling);

/** The names a query surfaces, in rank order. */
const found = (query: string) => searchNames(sv, query).map((h) => h.name);

describe("the sound key", () => {
  it("folds the spellings of one name onto each other", () => {
    // The pairs the Swedish almanac had to choose between.
    for (const [a, b] of [
      ["Niklas", "Nicklas"],
      ["Niklas", "Niclas"],
      ["Kristoffer", "Christoffer"],
      ["Sofia", "Sophia"],
      ["Mikael", "Michael"],
      ["Karl", "Carl"],
      ["Alexander", "Aleksander"],
      ["Göran", "Jöran"],
      ["Elisabet", "Elisabeth"],
      ["Anna", "Ana"],
      ["Filippa", "Filipa"],
      ["Viktor", "Victor"],
      ["Kristina", "Christina"],
      ["Hjalmar", "Jalmar"],
    ] as const) {
      expect([a, key(a)]).toEqual([a, key(b)]);
    }
  });

  it("keeps different names apart", () => {
    expect(key("Erik")).not.toBe(key("Emil"));
    expect(key("Anna")).not.toBe(key("Hanna"));
    expect(key("Karl")).not.toBe(key("Kalle"));
  });

  it("ignores hyphens, spaces and case", () => {
    expect(key("Britt-Marie")).toBe(key("britt marie"));
    expect(key("BRITT-MARIE")).toBe(key("Brittmarie"));
  });

  it("softens c and g on the language's own vowels", () => {
    // `ä`/`ö` soften in Swedish, which is what makes Göran a Jöran.
    expect(key("Cecilia")).toBe(key("Sesilia"));
    expect(key("Cissi")).toBe(key("Sissi"));
    // …and a hard c is a k.
    expect(key("Cornelia")).toBe(key("Kornelia"));
  });

  it("folds the letters a foreign keyboard cannot type", () => {
    expect(key("Åsa")).toBe(key("Asa"));
    expect(key("Jörgen")).toBe(key("Jorgen"));
    expect(key("Désirée")).toBe(key("Desiree"));
  });

  it("gives 627 Swedish names 624 keys, and merges only real variants", () => {
    // The measure of whether the folding is calibrated: it has to pull the
    // spellings of one name together without pulling two names into one. The
    // three names it merges are three pairs of the same name.
    const byKey = new Map<string, Set<string>>();
    for (const entry of nameDayIndex(sv)) {
      const names = byKey.get(entry.key) ?? new Set<string>();
      byKey.set(entry.key, names.add(entry.name));
    }
    const merged = [...byKey.values()]
      .filter((names) => names.size > 1)
      .map((names) => [...names].sort().join("/"));
    expect(merged.sort()).toEqual([
      "Marit/Märit",
      "Marta/Märta",
      "Silvia/Sylvia",
    ]);
  });
});

describe("edit distance", () => {
  it("counts a transposition as one edit", () => {
    expect(editDistance("niklas", "nikals", 2)).toBe(1);
  });

  it("counts inserts, deletes and substitutions", () => {
    expect(editDistance("erik", "erick", 2)).toBe(1);
    expect(editDistance("erik", "eric", 2)).toBe(1);
    expect(editDistance("erik", "emil", 3)).toBe(2);
  });

  it("gives up once the budget is spent rather than counting on", () => {
    // The value past the ceiling is only ever compared against it.
    expect(editDistance("anna", "bartolomeus", 2)).toBeGreaterThan(2);
  });

  it("spends nothing on identical strings", () => {
    expect(editDistance("sofia", "sofia", 0)).toBe(0);
  });

  it("grows the allowance with the query, and gives short ones none", () => {
    expect(editAllowance(3)).toBe(0);
    expect(editAllowance(5)).toBe(1);
    expect(editAllowance(9)).toBe(2);
  });
});

describe("the almanac index", () => {
  it("carries every celebrated name with its date", () => {
    const index = nameDayIndex(sv);
    const niklas = index.find((e) => e.name === "Niklas");
    expect(niklas).toMatchObject({ month: 12, day: 6 });
    // Two names on one date are two entries.
    expect(index.filter((e) => e.month === 12 && e.day === 6)).toHaveLength(2);
  });

  it("lists every name alphabetically, in the pack's own alphabet", () => {
    const names = allNames(sv).map((e) => e.name);
    expect(names.length).toBe(nameDayIndex(sv).length);
    expect(names[0]).toBe("Abel");
    // Swedish sorts Å, Ä and Ö after Z, which is where a Swede looks for
    // them — `localeCompare` in the pack's own collation, not code points.
    expect(names[names.length - 1]).toMatch(/^[ÅÄÖ]/);
  });

  it("is empty for a pack with no name-day tradition", () => {
    expect(nameDayIndex(en)).toEqual([]);
    expect(allNames(en)).toEqual([]);
    expect(searchNames(en, "Nicklas")).toEqual([]);
  });
});

describe("searching for a name", () => {
  it("finds the almanac's spelling from the searcher's own", () => {
    // The case the screen exists for: one spelling is printed, and the person
    // looking for it writes another.
    expect(found("Nicklas")[0]).toBe("Niklas");
    expect(found("Niclas")[0]).toBe("Niklas");
    expect(found("Christoffer")[0]).toBe("Kristoffer");
    expect(found("Sophia")[0]).toBe("Sofia");
    expect(found("Michael")[0]).toBe("Mikael");
    expect(found("Carl")[0]).toBe("Karl");
    expect(found("Victor")[0]).toBe("Viktor");
    expect(found("Rickard")[0]).toBe("Rikard");
  });

  it("answers with the name day's date", () => {
    expect(searchNames(sv, "Nicklas")[0]).toMatchObject({
      name: "Niklas",
      month: 12,
      day: 6,
    });
  });

  it("ranks the exact sound first, and the names merely holding it last", () => {
    const hits = searchNames(sv, "Anna");
    expect(hits[0]).toMatchObject({ name: "Anna", kind: "exact" });
    // "Hanna" only contains the sound, so it lands below the name asked for.
    expect(hits.findIndex((h) => h.name === "Hanna")).toBeGreaterThan(0);
    // …and half a name reaches the names that start with it.
    expect(found("Ann")).toContain("Annika");
  });

  it("reaches a name whose dots the keyboard cannot type", () => {
    // `ö` softens the `g` before it, so "Göran" sounds like "Jöran" while
    // "Goran" does not — the dots carry the sound. The edit allowance is what
    // closes that last letter, so the name is still one query away.
    expect(found("Goran")).toContain("Göran");
    expect(found("Asa")).toContain("Åsa");
  });

  it("matches as you type, before the name is finished", () => {
    expect(found("nikl")).toContain("Niklas");
    expect(found("sof")).toContain("Sofia");
  });

  it("forgives a slip in a long enough query", () => {
    expect(found("Kristofer")).toContain("Kristoffer");
    expect(found("Alexnader")).toContain("Alexander");
    expect(found("Elisabeth")).toContain("Elisabet");
  });

  it("does not guess at a two-letter query", () => {
    // Everything it returns actually contains what was typed.
    for (const hit of searchNames(sv, "an")) expect(hit.kind).not.toBe("fuzzy");
  });

  it("returns nothing for a query with no letters in it", () => {
    expect(searchNames(sv, "   ")).toEqual([]);
    expect(searchNames(sv, "-")).toEqual([]);
  });

  it("caps a broad query rather than pouring the almanac onto the screen", () => {
    expect(searchNames(sv, "a", 10).length).toBeLessThanOrEqual(10);
  });
});

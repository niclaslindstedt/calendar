// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The name-day search: given what someone typed, which names in the almanac
// did they mean, and when are those names celebrated.
//
// The problem is that an almanac prints ONE spelling per name. A Nicklas
// searching a Swedish calendar for his name day is looking for "Niklas", and a
// literal search — even a substring one — tells him he isn't in there. So the
// search runs on the sound of a name rather than its letters
// (`locale/nameKey.ts` folds the spelling), and then tolerates the distance
// that is left: a query is allowed a typo or two, scaled to its length, so
// "Kristofer" still reaches "Christoffer" and a half-typed "nikl" still
// reaches "Niklas" while you are typing it.
//
// Everything here is pure and country-agnostic — the spelling knowledge lives
// in the packs — so `tests/name_search_test.ts` can pin the behaviour without
// a DOM.

import { nameKey, type LocalePack } from "./locale/index.ts";

/** One celebrated name, and the date it is celebrated on. */
export type NameDayEntry = {
  /** As the almanac prints it. */
  readonly name: string;
  readonly month: number;
  readonly day: number;
  /** The folded spelling the search compares against. */
  readonly key: string;
};

/** How a name was reached, weakest last. Kept on the hit because the view
 *  says so out loud: a fuzzy hit is a guess, and a guess should look like
 *  one. */
export type NameMatchKind = "exact" | "prefix" | "contains" | "fuzzy";

export type NameHit = NameDayEntry & {
  readonly kind: NameMatchKind;
  /** Higher ranks first. */
  readonly score: number;
};

/** Built once per pack — the almanac is static data. */
const indexCache = new Map<string, readonly NameDayEntry[]>();

/** Every name in a pack's almanac, in calendar order. Empty for a pack with
 *  no name-day tradition. */
export function nameDayIndex(pack: LocalePack): readonly NameDayEntry[] {
  const cached = indexCache.get(pack.id);
  if (cached) return cached;

  const entries: NameDayEntry[] = [];
  for (const [date, names] of Object.entries(pack.nameDays ?? {})) {
    const month = Number(date.slice(0, 2));
    const day = Number(date.slice(3, 5));
    if (!Number.isFinite(month) || !Number.isFinite(day)) continue;
    for (const name of names) {
      entries.push({ name, month, day, key: nameKey(name, pack.nameSpelling) });
    }
  }
  entries.sort((a, b) => a.month - b.month || a.day - b.day);

  const frozen: readonly NameDayEntry[] = entries;
  indexCache.set(pack.id, frozen);
  return frozen;
}

/** Every name in the almanac, alphabetically in the pack's own collation —
 *  Swedish sorts Å, Ä and Ö after Z, which is where a Swede looks for them.
 *  This is what the screen shows before anything is typed. */
export function allNames(pack: LocalePack): readonly NameDayEntry[] {
  return [...nameDayIndex(pack)].sort((a, b) =>
    a.name.localeCompare(b.name, pack.bcp47),
  );
}

/**
 * How many single-letter slips a query of this length may carry and still be
 * considered the same name.
 *
 * Short queries get none: at three letters, one edit away is a different name
 * ("Ann"/"Ada"), and being generous there fills the screen with noise while
 * the useful hits are the prefix ones anyway. The allowance opens up as the
 * query grows, because a long name is where the real spelling variation is —
 * and where the folding has already absorbed the systematic part of it, so
 * what is left is a genuine slip.
 */
export function editAllowance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  return 2;
}

/**
 * Damerau-Levenshtein distance, abandoned once it passes `max`.
 *
 * Transpositions count as one edit rather than two because they are what a
 * thumb on a phone actually produces ("Niklsa"), and treating them as two
 * puts them outside the allowance for exactly the names long enough to
 * mistype.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;

  // Three rows: the one being filled, the previous, and the one before it —
  // the transposition rule needs to reach back two.
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let current: number[] = [];

  for (let i = 1; i <= a.length; i++) {
    current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, beforePrevious[j - 2] + 1);
      }
      current.push(d);
      best = Math.min(best, d);
    }
    // Every remaining row can only add to the best score on this one.
    if (best > max) return max + 1;
    beforePrevious = previous;
    previous = current;
  }

  return previous[b.length];
}

/** Score one indexed name against a folded query, or null when it is not the
 *  name being looked for. Longer names score below shorter ones at the same
 *  kind of match, so "Ann" beats "Annalena" for `ann`. */
function scoreEntry(entry: NameDayEntry, query: string): NameHit | null {
  const key = entry.key;
  const lengthPenalty = Math.min(key.length - query.length, 20) / 2;

  if (key === query) return { ...entry, kind: "exact", score: 1000 };
  if (key.startsWith(query))
    return { ...entry, kind: "prefix", score: 800 - lengthPenalty };
  if (key.includes(query))
    return { ...entry, kind: "contains", score: 600 - lengthPenalty };

  const allowance = editAllowance(query.length);
  if (allowance === 0) return null;

  // Against the whole name first — "kristofer" for `christoffer`.
  const whole = editDistance(query, key, allowance);
  if (whole <= allowance)
    return { ...entry, kind: "fuzzy", score: 400 - whole * 50 - lengthPenalty };

  // …then against just as much of it as was typed, so a misspelling still
  // matches while the query is only half a name ("kristof" → "Christoffer").
  if (key.length > query.length) {
    const head = editDistance(query, key.slice(0, query.length), allowance);
    if (head <= allowance)
      return {
        ...entry,
        kind: "fuzzy",
        score: 300 - head * 50 - lengthPenalty,
      };
  }

  return null;
}

/** The names matching a query, best first. A blank query matches nothing —
 *  it is not a question. The screen answers that one with {@link allNames}
 *  instead, which is a perfectly good thing to browse. */
export function searchNames(
  pack: LocalePack,
  query: string,
  limit = 60,
): readonly NameHit[] {
  const folded = nameKey(query, pack.nameSpelling);
  if (!folded) return [];

  const hits: NameHit[] = [];
  for (const entry of nameDayIndex(pack)) {
    const hit = scoreEntry(entry, folded);
    if (hit) hits.push(hit);
  }

  hits.sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, pack.bcp47),
  );
  return hits.slice(0, limit);
}

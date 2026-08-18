// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Orthographic folding for names, so a name found by searching is the name the
// almanac happens to print rather than the spelling the person searching uses.
//
// An almanac lists one spelling per name — the Swedish one lists "Niklas", and
// a Nicklas, a Niclas and a Nichlas all miss it under any literal search. The
// spellings are not typos: they are the *same name*, written the way the
// language allows the same sound to be written. So the fix is not a looser
// literal match, it is to compare what a name SOUNDS like.
//
// This module turns a name into that sound key: "Nicklas", "Niclas" and
// "Niklas" all fold to `niklas`, "Christoffer" and "Kristoffer" to `kristofer`,
// "Sophia" and "Sofia" to `sofia`. Two names with the same key are the same
// name spelled differently, and the search treats them as one.
//
// The machinery is shared; the *rules* are per-language and live in the pack
// files beside the name tables, for the same reason hyphenation's do: "when is
// a `c` an `s`" is country knowledge, and it must not leak out of
// `src/app/locale/`. A pack that spells its sounds differently says so there.

/** How a language may write the same sound in a name. */
export type NameSpellingRules = {
  /** Vowels that soften a preceding `c` (and `g`, where the language does):
   *  the `e`, `i`, `y` of "Cecilia". Written with the language's own letters,
   *  before any folding — Swedish softens on `ä` and `ö` too. */
  readonly softVowels: string;
  /** What a soft `c` sounds like ("Cecilia" → `sesilia`). */
  readonly softC: string;
  /** What a hard `c` sounds like ("Carl" → `karl`). */
  readonly hardC: string;
  /** Whether a soft `g` is a `j` — true for both Swedish ("Göran"/"Jöran") and
   *  English ("George"). A language with a hard `g` throughout sets false. */
  readonly softensG: boolean;
  /** Word-initial clusters that sound like a bare `j`: Swedish "Hjalmar" is
   *  spoken, and sometimes written, "Jalmar". */
  readonly jOnsets: readonly string[];
  /** Multi-letter spellings of a single sound, rewritten wherever they appear:
   *  `ch` → `k` ("Michael"/"Mikael"), `ph` → `f`, `th` → `t`. Longest match
   *  wins, so a three-letter entry beats a two-letter one. */
  readonly digraphs: Readonly<Record<string, string>>;
  /** Single letters that only ever spell another letter's sound: `z` → `s`,
   *  `w` → `v`, `x` → `ks`, `y` → `i`. */
  readonly letters: Readonly<Record<string, string>>;
  /** Accented letters folded to a base form once the sound rules have run —
   *  they run first because Swedish `ö` softens the `g` before it. Folding at
   *  all is what lets a keyboard without the letter find the name: `å` → `a`,
   *  `ö` → `o`, `é` → `e`. */
  readonly fold: Readonly<Record<string, string>>;
};

/** The longest digraph a rule table may carry ("sch"). */
const MAX_DIGRAPH = 3;

/**
 * The sound key of a name: lowercase, stripped of everything that is not a
 * letter, rewritten by the pack's rules, folded, and with doubled letters
 * collapsed.
 *
 * Doubling is collapsed **last** because it is the most common variation of
 * all — "Filippa"/"Filipa", "Mattias"/"Matias", "Christoffer"/"Kristofer" —
 * and because the rewrites create their own doubles on the way ("Nicklas"
 * becomes `nikklas` the moment the `c` hardens).
 *
 * Non-letters go entirely: "Britt-Marie", "Britt Marie" and "Brittmarie" are
 * one name, and a hyphen is not worth failing a search over.
 */
export function nameKey(name: string, rules: NameSpellingRules): string {
  const lower = name.toLowerCase();
  const letters = [...lower].filter((ch) => /\p{L}/u.test(ch)).join("");

  let out = "";
  let i = 0;
  while (i < letters.length) {
    // Word-initial only, and "word" means the whole key so far is empty:
    // punctuation is already gone, so "Britt-Marie" is one word by the time
    // we get here.
    if (i === 0) {
      const onset = rules.jOnsets.find((o) => letters.startsWith(o));
      if (onset) {
        out += "j";
        i += onset.length;
        continue;
      }
    }

    const digraph = matchDigraph(letters, i, rules.digraphs);
    if (digraph) {
      out += rules.digraphs[digraph];
      i += digraph.length;
      continue;
    }

    const ch = letters[i];
    const soft = rules.softVowels.includes(letters[i + 1] ?? "");
    if (ch === "c") {
      out += soft ? rules.softC : rules.hardC;
    } else if (ch === "g" && soft && rules.softensG) {
      out += "j";
    } else {
      out += rules.letters[ch] ?? ch;
    }
    i += 1;
  }

  return collapse(fold(out, rules.fold));
}

/** The longest digraph starting at `i`, or null. */
function matchDigraph(
  text: string,
  i: number,
  digraphs: Readonly<Record<string, string>>,
): string | null {
  for (let n = MAX_DIGRAPH; n >= 2; n--) {
    const slice = text.slice(i, i + n);
    if (slice.length === n && slice in digraphs) return slice;
  }
  return null;
}

/** Pack folds first, then Unicode's own: `é` decomposes to `e` + an accent,
 *  and dropping the accent covers every letter a pack has not listed. */
function fold(text: string, table: Readonly<Record<string, string>>): string {
  let out = "";
  for (const ch of text) out += table[ch] ?? ch;
  return out.normalize("NFD").replace(/\p{M}+/gu, "");
}

/** "anna" → "ana". */
function collapse(text: string): string {
  let out = "";
  for (const ch of text) if (ch !== out[out.length - 1]) out += ch;
  return out;
}

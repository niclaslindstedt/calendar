// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Orthographic hyphenation, so a name too long for a month cell's line breaks
// at a syllable boundary with a hyphen — "Henri-etta", never "Henrie-tta".
//
// Why this exists rather than `hyphens: auto`: the CSS property depends on the
// engine shipping a hyphenation dictionary for the language, and it silently
// does nothing when there isn't one (headless Chromium has none — the word just
// overflows). A wall calendar whose text is built on measured constants cannot
// have its line breaking vary by browser, so the rules are ours.
//
// The machinery is shared; the *rules* are per-language and live in the pack
// files beside the name tables, because "which consonant clusters may start a
// syllable" is exactly the kind of country knowledge that must not leak out of
// `src/app/locale/`.
//
// The output carries U+00AD SOFT HYPHEN at each permitted break. That is the
// one mechanism every engine handles identically: the break is only taken when
// the line actually runs out, and the hyphen glyph is drawn automatically.

/** The soft hyphen inserted at each permitted break point. */
export const SOFT_HYPHEN = "­";

/** The longest consonant cluster considered as a syllable onset ("str"). */
const MAX_ONSET = 3;

export type HyphenationRules = {
  /** Lowercase vowel letters of the language. */
  readonly vowels: string;
  /** Vowel pairs that spell one sound and must never be split ("eu" in
   *  "Bartolomeus"). */
  readonly diphthongs: readonly string[];
  /** Consonant clusters of 2–3 letters that may begin a syllable, consulted
   *  only for runs of **three or more** consonants — "Långfredagen" breaks as
   *  "Lång-fredagen" because "fr" can start a syllable, and "Alexandra" as
   *  "Alexan-dra" because "dr" can.
   *
   *  Two-consonant runs deliberately do not consult this list: both languages
   *  simply divide them, which is why "Magnus" is "Mag-nus" and not "Ma-gnus"
   *  even though "gn" begins "gnaga". Applying the maximal-onset principle at
   *  every cluster is what a naive implementation gets wrong. */
  readonly onsets: readonly string[];
  /** Two-letter clusters that spell a single sound and therefore move to the
   *  next syllable whole ("ch"). The exception to the divide-a-pair rule. */
  readonly inseparable: readonly string[];
  /** Single consonants that cannot begin a syllable, so they close the
   *  preceding one instead. "x" spells two sounds and belongs to the vowel
   *  before it: "Box-ing", "Alex-ander" — never "Bo-xing". */
  readonly neverOnset: string;
  /** Letters that must remain before the first break. */
  readonly minLeading: number;
  /** Letters that must remain after the last break. */
  readonly minTrailing: number;
};

/**
 * The offsets inside a single word where a hyphen may be inserted.
 *
 * Between each pair of neighbouring vowels the consonants are divided by the
 * maximal-onset principle: as many of them as can legally begin a syllable go
 * with the following vowel, the rest close the preceding one. Two adjacent
 * vowels may be split unless they spell a diphthong.
 *
 * Every offset returned is a boundary the language permits, so whichever one
 * the line breaker reaches for, the result reads correctly.
 */
export function hyphenPoints(
  word: string,
  rules: HyphenationRules,
): readonly number[] {
  const lower = word.toLowerCase();
  if (lower.length < rules.minLeading + rules.minTrailing) return [];

  const isVowel = (i: number) => rules.vowels.includes(lower[i]);
  const vowels: number[] = [];
  for (let i = 0; i < lower.length; i++) if (isVowel(i)) vowels.push(i);

  const points: number[] = [];
  for (let v = 0; v + 1 < vowels.length; v++) {
    const a = vowels[v];
    const b = vowels[v + 1];
    const cluster = b - a - 1;

    if (cluster === 0) {
      // Vowel meeting vowel: a boundary unless the two spell one sound.
      if (!rules.diphthongs.includes(lower.slice(a, a + 2))) points.push(b);
      continue;
    }

    // How much of the consonant run the following syllable takes.
    //
    // One consonant by default — the ordinary "Ma-ria" case — and none at all
    // for a consonant that cannot open a syllable, which closes the preceding
    // one instead ("Box-ing").
    let take = rules.neverOnset.includes(lower[b - 1]) ? 0 : 1;

    const pair = lower.slice(b - 2, b);
    if (cluster === 2 && rules.inseparable.includes(pair)) {
      // A pair spelling one sound cannot be divided: "Christo-pher".
      take = 2;
    } else if (cluster >= 3) {
      // Only a long run is divided by maximal onset. Two consonants simply
      // split, which is the rule both languages actually follow.
      for (let k = Math.min(cluster, MAX_ONSET); k >= 2; k--) {
        if (rules.onsets.includes(lower.slice(b - k, b))) {
          take = k;
          break;
        }
      }
    }
    points.push(b - take);
  }

  return points.filter(
    (p) => p >= rules.minLeading && word.length - p >= rules.minTrailing,
  );
}

/** One word with soft hyphens at every permitted break. */
function hyphenateWord(word: string, rules: HyphenationRules): string {
  const points = hyphenPoints(word, rules);
  if (points.length === 0) return word;
  let out = "";
  let last = 0;
  for (const p of points) {
    out += word.slice(last, p) + SOFT_HYPHEN;
    last = p;
  }
  return out + word.slice(last);
}

/**
 * Soft-hyphenate every word in a string, leaving punctuation and spacing
 * exactly as they were — "Karin, Kajsa" keeps its comma and its space, and
 * only the names themselves gain break points.
 */
export function hyphenate(text: string, rules: HyphenationRules): string {
  return text.replace(/\p{L}+/gu, (word) => hyphenateWord(word, rules));
}

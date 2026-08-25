// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How many of a day's names a bounded surface prints.
//
// A name-day table is the country's, not the cell's: the Finnish almanac
// celebrates thirteen names on 15 August, and it is right to carry all
// thirteen (the name search and the contacts matching read the same table, so
// a trimmed one would make most Finnish names unfindable — see
// `locale/fi-fi.ts`). But a month cell is 47 px wide in portrait, and a run of
// thirteen names in it does not merely look bad: the caption band has no
// height of its own, so it grows upward until it is sitting on top of the
// day's own number.
//
// So the table stays whole and the *view* decides how much of it it can set.
// This is the same division the entry text already makes — `entryFont.ts`
// guesses, `entryFit.ts` measures the box the view actually left — and it
// has the same escape hatch: what a bounded surface had to cut, `DayZoom.tsx`
// prints in full, because a day held up close is the one surface with no box
// to measure against.

/**
 * The most names a bounded surface sets.
 *
 * Three, and it is a measurement rather than a taste call: it is what the
 * Swedish and Norwegian almanacs max out at, so it is the run the month
 * cell's 45.8 px caption line and its share of the cell were measured
 * against ("Kasper, Melker, Baltsar" is the longest three-name day either of
 * them prints). Re-measure it together with the caption font size if either
 * moves.
 */
export const MAX_PRINTED_NAMES = 3;

/** What a bounded surface prints of a day's names, and what it had to leave
 *  out. `hidden` is a count rather than the names themselves: nothing prints
 *  them, and a caller that wants them has the whole list already. */
export type PrintedNames = {
  readonly shown: readonly string[];
  readonly hidden: number;
};

/**
 * The first `limit` of a day's names, and how many did not fit.
 *
 * A limit of zero or less means "no limit" rather than "print nothing" —
 * an unbounded surface asks by not asking, and a surface that printed no
 * names at all would be answering a different question (the name-day toggle
 * already answers that one).
 */
export function namesThatFit(
  names: readonly string[],
  limit: number = MAX_PRINTED_NAMES,
): PrintedNames {
  if (limit <= 0 || names.length <= limit) return { shown: names, hidden: 0 };
  return { shown: names.slice(0, limit), hidden: names.length - limit };
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The vacation planner's domain: a year's holidays, the bridge days ("klämdagar")
// that turn a booked day into a long weekend, and the best set of those to book
// against a vacation-day budget.
//
// Everything here is pure — a locale pack, a year, a budget in, plain data out —
// so the whole thing is covered by `tests/vacation_test.ts` with no DOM.
//
// Two rules decide what counts as a day off, and both come from the pack rather
// than from a country conditional in here:
//
//   * `restWeekdays` — the weekend.
//   * a holiday with `off: true` — a day nobody works.
//
// Note `off`, never `red`: `red` is about ink, and the two genuinely differ. UK
// bank holidays close the country and are printed black; Swedish Julafton and
// Nyårsafton are named on every wall calendar and are workdays by law. Reading
// `red` here would give Britain a planner with no holidays in it at all.
//
// Leaving the Swedish eves bookable is deliberate: they are exactly the cheap,
// high-value days to spend an allowance on, and treating them as free would
// hide the year's best suggestions.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  addDays,
  daysBetween,
  toDayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import { holidayFor, type Holiday, type LocalePack } from "./locale/index.ts";

/** A holiday pinned to a concrete date in a concrete year. */
export type YearHoliday = Holiday & {
  key: DayKey;
  /** `Date.getDay()` numbering (0 = Sunday). */
  weekday: number;
};

/** One bookable suggestion: the workdays to take off, and the unbroken stretch
 *  of free days that booking them produces. */
export type BridgeBlock = {
  /** The workdays to book, in date order. Never empty. */
  days: readonly DayKey[];
  /** `days.length` — vacation days spent. */
  cost: number;
  /** First and last day of the resulting continuous break. */
  start: DayKey;
  end: DayKey;
  /** Days in that break, `cost` included. Always > `cost`. */
  length: number;
};

/** One continuous stretch of free days the plan delivers, and the workdays you
 *  book to get it.
 *
 *  This is what the plan reports rather than the raw blocks it chose, because
 *  chosen blocks merge: booking the Friday after New Year, the Monday after
 *  that weekend and the days after Epiphany is three suggestions but *one*
 *  eleven-day break, and listing it as three would read as three holidays. */
export type VacationBreak = {
  start: DayKey;
  end: DayKey;
  /** Days in the break, booked and free alike. */
  length: number;
  /** The workdays to book inside it, in date order. */
  days: readonly DayKey[];
  /** `days.length` — what this break costs from the allowance. */
  cost: number;
};

/** What a budget buys: which days to book, and what the year looks like
 *  afterwards. */
export type VacationPlan = {
  /** The breaks the plan produces, in date order. */
  breaks: readonly VacationBreak[];
  /** Vacation days the picks consume. Never above the budget. */
  spent: number;
  /** Budget the plan could not usefully spend. The planner runs out of
   *  holidays long before a full allowance runs out, and saying so is more
   *  honest than padding the plan with days that buy nothing. */
  unspent: number;
  /** Days off across every break the picks create — weekends and public
   *  holidays that merge into them included. */
  daysOff: number;
  /** The longest single unbroken break the plan produces. */
  longest: number;
};

/** Longest run of workdays the planner will offer to bridge. Past this a
 *  "bridge" is just a holiday you booked, and the list fills with noise. */
const MAX_BRIDGE = 5;

/** A suggestion has to be *about* a public holiday: the break it creates must
 *  contain one.
 *
 *  Without this rule the planner is technically correct and practically
 *  useless. Any Friday in the year returns three days off for one — there are
 *  52 of them, they all score 3.0, and they bury the dozen suggestions that
 *  are the reason to open the screen at all. Nobody needs to be told that
 *  taking a Friday off makes a long weekend; they need to be told which
 *  Friday is already half-paid-for by Kristi himmelsfärdsdag. */
function containsHoliday(
  pack: LocalePack,
  first: DayKey,
  from: number,
  to: number,
): boolean {
  for (let i = from; i <= to; i++) {
    const key = addDays(first, i);
    const parts = key.split("-");
    const holiday = holidayFor(
      pack,
      Number(parts[0]),
      Number(parts[1]),
      Number(parts[2]),
    );
    if (holiday?.off) return true;
  }
  return false;
}

/** Every holiday in the year, in date order. */
export function holidaysInYear(
  pack: LocalePack,
  year: number,
): readonly YearHoliday[] {
  return pack
    .holidays(year)
    .map((h) => {
      const key = toDayKey({ year, month: h.month, day: h.day });
      return { ...h, key, weekday: weekdayOf(key) };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** `Date.getDay()` for a day key. Noon UTC keeps the weekday stable whatever
 *  the host timezone does at midnight. */
function weekdayOf(key: DayKey): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

/** Whether the day is already free: the weekend, or a public holiday. */
export function isFreeDay(pack: LocalePack, key: DayKey): boolean {
  if (pack.restWeekdays.includes(weekdayOf(key))) return true;
  const parts = key.split("-");
  const holiday = holidayFor(
    pack,
    Number(parts[0]),
    Number(parts[1]),
    Number(parts[2]),
  );
  return holiday?.off ?? false;
}

/** The year plus a fortnight either side, so a Christmas break that runs into
 *  January is measured whole rather than clipped at the year boundary. */
function yearWindow(year: number): { first: DayKey; last: DayKey } {
  return {
    first: addDays(toDayKey({ year, month: 1, day: 1 }), -16),
    last: addDays(toDayKey({ year, month: 12, day: 31 }), 16),
  };
}

/** The window as a free/working bitmap, indexed from `first`. */
function freeMap(
  pack: LocalePack,
  year: number,
): {
  first: DayKey;
  free: boolean[];
} {
  const { first, last } = yearWindow(year);
  const span = daysBetween(first, last) + 1;
  const free = new Array<boolean>(span);
  for (let i = 0; i < span; i++) free[i] = isFreeDay(pack, addDays(first, i));
  return { first, free };
}

/** Measure the unbroken break around a set of booked indices. */
function breakAround(
  free: readonly boolean[],
  booked: ReadonlySet<number>,
  from: number,
  to: number,
): { start: number; end: number } {
  const off = (i: number) => (free[i] ?? false) || booked.has(i);
  let start = from;
  let end = to;
  while (start - 1 >= 0 && off(start - 1)) start--;
  while (end + 1 < free.length && off(end + 1)) end++;
  return { start, end };
}

/**
 * Every worthwhile way to spend vacation days this year, best first.
 *
 * The year is a run of free days, then a run of workdays, then free days
 * again. For each run of workdays the planner offers three shapes: book the
 * whole run and bridge the free days on both sides, book a prefix to extend the
 * break before it, or book a suffix to extend the break after it. A suggestion
 * only makes the list if it returns more free days than it costs.
 *
 * Ranked by return (free days per day booked), then by cost — a 1→4 comes
 * before a 2→8 because most people would rather bank the second day — then by
 * date, so the order is stable.
 */
export function bridgeBlocks(
  pack: LocalePack,
  year: number,
): readonly BridgeBlock[] {
  const { first, free } = freeMap(pack, year);
  const inYear = (i: number) => addDays(first, i).slice(0, 4) === String(year);
  const blocks: BridgeBlock[] = [];
  const seen = new Set<string>();

  const add = (from: number, to: number) => {
    // Suggestions are indexed by the days they book, so a prefix that happens
    // to equal the whole run is not also listed as a bridge.
    const id = `${from}-${to}`;
    if (seen.has(id)) return;
    // A block is this year's if any booked day falls in it — the Christmas
    // bridge belongs to the year you book it in.
    if (!inYear(from) && !inYear(to)) return;
    const booked = new Set<number>();
    for (let i = from; i <= to; i++) booked.add(i);
    const span = breakAround(free, booked, from, to);
    const cost = to - from + 1;
    const length = span.end - span.start + 1;
    if (length <= cost) return;
    if (!containsHoliday(pack, first, span.start, span.end)) return;
    seen.add(id);
    blocks.push({
      days: Array.from({ length: cost }, (_, k) => addDays(first, from + k)),
      cost,
      start: addDays(first, span.start),
      end: addDays(first, span.end),
      length,
    });
  };

  for (let i = 0; i < free.length; i++) {
    if (free[i]) continue;
    let end = i;
    while (end + 1 < free.length && !free[end + 1]) end++;
    const runLength = end - i + 1;
    if (runLength <= MAX_BRIDGE) add(i, end); // bridge the whole run
    for (let k = 1; k < Math.min(runLength, MAX_BRIDGE + 1); k++) {
      add(i, i + k - 1); // prefix: extend the break before the run
      add(end - k + 1, end); // suffix: extend the break after it
    }
    i = end;
  }

  return blocks.sort(
    (a, b) =>
      b.length / b.cost - a.length / a.cost ||
      a.cost - b.cost ||
      a.start.localeCompare(b.start),
  );
}

/**
 * Spend a budget of vacation days on the best combination of bridges.
 *
 * Greedy on *marginal* return: each round, every candidate still affordable is
 * scored by how many extra free days it would add **to the plan already
 * chosen**, and the best per-day wins. Scoring the margin rather than the
 * block's own length is what keeps the arithmetic honest — booking the Friday
 * before a weekend and the Monday after it produces one four-day break, not two
 * three-day ones, and a planner that added up the brochure numbers would
 * promise six.
 *
 * Greedy, not optimal: this is a knapsack, and the exact answer is not worth
 * the runtime here. It never overstates what it found, because every number it
 * reports is measured off the chosen day set rather than accumulated.
 */
export function planVacation(
  pack: LocalePack,
  year: number,
  budget: number,
): VacationPlan {
  const { first, free } = freeMap(pack, year);
  const candidates = bridgeBlocks(pack, year);
  const index = (key: DayKey) => daysBetween(first, key);

  const booked = new Set<number>();
  let spent = 0;
  let daysOff = measure(free, booked).total;

  for (;;) {
    let best: { block: BridgeBlock; gain: number } | null = null;
    for (const block of candidates) {
      if (spent + block.cost > budget) continue;
      const days = block.days.map(index);
      if (days.some((i) => booked.has(i))) continue;
      const trial = new Set(booked);
      for (const i of days) trial.add(i);
      const gain = measure(free, trial).total - daysOff;
      // Strictly better than simply taking the days off. Once a break has been
      // extended to the point where another day buys exactly one more day, the
      // planner has nothing left to say and should hand the budget back rather
      // than pad the plan with picks that are worth nothing.
      if (gain <= block.cost) continue;
      if (!best || gain / block.cost > best.gain / best.block.cost) {
        best = { block, gain };
      }
    }
    if (!best) break;
    for (const day of best.block.days) booked.add(index(day));
    spent += best.block.cost;
    daysOff += best.gain;
  }

  const final = measure(free, booked);
  return {
    breaks: final.breaks.map((b) => ({
      start: addDays(first, b.start),
      end: addDays(first, b.end),
      length: b.end - b.start + 1,
      days: b.booked.map((i) => addDays(first, i)),
      cost: b.booked.length,
    })),
    spent,
    unspent: Math.max(0, budget - spent),
    daysOff: final.total,
    longest: final.longest,
  };
}

/** Walk the window and collect the unbroken runs of free days that a booked
 *  day takes part in — an untouched weekend in March is not something the plan
 *  delivered, so it is not counted.
 *
 *  Every figure the planner reports comes from here, measured off the chosen
 *  day set rather than accumulated as blocks are picked. That is what stops
 *  two suggestions sharing a weekend from being sold twice. */
function measure(
  free: readonly boolean[],
  booked: ReadonlySet<number>,
): {
  total: number;
  longest: number;
  breaks: { start: number; end: number; booked: number[] }[];
} {
  const breaks: { start: number; end: number; booked: number[] }[] = [];
  let start = -1;
  const flush = (end: number) => {
    if (start >= 0) {
      const inside: number[] = [];
      for (let i = start; i <= end; i++) if (booked.has(i)) inside.push(i);
      if (inside.length > 0) breaks.push({ start, end, booked: inside });
    }
    start = -1;
  };
  for (let i = 0; i < free.length; i++) {
    if (free[i] || booked.has(i)) {
      if (start < 0) start = i;
    } else {
      flush(i - 1);
    }
  }
  flush(free.length - 1);

  let total = 0;
  let longest = 0;
  for (const b of breaks) {
    const length = b.end - b.start + 1;
    total += length;
    longest = Math.max(longest, length);
  }
  return { total, longest, breaks };
}

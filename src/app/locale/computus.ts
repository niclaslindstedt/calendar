// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Shared date arithmetic for the country packs' holiday rules. This is pack
// *infrastructure* (like `types.ts`), not a pack: packs may import from here,
// never from each other.

/** Easter Sunday (Gregorian) for a year — the anonymous Meeus/Jones/Butcher
 *  computus. Returns { month, day }, both 1-based. */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** The date `offset` days after a (year, month, day), as { month, day }.
 *  Stays inside the year for the offsets holiday rules use. */
export function addToDate(
  year: number,
  month: number,
  day: number,
  offset: number,
): { month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + offset, 12));
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** `Date.getDay()` weekday of a calendar day. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** The first `weekday` (0–6) on or after (month, day) in `year` — expresses
 *  rules like "the Saturday between 20 and 26 June". */
export function weekdayOnOrAfter(
  year: number,
  month: number,
  day: number,
  weekday: number,
): { month: number; day: number } {
  const shift = (weekday - weekdayOf(year, month, day) + 7) % 7;
  return addToDate(year, month, day, shift);
}

/** The `n`th (1-based) `weekday` of a month — "first Monday of May". */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number,
): { month: number; day: number } {
  const first = weekdayOnOrAfter(year, month, 1, weekday);
  return addToDate(year, first.month, first.day, (n - 1) * 7);
}

/** The last `weekday` of a month — "last Monday of August". */
export function lastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
): { month: number; day: number } {
  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const back = (weekdayOf(year, month, lastDay) - weekday + 7) % 7;
  return { month, day: lastDay - back };
}

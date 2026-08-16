// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The country-pack registry. Adding a country: create the pack file next to
// the existing ones (copy `en-gb.ts` as the template) and add it to `LOCALES`
// below — nothing else in the app changes.

import { enGB } from "./en-gb.ts";
import { svSE } from "./sv-se.ts";
import type { LocalePack } from "./types.ts";

export type { Holiday, LocalePack, NameDayTable } from "./types.ts";
export {
  holidayFor,
  isRedDay,
  isRedWeekday,
  monthName,
  nameDaysFor,
  weekNumber,
  weekdayName,
  weekdayOrder,
} from "./types.ts";

/** Every available country pack, in picker display order. */
export const LOCALES: readonly LocalePack[] = [enGB, svSE];

export const DEFAULT_LOCALE_ID = "en-GB";

/** Resolve a persisted pack id, falling back to the default for unknown
 *  values (a pack removed in a newer build, a hand-edited setting). */
export function getLocale(id: string): LocalePack {
  return LOCALES.find((l) => l.id === id) ?? LOCALES[0];
}

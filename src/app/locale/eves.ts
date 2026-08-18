// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Helgdagsaftnar — the eves before a public holiday, and how much of one is
// worked.
//
// This is the piece of a wall calendar that is not a fact about the country
// but a fact about your *employer*. Sweden's law names thirteen red days and
// stops there: Julafton, Midsommarafton and Nyårsafton are, by law, ordinary
// working days. In practice almost nobody works them, because almost every
// kollektivavtal hands them back — and the ones the agreements do NOT hand
// back (Valborgsmässoafton, Skärtorsdagen) are just as consistently worked.
// Between those poles sit the eves that are usually a half day.
//
// So an eve carries what most agreements say (`collective`) and the reader
// overrides it where their own workplace differs. That is the whole feature:
// the shipped default is the common case, and the setting is there because
// the common case is not the law.
//
// Like everything else under `locale/`, this is pack machinery rather than a
// pack: packs import from here, never from each other.

import type { Holiday, LocalePack } from "./types.ts";

/** How much of an eve is worked.
 *
 *  Three states rather than two because the middle one is real and common:
 *  Trettondagsafton is not a day off and is not an ordinary day either. The
 *  vacation planner treats `"half"` as a workday — you still spend a whole
 *  vacation day to take one — but the holidays list says which it is, because
 *  "half day" is the answer to the question you opened the screen with. */
export const EVE_STATUSES = ["off", "half", "work"] as const;

export type EveStatus = (typeof EVE_STATUSES)[number];

/** One eve the country's calendar names, and what most collective agreements
 *  make of it. */
export type Eve = {
  /** Stable id, persisted in settings. Unique within a pack. */
  readonly id: string;
  /** The eve's name in the pack's own language — what the calendar prints. */
  readonly name: string;
  /** Where the eve falls in a concrete year. Fixed for Julafton, computed
   *  for the ones that hang off a movable holiday. */
  readonly date: (year: number) => { month: number; day: number };
  /** What most of the country's collective agreements say — the shipped
   *  default, and what the reader is overriding when they change it. */
  readonly collective: EveStatus;
};

/** The reader's overrides, eve id → status. A missing id means "whatever the
 *  agreements say", so an untouched install stores nothing at all. */
export type EveChoices = Readonly<Record<string, EveStatus>>;

export const NO_EVE_CHOICES: EveChoices = {};

function isEveStatus(value: unknown): value is EveStatus {
  return (EVE_STATUSES as readonly string[]).includes(value as string);
}

/** The effective status of an eve: the reader's override, or the agreements'
 *  default. */
export function eveStatus(eve: Eve, choices: EveChoices): EveStatus {
  const chosen = choices[eve.id];
  return isEveStatus(chosen) ? chosen : eve.collective;
}

/** Whether anything has been overridden away from the collective default —
 *  what decides whether the settings section offers to put it all back. */
export function hasEveOverrides(
  eves: readonly Eve[],
  choices: EveChoices,
): boolean {
  return eves.some((eve) => eveStatus(eve, choices) !== eve.collective);
}

/** A stored choices map, read against the pack it belongs to: ids that pack
 *  does not have and statuses that are not statuses are dropped rather than
 *  carried into the calendar.
 *
 *  Settings are a plain JSON blob in localStorage, the country can change
 *  under a stored map, and a pack can lose an eve between builds — so the eve
 *  list is required rather than optional. A country with no eves keeps
 *  nothing, which is the case that would quietly slip through a lenient
 *  reading. */
export function coerceEveChoices(
  raw: unknown,
  eves: readonly Eve[],
): EveChoices {
  if (typeof raw !== "object" || raw === null) return NO_EVE_CHOICES;
  const known = new Set(eves.map((eve) => eve.id));
  const out: Record<string, EveStatus> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!known.has(id)) continue;
    if (isEveStatus(value)) out[id] = value;
  }
  return out;
}

/** The eves of a year as calendar entries.
 *
 *  An eve is never `red` — that is the whole point of it, and the day it
 *  precedes is the red one. It is `off` exactly when nobody works it, which
 *  is what the vacation planner reads. */
export function eveHolidays(
  eves: readonly Eve[],
  year: number,
  choices: EveChoices = NO_EVE_CHOICES,
): Holiday[] {
  return eves.map((eve) => {
    const status = eveStatus(eve, choices);
    return {
      ...eve.date(year),
      name: eve.name,
      red: false,
      off: status === "off",
      eve: status,
    };
  });
}

// Derived packs are memoised so the same (pack, choices) pair keeps handing
// back the same object: `holidayFor` caches its per-year lookup tables against
// the pack identity, and a fresh pack on every render would rebuild them on
// every render. The map is capped because the settings dialog streams a new
// draft on every tap — a session produces a handful of distinct combinations,
// not thousands, but nothing here should be able to grow without bound.
const MEMO_LIMIT = 32;
const derived = new Map<string, LocalePack>();

/** A stable key for a set of choices — only the overrides that actually
 *  differ, in a fixed order, so two equal drafts hash alike. */
function signature(eves: readonly Eve[], choices: EveChoices): string {
  return eves
    .filter((eve) => eveStatus(eve, choices) !== eve.collective)
    .map((eve) => `${eve.id}:${eveStatus(eve, choices)}`)
    .join(",");
}

/**
 * The pack as this reader's workplace sees it.
 *
 * The base pack already names its eves at the collective default, so a reader
 * who has changed nothing gets the base pack back untouched — which keeps the
 * shipped calendar correct for anyone who never opens the setting, and keeps
 * every caller that has no settings to hand (the tests, a future export)
 * honest rather than eve-less.
 */
export function withEveChoices(
  pack: LocalePack,
  choices: EveChoices,
): LocalePack {
  const sig = signature(pack.eves, choices);
  if (sig === "") return pack;

  const key = `${pack.id}|${sig}`;
  const hit = derived.get(key);
  if (hit) return hit;

  const next: LocalePack = {
    ...pack,
    holidays: (year) => [
      // The base pack's eves are replaced wholesale rather than patched: the
      // eve list is the source of both, so rebuilding is simpler than
      // matching one against the other, and `eve` is what tells them apart.
      ...pack.holidays(year).filter((h) => h.eve === undefined),
      ...eveHolidays(pack.eves, year, choices),
    ],
  };

  if (derived.size >= MEMO_LIMIT) {
    const oldest = derived.keys().next().value;
    if (oldest !== undefined) derived.delete(oldest);
  }
  derived.set(key, next);
  return next;
}

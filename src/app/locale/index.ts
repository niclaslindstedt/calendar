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

/** The pack used when the device's own languages match nothing. */
export const FALLBACK_LOCALE_ID = "en-GB";

/** Resolve a persisted pack id, falling back to the default for unknown
 *  values (a pack removed in a newer build, a hand-edited setting). */
export function getLocale(id: string): LocalePack {
  return (
    LOCALES.find((l) => l.id === id) ??
    LOCALES.find((l) => l.id === FALLBACK_LOCALE_ID) ??
    LOCALES[0]
  );
}

/** `"sv-SE"` → `{ lang: "sv", region: "SE" }`; the region is null for a bare
 *  language tag. Extension and script subtags are ignored — a country pack
 *  only ever keys off language + region. */
function subtags(tag: string): { lang: string; region: string | null } {
  const parts = tag.split(/[-_]/).filter(Boolean);
  const lang = (parts[0] ?? "").toLowerCase();
  // The region is the first 2-letter (ISO 3166-1) or 3-digit (UN M.49)
  // subtag after the language; anything else is a script or a variant.
  const region =
    parts.slice(1).find((p) => /^[A-Za-z]{2}$/.test(p) || /^\d{3}$/.test(p)) ??
    null;
  return { lang, region: region ? region.toUpperCase() : null };
}

/** Pick the country pack that best matches a device's preferred languages,
 *  most-preferred first (`navigator.languages`). Each tag is tried in turn,
 *  strongest match first: the exact pack id, then the country (a Swede with
 *  an English UI still wants the Swedish calendar), then the language. The
 *  first tag that matches anything wins, so a device asking for `sv-SE, en`
 *  never falls through to the English pack. */
export function matchLocaleId(tags: readonly string[]): string {
  for (const tag of tags) {
    if (typeof tag !== "string" || !tag.trim()) continue;
    const want = subtags(tag);

    const exact = LOCALES.find((l) => l.id.toLowerCase() === tag.toLowerCase());
    if (exact) return exact.id;

    if (want.region) {
      const byRegion = LOCALES.find(
        (l) => subtags(l.id).region === want.region,
      );
      if (byRegion) return byRegion.id;
    }

    const byLang = LOCALES.find((l) => subtags(l.id).lang === want.lang);
    if (byLang) return byLang.id;
  }
  return FALLBACK_LOCALE_ID;
}

/** The country pack a fresh install starts on: whatever the device's locale
 *  settings ask for. Read once at module load — a user who then changes the
 *  setting has it persisted, so this never overrides a stored choice. */
export function detectLocaleId(): string {
  if (typeof navigator === "undefined") return FALLBACK_LOCALE_ID;
  const tags =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : [];
  return matchLocaleId(tags);
}

/** The default country pack for this device. */
export const DEFAULT_LOCALE_ID = detectLocaleId();

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's i18n runtime, built once from the framework's `createI18n`
// factory over the app's own catalogs. English is bundled; every other
// catalog is code-split and loaded on demand. The app owns the strings (these catalogs);
// the framework owns the machinery that loads, caches, resolves, and
// re-renders against them — including the preference mirror and the
// first-paint gate `LanguageRoot` provides.
//
// Note the split: this is the UI language (chrome strings). The *country
// calendar* (week start, name days, red days) is a separate setting backed by
// the packs in `../locale/` — a Swede abroad can run an English UI over the
// Swedish calendar, or vice versa.

import {
  createI18n,
  type MessageKeyOf,
  type TFunction as TFunctionOf,
} from "@niclaslindstedt/oss-framework/i18n";

import { en, type Catalog } from "./en.ts";

export type Lang = "en" | "sv" | "de" | "fr" | "nl" | "fi" | "nb";
export type { Catalog };

/** A dotted key into the catalog — for components that carry a key around
 *  (the settings tab table) rather than translating on the spot. */
export type MessageKey = MessageKeyOf<Catalog>;
export type TFunction = TFunctionOf<Catalog>;

const BCP47: Record<Lang, string> = {
  en: "en-GB",
  sv: "sv-SE",
  de: "de-DE",
  fr: "fr-FR",
  nl: "nl-NL",
  fi: "fi-FI",
  nb: "nb-NO",
};

/** The languages the picker offers, in the order it offers them: English
 *  first because it is the fallback everything resolves to, then the rest
 *  alphabetically by the name each language calls itself.
 *
 *  The flag is decoration beside a label that already says the language, the
 *  way the country picker's is — and it is a flag of *a* country that speaks
 *  the language, not a claim about which. `key` points at the catalog entry
 *  holding the endonym, which reads the same in every catalog. */
export const LANGUAGES: readonly {
  id: Lang;
  flag: string;
  key: MessageKey;
}[] = [
  { id: "en", flag: "\u{1F1EC}\u{1F1E7}", key: "settings.languageEnglish" },
  { id: "de", flag: "\u{1F1E9}\u{1F1EA}", key: "settings.languageGerman" },
  { id: "fr", flag: "\u{1F1EB}\u{1F1F7}", key: "settings.languageFrench" },
  { id: "nl", flag: "\u{1F1F3}\u{1F1F1}", key: "settings.languageDutch" },
  { id: "nb", flag: "\u{1F1F3}\u{1F1F4}", key: "settings.languageNorwegian" },
  { id: "fi", flag: "\u{1F1EB}\u{1F1EE}", key: "settings.languageFinnish" },
  { id: "sv", flag: "\u{1F1F8}\u{1F1EA}", key: "settings.languageSwedish" },
];

export const i18n = createI18n<Lang, Catalog>({
  fallbackLang: "en",
  fallbackCatalog: en,
  // English is bundled as the fallback; every other catalog is a chunk of its
  // own, fetched the first time it is asked for. Adding a language is a
  // loader here, a tag below, and a row in `LANGUAGES`.
  loaders: {
    sv: () => import("./sv.ts").then((m) => m.sv),
    de: () => import("./de.ts").then((m) => m.de),
    fr: () => import("./fr.ts").then((m) => m.fr),
    nl: () => import("./nl.ts").then((m) => m.nl),
    fi: () => import("./fi.ts").then((m) => m.fi),
    nb: () => import("./nb.ts").then((m) => m.nb),
  },
  // Two-letter codes → concrete BCP-47 tags for `<html lang>` / Intl.
  toBcp47: (lang) => BCP47[lang] ?? "en-GB",
  storageKey: "calendar:language",
  eventName: "calendar:language",
});

export const { LanguageRoot, useT, useLang, setLanguage, supportedLangs } =
  i18n;

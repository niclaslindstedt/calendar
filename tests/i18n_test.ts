// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { flattenCatalog } from "@niclaslindstedt/oss-framework/i18n";

import { en } from "../src/app/i18n/en.ts";
import { sv } from "../src/app/i18n/sv.ts";
import { de } from "../src/app/i18n/de.ts";
import { fi } from "../src/app/i18n/fi.ts";
import { fr } from "../src/app/i18n/fr.ts";
import { nb } from "../src/app/i18n/nb.ts";
import { nl } from "../src/app/i18n/nl.ts";

// "No account" in any language: the app says what is true instead — nothing
// to sign up for, no sign-in (the owner's decision).
const NO_ACCOUNT =
  /no account|inget? (?:något )?konto|utan (?:något )?konto|ingen konto|uten (?:noen )?konto|kein(?:e|en)? Konto|ohne (?:ein )?Konto|ilman tiliä|ei tiliä|aucun compte|sans compte|geen account|zonder account/i;

describe("i18n catalogs", () => {
  it("Swedish covers exactly the English key set", () => {
    const enKeys = [...flattenCatalog(en).keys()].sort();
    const svKeys = [...flattenCatalog(sv).keys()].sort();
    expect(svKeys).toEqual(enKeys);
  });

  it("no catalog leaf is empty", () => {
    for (const [key, value] of flattenCatalog(en)) {
      expect(value.trim(), `en:${key}`).not.toBe("");
    }
    for (const [key, value] of flattenCatalog(sv)) {
      expect(value.trim(), `sv:${key}`).not.toBe("");
    }
  });

  it("no catalog says there is no account, in any language", () => {
    for (const [lang, catalog] of Object.entries({
      en,
      sv,
      de,
      fi,
      fr,
      nb,
      nl,
    })) {
      for (const [key, value] of flattenCatalog(catalog)) {
        expect(value, `${lang}:${key}`).not.toMatch(NO_ACCOUNT);
      }
    }
  });
});

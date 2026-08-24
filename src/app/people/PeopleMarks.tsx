// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The birthdays a day carries, as a run of text.
//
// Name days need no component of their own: the name is ALREADY on the page —
// the almanac printed it — so a name day is marked by setting that name apart
// inside the run the view was drawing anyway (`NameDayNames`'s `celebrated`
// prop). A birthday is the opposite: nothing on the calendar said it, so it
// is text the day did not have before, and this is what puts it there.
//
// All three views print the same run, so they share this rather than each
// growing a copy — the same reason `NameDayNames` is shared. It renders into
// whichever slot the view gives the day's names, so a reader who has moved
// their name days to another corner moves the birthdays with them.

import { useT } from "../i18n/index.ts";
import {
  hyphenate as hyphenateText,
  type LocalePack,
} from "../locale/index.ts";
import { minHyphenatedLetters } from "../textSize.ts";
import type { Contact } from "./types.ts";

/**
 * What the cake glyph costs the caption line, in letters.
 *
 * Measured the way every other length in this app is (AGENTS.md): with
 * `canvas.measureText` over the real strings, in a real month cell's computed
 * caption font, at 393 px of viewport. The band is 44.8 px there; the longest
 * name that holds it whole is "Bartolomeus" at 11 letters, which is the
 * measured constant `MIN_HYPHENATED_LETTERS - 1` and confirms it. "🎂 " is
 * 11.2 px, and after it the longest name that still holds the line whole is
 * "Margareta" at **9** — so the glyph costs two letters of the threshold, not
 * the three its raw width against an average letter would suggest. Letters are
 * not all one width, which is exactly why the constant comes from the strings
 * rather than from the arithmetic.
 *
 * Re-measure it with the caption font, alongside `MIN_HYPHENATED_LETTERS`.
 */
export const BIRTHDAY_GLYPH_LETTERS = 2;

type Props = {
  people: readonly Contact[];
  pack: LocalePack;
  /** Soft-hyphenate each name — for the month cell, whose line is 45 px wide.
   *  The wider views leave names whole (same contract as `NameDayNames`). */
  hyphenated?: boolean;
  /** The scale the caption band is set at (Settings → Calendar → View).
   *
   *  A scale rather than a finished letter count, unlike `NameDayNames`,
   *  because this run's first line is not a whole line: the glyph is in front
   *  of it. Handing in the names' own threshold would leave a long first name
   *  unhyphenated and strand the glyph alone on the line above it — which is
   *  what this prop exists to stop. */
  scale?: number;
};

export function PeopleMarks({ people, pack, hyphenated, scale = 1 }: Props) {
  const t = useT();
  if (people.length === 0) return null;
  // The threshold for THIS run: the caption line, less what the glyph took.
  const minWordLength = minHyphenatedLetters(scale, BIRTHDAY_GLYPH_LETTERS);
  return (
    <span className="cal-people block leading-[1.25]">
      {/* The cake carries the whole meaning of this line, which is why it is
          the one piece of the calendar drawn as an emoji rather than set as
          type: a birthday needs no label in either shipped language, and a
          word like "Birthday:" would take a month cell's entire 46 px line
          before the name got a letter. It is decoration to a screen reader —
          the accessible name below says it in words. */}
      <span aria-hidden="true">🎂 </span>
      <span className="sr-only">{t("people.birthdayLabel")} </span>
      {people.map((contact, i) => (
        <span key={contact.id}>
          {i > 0 && ", "}
          {hyphenated
            ? hyphenateText(displayName(contact), pack.hyphenation, {
                minWordLength,
              })
            : displayName(contact)}
        </span>
      ))}
    </span>
  );
}

/** What a birthday prints: the given name, not the whole contact card.
 *
 *  A month cell is 47 px wide, and "Anna" fits where "Anna Andersson" cannot
 *  — but the reason is not only width. A wall calendar on a kitchen wall is
 *  read by whoever walks past it, and a surname is the part of a name that
 *  identifies a stranger to a stranger. The first name is what the household
 *  calls them, and it is enough to know whose day it is. */
export function displayName(contact: Contact): string {
  const structured = contact.firstName?.trim();
  if (structured) return structured;
  return contact.name.trim().split(/\s+/).filter(Boolean)[0] ?? contact.name;
}

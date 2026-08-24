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
import type { Contact } from "./types.ts";

type Props = {
  people: readonly Contact[];
  pack: LocalePack;
  /** Soft-hyphenate each name — for the month cell, whose line is 46 px wide.
   *  The wider views leave names whole (same contract as `NameDayNames`). */
  hyphenated?: boolean;
  /** The letter count below which a name is left whole; the month cell
   *  derives it from the size its captions are set at. */
  minWordLength?: number;
};

export function PeopleMarks({
  people,
  pack,
  hyphenated,
  minWordLength,
}: Props) {
  const t = useT();
  if (people.length === 0) return null;
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

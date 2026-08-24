// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What a person is, as far as this calendar is concerned: a name, a birthday,
// and an id to remember them by.
//
// Deliberately the SMALLEST shape that answers "whose day is this": a name to
// print and to look up in the almanac, and a month and day to mark. A host
// handing these over has a great deal more about the person — numbers,
// addresses, photographs, the relationships between them — and none of it is
// asked for, because none of it draws a calendar. See `contactsHost.ts` for
// the seam that fills these in, and `docs/features/contacts.md` for what that
// restraint is worth.

/** A person's birthday, as a wall calendar needs it: the day it falls on, and
 *  the year only if the device happens to know it (many contact stores hold a
 *  birthday with no year at all, which is a perfectly good birthday). */
export type Birthday = {
  /** 1-12. */
  readonly month: number;
  /** 1-31. */
  readonly day: number;
  /** The year they were born, when known. */
  readonly year?: number;
};

/** One person the calendar may mark days for. */
export type Contact = {
  /** The host's own opaque identifier, stable across launches.
   *
   *  This is the ONLY field the app ever writes down — see `selection.ts`.
   *  It means nothing outside the device's own contact store, which is what
   *  makes the persisted opt-in list carry no personal data. */
  readonly id: string;
  /** The whole name, as the contact store spells it — what gets printed. */
  readonly name: string;
  /** The given name(s), which is what a name day is looked up under. Absent
   *  when the store has no structured name; {@link givenNames} falls back to
   *  the display name then. */
  readonly firstName?: string;
  /** Their birthday, when the store has one. A contact with neither a
   *  birthday nor a name in the almanac is simply never celebrated — they
   *  are still offered in Settings, because a contact store gains birthdays
   *  over time and a list that hid them would look broken. */
  readonly birthday?: Birthday;
};

/** Whether a value from outside (a host's `list()`, a hand-edited setting) is
 *  a usable contact. Hosts are native code across a message bridge, so this
 *  is a real boundary rather than a formality: a malformed entry is dropped
 *  rather than allowed to draw a day. */
export function isContact(value: unknown): value is Contact {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<Contact>;
  if (typeof c.id !== "string" || c.id === "") return false;
  if (typeof c.name !== "string" || c.name.trim() === "") return false;
  if (c.firstName !== undefined && typeof c.firstName !== "string")
    return false;
  return c.birthday === undefined || isBirthday(c.birthday);
}

/** Whether a value is a birthday this calendar can mark a day for. Rejects
 *  the impossible dates a contact store will occasionally hand over (month 0
 *  for "unknown", day 31 of a 30-day month) — a birthday that cannot fall on
 *  a day is not one. */
export function isBirthday(value: unknown): value is Birthday {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Partial<Birthday>;
  if (!Number.isInteger(b.month) || !Number.isInteger(b.day)) return false;
  const month = b.month as number;
  const day = b.day as number;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(month)) return false;
  return b.year === undefined || (Number.isInteger(b.year) && b.year > 0);
}

/** The longest a month can be — February counts 29, because a 29 February
 *  birthday is a real birthday and {@link import("./celebrations.ts")} is what
 *  decides which day to print it on in a year that has no such date. */
function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** The names a person might be celebrated under in an almanac.
 *
 *  A given-name field is not one name: "Britt Marie" is two words and one
 *  person, "Anna-Karin" is two names joined, and either half may be the one
 *  the almanac prints. So the whole field is offered *and* each word of it,
 *  and the folding in `nameKey` does the rest — it already strips the hyphen,
 *  so "Anna-Karin" reaches the table both whole and as its halves.
 *
 *  With no structured given name the display name is all there is, and only
 *  its FIRST word is taken: the rest of that string is a surname, and a
 *  surname is not a name day. "Andersson" is in nobody's almanac, but the day
 *  a search of the whole string does find one is the day this marks the wrong
 *  person — so the fallback is deliberately the narrow one. */
export function givenNames(contact: Contact): readonly string[] {
  const structured = contact.firstName?.trim();
  if (!structured) {
    const first = contact.name.trim().split(/\s+/).filter(Boolean)[0];
    return first ? [first] : [];
  }
  // Split on the hyphen as well as the space. `nameKey` folds a hyphen away,
  // so "Anna-Karin" reaches the almanac as `anakarin` — which is nobody's
  // name day. Anna's day and Karin's day are two days and both are hers, and
  // splitting here is the only place that can be said.
  const words = structured.split(/[\s\u2010-\u2015-]+/).filter(Boolean);
  // The whole field first: a two-word given name that IS an almanac entry
  // ("Britt Marie") should match as itself before either of its halves does.
  return words.length > 1 ? [structured, ...words] : words;
}

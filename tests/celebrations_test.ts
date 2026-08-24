// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Whose day is this — the pure matching behind the contacts feature
// (`src/app/people/celebrations.ts`), and the name shapes it is fed
// (`src/app/people/types.ts`).
//
// The tests that matter here are the ones about NAMES: a contact store spells
// a name the way the person writes it and an almanac spells it the way the
// almanac does, and the whole feature is worth nothing if those two never
// meet. The birthday cases are arithmetic, with one real question in them —
// what a 29 February birthday does in a year that has no 29 February.

import { describe, expect, it } from "vitest";

import {
  celebratedNames,
  celebrationsOn,
  dateKey,
  EMPTY_PEOPLE,
  indexPeople,
  isLeapYear,
  turningAge,
} from "../src/app/people/celebrations.ts";
import { givenNames, isContact } from "../src/app/people/types.ts";
import type { Contact } from "../src/app/people/types.ts";
import { enGB } from "../src/app/locale/en-gb.ts";
import { svSE } from "../src/app/locale/sv-se.ts";

function contact(over: Partial<Contact> & { id: string }): Contact {
  return { name: over.id, ...over };
}

describe("dateKey", () => {
  it("pads to the packs' own MM-DD key shape", () => {
    expect(dateKey(1, 6)).toBe("01-06");
    expect(dateKey(12, 24)).toBe("12-24");
  });
});

describe("isLeapYear", () => {
  it("follows the Gregorian rule, centuries included", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe("indexPeople — birthdays", () => {
  it("marks the day a birthday falls on", () => {
    const anna = contact({
      id: "1",
      name: "Anna Andersson",
      firstName: "Anna",
      birthday: { month: 7, day: 14, year: 1988 },
    });
    const index = indexPeople(enGB, [anna]);
    expect(celebrationsOn(index, 2026, 7, 14).birthdays).toEqual([anna]);
    expect(celebrationsOn(index, 2026, 7, 13).birthdays).toEqual([]);
  });

  it("marks a birthday with no year — most contact stores have none", () => {
    const sam = contact({ id: "1", birthday: { month: 3, day: 2 } });
    const index = indexPeople(enGB, [sam]);
    expect(celebrationsOn(index, 2026, 3, 2).birthdays).toEqual([sam]);
  });

  it("gathers everyone born on the same day", () => {
    const a = contact({ id: "a", birthday: { month: 5, day: 1 } });
    const b = contact({ id: "b", birthday: { month: 5, day: 1 } });
    const index = indexPeople(enGB, [a, b]);
    expect(celebrationsOn(index, 2026, 5, 1).birthdays).toHaveLength(2);
  });

  it("is empty for a contact with no birthday and no name day", () => {
    const index = indexPeople(enGB, [contact({ id: "1", name: "Zzyzx" })]);
    expect(index.empty).toBe(true);
  });
});

describe("indexPeople — the leap day", () => {
  const leapling = contact({
    id: "1",
    name: "Kim",
    birthday: { month: 2, day: 29, year: 2000 },
  });
  const index = indexPeople(enGB, [leapling]);

  it("prints on the 29th in a leap year, and not on the 28th", () => {
    expect(celebrationsOn(index, 2028, 2, 29).birthdays).toEqual([leapling]);
    expect(celebrationsOn(index, 2028, 2, 28).birthdays).toEqual([]);
  });

  it("stands in on the 28th in a common year", () => {
    expect(celebrationsOn(index, 2026, 2, 28).birthdays).toEqual([leapling]);
  });

  it("does not double up with somebody actually born on the 28th", () => {
    const other = contact({ id: "2", birthday: { month: 2, day: 28 } });
    const both = indexPeople(enGB, [leapling, other]);
    expect(celebrationsOn(both, 2026, 2, 28).birthdays).toHaveLength(2);
    expect(celebrationsOn(both, 2028, 2, 28).birthdays).toEqual([other]);
  });

  it("keeps the 28th's own name days when a leapling stands in on it", () => {
    // 28 February is Maria/Maja in the Swedish almanac; the stand-in must not
    // replace that day's names with the leap day's (there are none).
    const svIndex = indexPeople(svSE, [
      contact({ id: "1", birthday: { month: 2, day: 29 } }),
      contact({ id: "2", name: "Maria", firstName: "Maria" }),
    ]);
    const day = celebrationsOn(svIndex, 2026, 2, 28);
    expect(day.birthdays).toHaveLength(1);
    expect(day.nameDays.map((n) => n.almanacName)).toContain("Maria");
  });
});

describe("indexPeople — name days", () => {
  it("celebrates a contact on their name's day", () => {
    const index = indexPeople(svSE, [
      contact({ id: "1", name: "Niklas Berg", firstName: "Niklas" }),
    ]);
    const hit = [...index.days.values()].flatMap((d) => d.nameDays);
    expect(hit).toHaveLength(1);
    expect(hit[0].almanacName).toBe("Niklas");
  });

  it("finds the almanac's spelling from the reader's — the whole point", () => {
    // The Swedish almanac prints "Niklas". A Nicklas, a Niclas and a Nichlas
    // are the same name written the way the language allows, and a literal
    // match would tell all three they are not in the book.
    for (const spelling of ["Nicklas", "Niclas", "Nichlas"]) {
      const index = indexPeople(svSE, [
        contact({ id: "1", name: spelling, firstName: spelling }),
      ]);
      const hit = [...index.days.values()].flatMap((d) => d.nameDays);
      expect(hit.map((h) => h.almanacName)).toEqual(["Niklas"]);
    }
  });

  it("carries the almanac's spelling, not the contact's", () => {
    // The Swedish almanac prints "Kristoffer" with a K; a Christoffer is
    // celebrated on that day and the calendar prints the day's own spelling.
    const index = indexPeople(svSE, [
      contact({ id: "1", name: "Christoffer", firstName: "Christoffer" }),
    ]);
    const hit = [...index.days.values()].flatMap((d) => d.nameDays)[0];
    expect(hit.almanacName).toBe("Kristoffer");
    expect(hit.contact.firstName).toBe("Christoffer");
  });

  it("celebrates both halves of a double first name", () => {
    const index = indexPeople(svSE, [
      contact({ id: "1", name: "Anna-Karin Ek", firstName: "Anna-Karin" }),
    ]);
    const names = [...index.days.values()]
      .flatMap((d) => d.nameDays)
      .map((n) => n.almanacName);
    expect(names).toContain("Anna");
    expect(names).toContain("Karin");
  });

  it("does not celebrate a surname", () => {
    // With no structured given name only the FIRST word is a candidate, so a
    // surname that happens to be in the almanac cannot mark the wrong day.
    const index = indexPeople(svSE, [contact({ id: "1", name: "Berg Erik" })]);
    const names = [...index.days.values()]
      .flatMap((d) => d.nameDays)
      .map((n) => n.almanacName);
    expect(names).not.toContain("Erik");
  });

  it("gives a country with no almanac birthdays only", () => {
    const index = indexPeople(enGB, [
      contact({
        id: "1",
        name: "Niklas",
        firstName: "Niklas",
        birthday: { month: 4, day: 1 },
      }),
    ]);
    expect([...index.days.values()].flatMap((d) => d.nameDays)).toEqual([]);
    expect(celebrationsOn(index, 2026, 4, 1).birthdays).toHaveLength(1);
  });

  it("never celebrates one person twice on one day", () => {
    // "Britt Marie" reaches the table whole and as each half; a name whose
    // halves share a date must still be one entry on it.
    const index = indexPeople(svSE, [
      contact({ id: "1", name: "Britt-Marie", firstName: "Britt-Marie" }),
    ]);
    for (const day of index.days.values()) {
      const ids = day.nameDays.map((n) => n.contact.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("celebratedNames", () => {
  it("is the set of almanac names a view has to mark", () => {
    const index = indexPeople(svSE, [
      contact({ id: "1", name: "Niklas", firstName: "Niklas" }),
    ]);
    const day = [...index.days.entries()].find(([, d]) => d.nameDays.length)!;
    expect([...celebratedNames(day[1])]).toEqual(["Niklas"]);
  });

  it("is empty on a day nobody is celebrated", () => {
    expect(celebratedNames({ birthdays: [], nameDays: [] }).size).toBe(0);
  });

  it("leaves out somebody already named on the birthday line", () => {
    // 24 August is Bartolomeus's name day in the Swedish almanac. A contact
    // called Bartolomeus who was BORN on it has both facts on one day, and
    // printing both puts his name on the cell twice, in the same colour, one
    // line apart. The birthday names him outright, so it wins.
    const him = contact({
      id: "1",
      name: "Bartolomeus Lindqvist",
      firstName: "Bartolomeus",
      birthday: { month: 8, day: 24 },
    });
    const index = indexPeople(svSE, [him]);
    const day = celebrationsOn(index, 2026, 8, 24);
    expect(day.birthdays).toEqual([him]);
    // The name day is still *known* — it is only the mark that is dropped.
    expect(day.nameDays.map((n) => n.almanacName)).toEqual(["Bartolomeus"]);
    expect([...celebratedNames(day)]).toEqual([]);
  });

  it("still marks the name when somebody ELSE holds it", () => {
    // Per contact, not per name: one Bartolomeus born that day does not take
    // another Bartolomeus's name day off the calendar.
    const born = contact({
      id: "1",
      name: "Bartolomeus Lindqvist",
      firstName: "Bartolomeus",
      birthday: { month: 8, day: 24 },
    });
    const other = contact({
      id: "2",
      name: "Bartolomeus Ek",
      firstName: "Bartolomeus",
    });
    const index = indexPeople(svSE, [born, other]);
    const day = celebrationsOn(index, 2026, 8, 24);
    expect([...celebratedNames(day)]).toEqual(["Bartolomeus"]);
  });

  it("leaves a name day alone when the birthday is somebody else's", () => {
    // A birthday on a day whose almanac name belongs to a different contact
    // is two people, not one — both marks stand.
    const birthdayBoy = contact({
      id: "1",
      name: "Erik Ek",
      firstName: "Erik",
      birthday: { month: 8, day: 24 },
    });
    const named = contact({
      id: "2",
      name: "Bartolomeus Berg",
      firstName: "Bartolomeus",
    });
    const index = indexPeople(svSE, [birthdayBoy, named]);
    const day = celebrationsOn(index, 2026, 8, 24);
    expect(day.birthdays).toEqual([birthdayBoy]);
    expect([...celebratedNames(day)]).toEqual(["Bartolomeus"]);
  });
});

describe("the empty index", () => {
  it("short-circuits every lookup", () => {
    expect(EMPTY_PEOPLE.empty).toBe(true);
    expect(celebrationsOn(EMPTY_PEOPLE, 2026, 2, 28).birthdays).toEqual([]);
  });

  it("is what an empty contact list yields, by identity", () => {
    // The views are memoized on this object: a fresh empty index per render
    // would re-render three months of day cells for nothing.
    expect(indexPeople(svSE, [])).toBe(EMPTY_PEOPLE);
  });
});

describe("turningAge", () => {
  it("counts from a known birth year", () => {
    const c = contact({ id: "1", birthday: { month: 1, day: 1, year: 1990 } });
    expect(turningAge(c, 2026)).toBe(36);
  });

  it("is null without one, and for a year before they were born", () => {
    expect(turningAge(contact({ id: "1" }), 2026)).toBeNull();
    const c = contact({ id: "1", birthday: { month: 1, day: 1, year: 2030 } });
    expect(turningAge(c, 2026)).toBeNull();
  });
});

describe("givenNames", () => {
  it("offers a multi-word given name whole and in parts", () => {
    expect(
      givenNames(contact({ id: "1", name: "x", firstName: "Britt Marie" })),
    ).toEqual(["Britt Marie", "Britt", "Marie"]);
  });

  it("splits a hyphenated given name, which folding alone would not", () => {
    // `nameKey` strips the hyphen, so "Anna-Karin" folds to one key that is
    // nobody's name. Both halves have to be offered separately.
    expect(
      givenNames(contact({ id: "1", name: "x", firstName: "Anna-Karin" })),
    ).toEqual(["Anna-Karin", "Anna", "Karin"]);
  });

  it("offers a single given name once", () => {
    expect(
      givenNames(contact({ id: "1", name: "x", firstName: "Anna" })),
    ).toEqual(["Anna"]);
  });

  it("takes only the first word of an unstructured display name", () => {
    expect(givenNames(contact({ id: "1", name: "Anna Andersson" }))).toEqual([
      "Anna",
    ]);
  });

  it("is empty for a nameless contact", () => {
    expect(givenNames(contact({ id: "1", name: "   " }))).toEqual([]);
  });
});

describe("isContact — the bridge boundary", () => {
  it("accepts the minimum a host can send", () => {
    expect(isContact({ id: "1", name: "Anna" })).toBe(true);
  });

  it("rejects what cannot draw a day", () => {
    expect(isContact(null)).toBe(false);
    expect(isContact({ id: "", name: "Anna" })).toBe(false);
    expect(isContact({ id: "1", name: "   " })).toBe(false);
    expect(isContact({ id: "1" })).toBe(false);
  });

  it("rejects the impossible dates a contact store hands over", () => {
    // Month 0 is a common "unknown" sentinel, and a day past the month's
    // length is a date that never falls.
    expect(
      isContact({ id: "1", name: "A", birthday: { month: 0, day: 1 } }),
    ).toBe(false);
    expect(
      isContact({ id: "1", name: "A", birthday: { month: 4, day: 31 } }),
    ).toBe(false);
    expect(
      isContact({ id: "1", name: "A", birthday: { month: 2, day: 29 } }),
    ).toBe(true);
  });
});

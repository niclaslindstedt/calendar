// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The contacts opt-in list (`src/app/people/selection.ts`) and the host seam
// that fills it (`src/app/people/contactsHost.ts`).
//
// Two things are being pinned, and both are promises rather than conveniences.
// The list is the ONLY thing about a contact this app persists, so its shape —
// ids, nothing else — is a privacy assertion, not a storage detail. And "all"
// means the contacts on screen: a reader who searched for "an" and pressed
// Select all did not say yes to the four hundred people the search hid.

import { describe, expect, it } from "vitest";

import {
  CONTACTS_SELECTION_KEY,
  countSelected,
  deselectAll,
  isSelected,
  NO_SELECTION,
  parseSelection,
  selectAll,
  toggleSelected,
} from "../src/app/people/selection.ts";
import {
  parseContacts,
  parsePermission,
} from "../src/app/people/contactsHost.ts";

describe("the storage key", () => {
  it("is the one the native bridge excludes by name", () => {
    // `native/src/injected.ts` keeps this key out of the widget snapshot, and
    // `tests/native_snapshot_test.ts` spells it out as a literal on that side.
    // Changing it here without changing it there does not fail — it silently
    // starts shipping the ids into the App Group container.
    expect(CONTACTS_SELECTION_KEY).toBe("calendar:contacts:selected");
  });
});

describe("parseSelection", () => {
  it("keeps ids and nothing else", () => {
    expect(parseSelection(["b", "a"])).toEqual(["a", "b"]);
  });

  it("is canonical — sorted and de-duplicated", () => {
    // Two devices that ticked the same people write the same bytes, and a
    // re-render comparing by value is not defeated by ordering.
    expect(parseSelection(["b", "a", "b"])).toEqual(["a", "b"]);
  });

  it("tolerates anything, because settings are hand-editable", () => {
    expect(parseSelection(null)).toEqual(NO_SELECTION);
    expect(parseSelection("a")).toEqual(NO_SELECTION);
    expect(parseSelection({ a: true })).toEqual(NO_SELECTION);
    expect(parseSelection(["a", 3, null, "", "b"])).toEqual(["a", "b"]);
  });
});

describe("toggleSelected", () => {
  it("ticks and unticks", () => {
    expect(toggleSelected([], "a")).toEqual(["a"]);
    expect(toggleSelected(["a", "b"], "a")).toEqual(["b"]);
  });

  it("stays canonical when ticking", () => {
    expect(toggleSelected(["b"], "a")).toEqual(["a", "b"]);
  });
});

describe("selectAll / deselectAll", () => {
  it("act on the ids given, not on everything ever ticked", () => {
    // The reader is looking at a filtered list. Selecting all of it adds to
    // the calendar; it does not redefine it.
    expect(selectAll(["z"], ["a", "b"])).toEqual(["a", "b", "z"]);
    expect(deselectAll(["a", "b", "z"], ["a", "b"])).toEqual(["z"]);
  });

  it("are idempotent", () => {
    const once = selectAll([], ["a", "b"]);
    expect(selectAll(once, ["a", "b"])).toEqual(once);
    expect(deselectAll(deselectAll(once, ["a"]), ["a"])).toEqual(["b"]);
  });

  it("select nobody from an empty list", () => {
    expect(selectAll([], [])).toEqual([]);
  });
});

describe("countSelected", () => {
  it("counts only the ids asked about — what the two buttons read", () => {
    expect(countSelected(["a", "z"], ["a", "b"])).toBe(1);
    expect(countSelected([], ["a", "b"])).toBe(0);
    expect(countSelected(["a", "b"], ["a", "b"])).toBe(2);
  });
});

describe("isSelected", () => {
  it("answers for one id", () => {
    expect(isSelected(["a"], "a")).toBe(true);
    expect(isSelected(["a"], "b")).toBe(false);
  });
});

describe("parseContacts — the bridge boundary", () => {
  it("drops a malformed entry rather than the whole read", () => {
    // One contact with a month of 0 must not cost the reader every other
    // birthday on the device.
    const parsed = parseContacts([
      { id: "1", name: "Anna" },
      { id: "2", name: "Bo", birthday: { month: 0, day: 1 } },
      { id: "3", name: "Cee", birthday: { month: 6, day: 6 } },
      "not a contact",
    ]);
    expect(parsed.map((c) => c.id)).toEqual(["1", "3"]);
  });

  it("is empty for anything that is not a list", () => {
    expect(parseContacts(undefined)).toEqual([]);
    expect(parseContacts({ contacts: [] })).toEqual([]);
  });
});

describe("parsePermission", () => {
  it("passes the four known answers through", () => {
    for (const answer of ["granted", "denied", "undetermined", "unavailable"]) {
      expect(parsePermission(answer)).toBe(answer);
    }
  });

  it("treats anything else as undetermined", () => {
    // The two it must never be mistaken for: `granted` would have the app
    // read an address book it has no right to, and `unavailable` would hide
    // the tab from a reader who could have used it.
    expect(parsePermission("yes")).toBe("undetermined");
    expect(parsePermission(true)).toBe("undetermined");
    expect(parsePermission(undefined)).toBe("undetermined");
  });
});

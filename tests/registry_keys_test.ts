// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  CALENDAR_ACTIVE_KEY,
  CALENDAR_LIST_KEY,
  LEGACY_KEYS,
  migrateLegacyRegistryKeys,
  type KeyValueStore,
} from "../src/app/storage/registryKeys.ts";

/** A `localStorage` stand-in — the migration takes the store it works on so a
 *  node test can hand it one. */
function fakeStore(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  const store: KeyValueStore & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return store;
}

const LIST =
  '[{"slug":"default","name":"Privat"},{"slug":"work","name":"Jobb"}]';

describe("calendar registry keys", () => {
  it("carries a pre-rename registry over to the calendar keys", () => {
    const store = fakeStore({
      "calendar:namespaces": LIST,
      "calendar:namespace:active": "work",
    });

    migrateLegacyRegistryKeys(store);

    expect(store.getItem(CALENDAR_LIST_KEY)).toBe(LIST);
    expect(store.getItem(CALENDAR_ACTIVE_KEY)).toBe("work");
  });

  // The device is carried over, not copied to: a key left behind would be
  // migrated again after the user's next edit and quietly undo it.
  it("drops the legacy keys as it carries them", () => {
    const store = fakeStore({
      "calendar:namespaces": LIST,
      "calendar:namespace:active": "work",
    });

    migrateLegacyRegistryKeys(store);

    for (const [legacy] of LEGACY_KEYS)
      expect(store.getItem(legacy)).toBeNull();
  });

  // A device that has been used since the rename has the real registry under
  // the new key; a legacy key that outlived it must not win.
  it("leaves an existing calendar registry alone", () => {
    const store = fakeStore({
      "calendar:namespaces": LIST,
      [CALENDAR_LIST_KEY]: '[{"slug":"default","name":"Hemma"}]',
    });

    migrateLegacyRegistryKeys(store);

    expect(store.getItem(CALENDAR_LIST_KEY)).toBe(
      '[{"slug":"default","name":"Hemma"}]',
    );
    expect(store.getItem("calendar:namespaces")).toBeNull();
  });

  it("is a no-op on a device that never had the legacy keys", () => {
    const store = fakeStore({ [CALENDAR_LIST_KEY]: LIST });

    migrateLegacyRegistryKeys(store);

    expect([...store.data.keys()]).toEqual([CALENDAR_LIST_KEY]);
  });

  it("runs twice without changing the result", () => {
    const store = fakeStore({ "calendar:namespaces": LIST });

    migrateLegacyRegistryKeys(store);
    migrateLegacyRegistryKeys(store);

    expect(store.getItem(CALENDAR_LIST_KEY)).toBe(LIST);
  });

  // Safari's private mode throws on write; the app has to start anyway, with
  // its seeded registry, rather than failing to render.
  it("survives a storage that throws", () => {
    const store: KeyValueStore = {
      getItem: () => LIST,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };

    expect(() => migrateLegacyRegistryKeys(store)).not.toThrow();
  });
});

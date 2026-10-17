// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone build offers no Dropbox (by owner decision), whatever the
// environment holds; the website and the desktop app keep it exactly as
// before. `DROPBOX_OFFERED` reads the flags through `import.meta.env`, so each
// case stubs them and imports the registry afresh.

import { afterEach, describe, expect, it, vi } from "vitest";

/** A `localStorage` stand-in: the registry reads tokens and the stored
 *  backend from it. */
function memoryStorage(seed: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(seed));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

async function loadBackends(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("../src/app/storage/backends.ts");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the phone build", () => {
  it("offers no Dropbox, even with an app key in the environment", async () => {
    const backends = await loadBackends({
      VITE_NATIVE_BUILD: "on",
      VITE_DROPBOX_APP_KEY: "a-key",
    });
    expect(backends.DROPBOX_OFFERED).toBe(false);
    await expect(backends.connectDropbox()).rejects.toThrow();
  });

  it("opens a phone that still has Dropbox stored on the device's copy", async () => {
    vi.stubGlobal(
      "localStorage",
      memoryStorage({
        "calendar:backend": "dropbox",
        "calendar:dropbox:access": "an-old-token",
      }),
    );
    const backends = await loadBackends({
      VITE_NATIVE_BUILD: "on",
      VITE_DROPBOX_APP_KEY: "a-key",
    });
    // The stored choice is read as it is; the adapter is what refuses it, and
    // the document store then falls back to "browser" as for any backend
    // that is not available.
    expect(backends.readActiveBackendId()).toBe("dropbox");
    expect(await backends.buildAdapter("dropbox")).toBeNull();
    expect(await backends.buildAdapter("browser")).not.toBeNull();
  });
});

describe("the website and the desktop app", () => {
  it("still offer Dropbox when the deployment set a key", async () => {
    vi.stubGlobal(
      "localStorage",
      memoryStorage({ "calendar:dropbox:access": "a-token" }),
    );
    const backends = await loadBackends({
      VITE_NATIVE_BUILD: "",
      VITE_DROPBOX_APP_KEY: "a-key",
    });
    expect(backends.DROPBOX_OFFERED).toBe(true);
    expect(await backends.buildAdapter("dropbox")).not.toBeNull();
  });

  it("hide it without a key, as before", async () => {
    const backends = await loadBackends({
      VITE_NATIVE_BUILD: "",
      VITE_DROPBOX_APP_KEY: "",
    });
    expect(backends.DROPBOX_OFFERED).toBe(false);
  });
});

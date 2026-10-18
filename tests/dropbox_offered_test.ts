// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone build offers no Dropbox (by owner decision), whatever the
// environment holds, and no local folder, which its WebView could never pick;
// it calls the on-device backend "This device", in every language. The
// website and the desktop app keep all of it exactly as before, "This
// browser" included. `DROPBOX_OFFERED`, `FOLDER_OFFERED` and the catalogs read
// the flags through `import.meta.env`, so each case stubs them and imports
// the modules afresh.

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

/** Every catalog's Storage strings, as a build with these flags carries them. */
async function loadStorageStrings(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const catalogs = {
    en: (await import("../src/app/i18n/en.ts")).en,
    de: (await import("../src/app/i18n/de.ts")).de,
    fi: (await import("../src/app/i18n/fi.ts")).fi,
    fr: (await import("../src/app/i18n/fr.ts")).fr,
    nb: (await import("../src/app/i18n/nb.ts")).nb,
    nl: (await import("../src/app/i18n/nl.ts")).nl,
    sv: (await import("../src/app/i18n/sv.ts")).sv,
  };
  return Object.fromEntries(
    Object.entries(catalogs).map(([lang, catalog]) => [lang, catalog.storage]),
  );
}

const PHONE = { VITE_NATIVE_BUILD: "on" };
const NOT_PHONE = { VITE_NATIVE_BUILD: "" };

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

describe("the phone build's local folder", () => {
  it("is not offered at all", async () => {
    const backends = await loadBackends(PHONE);
    expect(backends.FOLDER_OFFERED).toBe(false);
    // Even where a picker exists, the build has no row to offer it from.
    vi.stubGlobal("window", { showDirectoryPicker: () => undefined });
    expect(backends.isFolderAvailable()).toBe(false);
  });

  it("reads a stored folder choice as this device", async () => {
    vi.stubGlobal(
      "localStorage",
      memoryStorage({ "calendar:backend": "folder" }),
    );
    const backends = await loadBackends(PHONE);
    expect(backends.readActiveBackendId()).toBe("browser");
    expect(await backends.buildAdapter("folder")).toBeNull();
    expect(await backends.buildAdapter("browser")).not.toBeNull();
  });
});

describe("the phone build's on-device backend", () => {
  it("is this device, in every language", async () => {
    const strings = await loadStorageStrings(PHONE);
    expect(
      Object.fromEntries(
        Object.entries(strings).map(([lang, s]) => [lang, s.browser]),
      ),
    ).toEqual({
      en: "This device",
      de: "Dieses Gerät",
      fi: "Tämä laite",
      fr: "Cet appareil",
      nb: "Denne enheten",
      nl: "Dit apparaat",
      sv: "Den här enheten",
    });
    for (const [lang, s] of Object.entries(strings)) {
      expect(s.browserHint, lang).not.toMatch(
        /browser|navigateur|nettleser|webbläsar|selain/i,
      );
    }
  });

  it("is still this browser on the website and the desktop app", async () => {
    const strings = await loadStorageStrings(NOT_PHONE);
    expect(strings.en!.browser).toBe("This browser");
    expect(strings.sv!.browser).toBe("Den här webbläsaren");
    expect(strings.en!.browserHint).toMatch(/browser/);
  });
});

describe("the website and the desktop app", () => {
  it("still offer a local folder where the browser can pick one", async () => {
    vi.stubGlobal(
      "localStorage",
      memoryStorage({ "calendar:backend": "folder" }),
    );
    const backends = await loadBackends(NOT_PHONE);
    expect(backends.FOLDER_OFFERED).toBe(true);
    expect(backends.readActiveBackendId()).toBe("folder");
  });

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

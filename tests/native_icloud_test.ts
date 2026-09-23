// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The iCloud bridge (`native/src/icloudBridge.ts`), the seam it fills
// (`src/app/storage/icloudHost.ts`), and the container id the wrapper
// commits in four places.
//
// `native/` is outside the root install and nothing in it is otherwise
// exercised by `make test`, while the failure modes on this seam are all
// silent. A property or event name that drifts on either side does not error —
// the iCloud row simply never appears in Settings → Storage, on a build
// nobody can run without Xcode. A method list that falls out of step does not
// error either: the seam's own validation rejects the host, and the backend
// disappears with no message anywhere.
//
// So the two sides are pinned against each other here. `icloud.ts` itself
// reaches for the native module, which the root install does not have — this
// test stays clear of it, which is exactly why `icloudBridge.ts` takes its
// types from the import-free `icloudWire.ts`.
//
// The container id fails the same way: an entitlement, a Files-app
// declaration and a Swift literal that name different containers build clean,
// sign clean, and sync nothing. So the four spellings are read and compared.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  ICLOUD_REQUEST_TYPE,
  ICLOUD_SCRIPT,
  isICloudRequest,
  resolveScript,
} from "../native/src/icloudBridge.ts";
import {
  ICLOUD_HOST_EVENT,
  ICLOUD_HOST_METHODS,
  ICLOUD_HOST_PROPERTY,
  getICloudHost,
} from "../src/app/storage/icloudHost.ts";

describe("the injected provider", () => {
  it("installs itself where the web app looks for it", () => {
    // The property name is the contract. `icloudHost.ts` reads
    // `window.__calendarICloud`; a rename on either side is not an error, it
    // is a backend that never appears.
    expect(ICLOUD_HOST_PROPERTY).toBe("__calendarICloud");
    expect(ICLOUD_SCRIPT).toContain(`window.${ICLOUD_HOST_PROPERTY}`);
  });

  it("announces itself with the event the seam listens for", () => {
    // The script can run either side of the app's first render, so the
    // announcement is what covers the race. A typo here costs the reader the
    // backend until they reload.
    expect(ICLOUD_SCRIPT).toContain(JSON.stringify(ICLOUD_HOST_EVENT));
  });

  it("offers every method the seam validates, at the version it knows", () => {
    // `getICloudHost` rejects a host missing any one of them, so this is the
    // list the two sides have to agree on. Run against the seam's own
    // validation rather than a copy of the list, so there is nothing to keep
    // in step by hand.
    const host: Record<string, unknown> = { version: 1 };
    for (const method of ICLOUD_HOST_METHODS) {
      expect(ICLOUD_SCRIPT).toContain(`${method}: function`);
      host[method] = () => Promise.resolve(null);
    }
    const globals = globalThis as { window?: unknown };
    const previous = globals.window;
    globals.window = { [ICLOUD_HOST_PROPERTY]: host };
    try {
      expect(getICloudHost()).not.toBeNull();
    } finally {
      globals.window = previous;
    }
  });
});

describe("isICloudRequest", () => {
  const good = {
    type: ICLOUD_REQUEST_TYPE,
    id: "i1",
    method: "read",
    args: ["calendar.json"],
  };

  it("accepts a well-formed request", () => {
    expect(isICloudRequest(good)).toBe(true);
  });

  it("ignores anything the page posts that is not ours", () => {
    // The page may `postMessage` whatever it likes; the wrapper's one channel
    // is shared with the storage report and the contacts requests.
    expect(isICloudRequest({ ...good, type: "calendar-native/report" })).toBe(
      false,
    );
    expect(
      isICloudRequest({ ...good, type: "calendar-native/contacts-request" }),
    ).toBe(false);
    expect(isICloudRequest(null)).toBe(false);
    expect(isICloudRequest("read")).toBe(false);
  });

  it("rejects a request with no correlation id", () => {
    // Without an id there is nothing to resolve, so answering it would drop
    // the answer on the floor — better to say so than to look like a hang.
    expect(isICloudRequest({ ...good, id: "" })).toBe(false);
    expect(isICloudRequest({ ...good, id: 1 })).toBe(false);
  });

  it("rejects a method it does not implement", () => {
    expect(isICloudRequest({ ...good, method: "listAll" })).toBe(false);
    expect(isICloudRequest({ ...good, method: "eval" })).toBe(false);
    // The calendar's bridge is text only; the byte pair is not offered.
    expect(isICloudRequest({ ...good, method: "writeBytes" })).toBe(false);
  });

  it("rejects arguments that are not all strings", () => {
    // The native side passes these straight to a path resolver; a non-string
    // would arrive there as `undefined` and be written as a file name.
    expect(isICloudRequest({ ...good, args: "a" })).toBe(false);
    expect(isICloudRequest({ ...good, args: ["a", 2] })).toBe(false);
    expect(isICloudRequest({ ...good, args: [] })).toBe(true);
  });
});

/** Run one settling script the way the WebView would and report what it handed
 *  the page. The script is a whole program, so `new Function` is the closest
 *  thing to `injectJavaScript` a node test has — and running it is the only way
 *  to prove a payload cannot break out of it. */
function runScript(script: string): { id: string; result: unknown } | null {
  let seen: { id: string; result: unknown } | null = null;
  const stub = {
    __calendarICloudResolve: (id: string, result: unknown) => {
      seen = { id, result };
    },
  };
  new Function("window", script)(stub);
  return seen;
}

describe("resolveScript", () => {
  it("carries the answer back as parsed JSON, not as a literal", () => {
    const script = resolveScript("i1", { ok: true, value: "{}" });
    expect(script).toContain("JSON.parse(");
    expect(script).toContain("window.__calendarICloudResolve");
  });

  it("does not let a note's own text break out of the script", () => {
    // The payload is somebody's notes, and a note is arbitrary user text.
    // This is the case that turns a quote in a note into injected
    // JavaScript the moment the answer is spliced in as a literal — so the
    // script is actually RUN here rather than inspected: a substring check
    // cannot tell an escaped quote from an escaping one.
    const nasty = '");alert(1);//';
    expect(runScript(resolveScript("i1", { ok: true, value: nasty }))).toEqual({
      id: "i1",
      result: { ok: true, value: nasty },
    });
  });

  it("survives a payload full of quotes, backslashes and newlines", () => {
    const nasty = 'O\'Brien \\ "Bosse"\n</script>\u0000';
    expect(runScript(resolveScript("i7", { ok: true, value: nasty }))).toEqual({
      id: "i7",
      result: { ok: true, value: nasty },
    });
  });

  it("escapes the line separators JSON leaves alone", () => {
    // U+2028 / U+2029 are legal inside a JSON string and are NEWLINES to an
    // older JavaScript parser — the one pair `JSON.stringify` does not escape.
    // Spelled with char codes rather than as literals so this file itself
    // holds no raw separator — one pasted into source is invisible in every
    // editor and breaks the parser three lines later.
    const lineSep = String.fromCharCode(0x2028);
    const paraSep = String.fromCharCode(0x2029);
    const script = resolveScript("i1", {
      ok: true,
      value: `a${lineSep}b${paraSep}c`,
    });
    expect(script).not.toContain(lineSep);
    expect(script).not.toContain(paraSep);
    expect(script).toContain("\\u2028");
  });

  it("carries a failure so the page can throw it", () => {
    // A failure crosses as data, not as a rejected promise — the page-side
    // script turns it back into an Error so the document store sees an
    // ordinary save or load failure.
    const script = resolveScript("i1", { ok: false, error: "no container" });
    expect(script).toContain("no container");
  });
});

describe("the iCloud container", () => {
  const CONTAINER = "iCloud.se.agilator.calendar";
  const read = (path: string) =>
    readFileSync(new URL(`../native/${path}`, import.meta.url), "utf8");

  it("is committed, not derived from the bundle id", () => {
    // `identifiers.js` is CommonJS and reads the environment; a store bundle
    // id in the environment must not move the container.
    const require = createRequire(import.meta.url);
    const before = process.env.APP_BUNDLE_ID;
    process.env.APP_BUNDLE_ID = "com.example.somebody-else";
    try {
      const path = require.resolve("../native/identifiers.js");
      delete require.cache[path];
      const ids = require(path) as { ICLOUD_CONTAINER: string };
      expect(ids.ICLOUD_CONTAINER).toBe(CONTAINER);
      delete require.cache[path];
    } finally {
      if (before === undefined) delete process.env.APP_BUNDLE_ID;
      else process.env.APP_BUNDLE_ID = before;
    }
  });

  it("is spelled the same in the module and its Swift", () => {
    // Swift cannot read a build variable, so these are literals — and the
    // only thing holding them to `identifiers.js` is this test.
    expect(read("modules/icloud-store/index.ts")).toContain(
      `ICLOUD_CONTAINER = "${CONTAINER}"`,
    );
    expect(read("modules/icloud-store/ios/ICloudStoreModule.swift")).toContain(
      `CONTAINER_ID = "${CONTAINER}"`,
    );
  });

  it("is the one the entitlements and the Files-app declaration name", () => {
    // Both read the committed value; neither builds one of its own.
    const config = read("app.config.js");
    expect(config).toContain(
      '"com.apple.developer.icloud-container-identifiers": [ICLOUD_CONTAINER]',
    );
    expect(config).toContain('"./plugins/with-icloud"');
    const plugin = read("plugins/with-icloud.js");
    expect(plugin).toContain('require("../identifiers.js")');
    expect(plugin).toContain("NSUbiquitousContainers");
    expect(plugin).not.toContain("BUNDLE_ID");
  });
});

describe("what the root install can type-check", () => {
  // Same trap as the contacts bridge (`native_contacts_test.ts`): this file
  // imports `icloudBridge.ts`, the root `tsc` type-checks it, and a root
  // `npm ci` has no `expo`. So nothing reachable from here may import it —
  // not even for a type — and only `icloud.ts` reaches for the module.
  for (const file of ["icloudBridge.ts", "icloudWire.ts"]) {
    it(`keeps expo out of ${file}`, () => {
      const source = readFileSync(
        new URL(`../native/src/${file}`, import.meta.url),
        "utf8",
      );
      const imports = source.match(
        /^\s*(?:import|export)[^;]*from\s+"([^"]+)"/gm,
      );
      for (const line of imports ?? []) {
        expect(line).not.toContain("expo");
        expect(line).not.toContain('./icloud"');
        expect(line).not.toContain("modules/icloud-store");
      }
    });
  }
});

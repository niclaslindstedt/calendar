// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The save-file bridge (`native/src/saveFileBridge.ts`) against the contract
// it fills (oss-framework's `save-file`, `docs/native-shell.md`).
//
// A drift on this seam is silent in the worst way: a message type spelled
// differently is ignored by the wrapper, the page waits on a share sheet that
// never opens, and nothing fails anywhere a test runs. So the names are
// pinned to the framework's constants here, and the wiring in `App.tsx` —
// which the root suite cannot import — is read from its source.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  SAVE_FILE_MESSAGE,
  SAVE_FILE_RESULT_EVENT as FRAMEWORK_RESULT_EVENT,
} from "@niclaslindstedt/oss-framework/files";
import { NATIVE_SHELL_PROPERTY } from "@niclaslindstedt/oss-framework/pwa";

import {
  bareName,
  isSaveFileRequest,
  SAVE_FILE_DESCRIPTOR,
  SAVE_FILE_RESULT_EVENT,
  SAVE_FILE_TYPE,
  saveFileResultScript,
  UTI,
} from "../native/src/saveFileBridge.ts";

function source(path: string): string {
  return readFileSync(new URL(`../native/${path}`, import.meta.url), "utf8");
}

describe("the save-file contract", () => {
  it("uses the framework's names", () => {
    expect(SAVE_FILE_TYPE).toBe(SAVE_FILE_MESSAGE);
    expect(SAVE_FILE_RESULT_EVENT).toBe(FRAMEWORK_RESULT_EVENT);
    expect(NATIVE_SHELL_PROPERTY).toBe("__ossShell");
    expect(SAVE_FILE_DESCRIPTOR).toContain(`window.${NATIVE_SHELL_PROPERTY}`);
  });

  it("recognises a request and nothing else", () => {
    const request = {
      type: SAVE_FILE_TYPE,
      version: 1,
      id: "sf1",
      filename: "calendar-backup-2026-09-28.json",
      mimeType: "application/json",
      base64: "e30=",
    };
    expect(isSaveFileRequest(request)).toBe(true);
    expect(
      isSaveFileRequest({ ...request, type: "calendar-native/report" }),
    ).toBe(false);
    expect(isSaveFileRequest({ ...request, base64: undefined })).toBe(false);
    expect(isSaveFileRequest(null)).toBe(false);
    expect(isSaveFileRequest("oss-framework/save-file")).toBe(false);
  });

  it("offers the backup's type to iOS as JSON", () => {
    expect(UTI["application/json"]).toBe("public.json");
  });

  it("never trusts the name it is sent", () => {
    expect(bareName("calendar-backup.json")).toBe("calendar-backup.json");
    expect(bareName("../../Library/x.json")).toBe("x.json");
    expect(bareName("a\\b.json")).toBe("b.json");
    expect(bareName("..")).toBe("file");
    expect(bareName("dir/")).toBe("file");
  });

  it("settles the page with the id it was asked under", () => {
    const events: CustomEvent[] = [];
    const win = {
      dispatchEvent: (event: CustomEvent) => events.push(event),
    };
    class FakeCustomEvent {
      constructor(
        readonly type: string,
        readonly init: { detail: unknown },
      ) {}
      get detail() {
        return this.init.detail;
      }
    }
    new Function("window", "CustomEvent", saveFileResultScript("sf1", true))(
      win,
      FakeCustomEvent,
    );
    new Function(
      "window",
      "CustomEvent",
      saveFileResultScript("sf2", false, 'no "sheet"'),
    )(win, FakeCustomEvent);
    expect(events.map((e) => [e.type, e.detail])).toEqual([
      [FRAMEWORK_RESULT_EVENT, { id: "sf1", ok: true }],
      [FRAMEWORK_RESULT_EVENT, { id: "sf2", ok: false, error: 'no "sheet"' }],
    ]);
  });
});

describe("the wrapper's wiring", () => {
  const app = source("App.tsx");

  it("advertises save-file before the page loads", () => {
    expect(app).toMatch(
      /injectedJavaScriptBeforeContentLoaded=\{`[^`]*\$\{SAVE_FILE_DESCRIPTOR\}[^`]*`\}/,
    );
  });

  it("routes a request to the share sheet", () => {
    expect(app).toMatch(
      /isSaveFileRequest\(parsed\)[\s\S]{0,80}answerSaveFile\(parsed/,
    );
  });

  it("never sends a blob: or data: URL to the system browser", () => {
    const refuse = app.indexOf(
      "if (/^(blob|data):/i.test(request.url)) return false;",
    );
    const openExternally = app.indexOf("Linking.openURL(request.url)");
    expect(refuse).toBeGreaterThan(-1);
    expect(refuse).toBeLessThan(openExternally);
  });

  // The root suite imports the bridge, and a root `npm ci` does not install
  // `native/`'s dependencies — so expo stays in `saveFile.ts` (see the same
  // guard in `native_contacts_test.ts`).
  it("keeps expo out of saveFileBridge.ts", () => {
    const imports = source("src/saveFileBridge.ts").match(
      /^\s*(?:import|export)[^;]*from\s+"([^"]+)"/gm,
    );
    for (const line of imports ?? []) {
      expect(line).not.toContain("expo-");
      expect(line).not.toContain('./saveFile"');
    }
  });
});

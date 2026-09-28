// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The backup leaves the page through the framework's `saveFile`
// (`saveBackupFile` in `src/app/storage/backupIo.ts`): a download in a
// browser, the share sheet in a host that advertises `save-file`. Both paths
// are run here, the second against the phone wrapper's own descriptor and
// result script (`native/src/saveFileBridge.ts`), so the page and the wrapper
// are held to one contract end to end.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_THEME_APPEARANCE } from "@niclaslindstedt/oss-framework/theme";

import {
  BACKUP_KIND,
  BACKUP_VERSION,
  parseBackup,
  serializeBackup,
  type BackupFile,
} from "../src/app/storage/backup.ts";
import { saveBackupFile } from "../src/app/storage/backupIo.ts";
import { DEFAULT_LOOK } from "../src/app/useAppSettings.ts";
import {
  isSaveFileRequest,
  SAVE_FILE_DESCRIPTOR,
  saveFileResultScript,
  type SaveFileRequest,
} from "../native/src/saveFileBridge.ts";

const EXPORTED_AT = "2026-09-28T09:00:00.000Z";

const BACKUP: BackupFile = {
  kind: BACKUP_KIND,
  version: BACKUP_VERSION,
  exportedAt: EXPORTED_AT,
  settings: DEFAULT_LOOK,
  appearance: DEFAULT_THEME_APPEARANCE,
  calendars: [
    {
      slug: "default",
      name: "Personal",
      // Non-ASCII on purpose: the shell path base64-encodes UTF-8 bytes.
      entries: { "2026-09-28": "Middag hos Åsa ☕" },
    },
  ],
};

type ShellWindow = Window & {
  ReactNativeWebView?: { postMessage: (data: string) => void };
  __ossShell?: { version: number; capabilities: string[] };
};
const win = window as ShellWindow;

function decodeUtf8Base64(base64: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
  );
}

afterEach(() => {
  delete win.ReactNativeWebView;
  delete win.__ossShell;
  vi.restoreAllMocks();
});

describe("exporting in a browser", () => {
  let clicked: HTMLAnchorElement[];
  let blobs: Blob[];
  beforeEach(() => {
    clicked = [];
    blobs = [];
    // jsdom implements neither; the download is an anchor at a blob URL.
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:calendar/1";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
  });

  it("downloads the backup under its dated name", async () => {
    await expect(saveBackupFile(BACKUP, EXPORTED_AT)).resolves.toBe(
      "downloaded",
    );
    expect(clicked).toHaveLength(1);
    expect(clicked[0]!.download).toBe("calendar-backup-2026-09-28.json");
    expect(clicked[0]!.href).toBe("blob:calendar/1");
    expect(blobs[0]!.type).toBe("application/json;charset=utf-8");
    expect(await blobs[0]!.text()).toBe(serializeBackup(BACKUP));
  });

  it("still downloads under a bare react-native-webview with no save-file", async () => {
    // A shell that listens to its page but has not implemented the contract
    // keeps the web behaviour rather than posting into the void.
    const postMessage = vi.fn();
    win.ReactNativeWebView = { postMessage };
    await expect(saveBackupFile(BACKUP, EXPORTED_AT)).resolves.toBe(
      "downloaded",
    );
    expect(postMessage).not.toHaveBeenCalled();
    expect(clicked).toHaveLength(1);
  });
});

describe("exporting inside the phone app", () => {
  let posted: SaveFileRequest[];
  beforeEach(() => {
    posted = [];
    win.ReactNativeWebView = {
      postMessage: (data: string) => {
        const parsed: unknown = JSON.parse(data);
        if (isSaveFileRequest(parsed)) posted.push(parsed);
      },
    };
    // Exactly what the wrapper injects before the page loads.
    new Function(SAVE_FILE_DESCRIPTOR)();
  });

  it("advertises save-file, merged into any descriptor already there", () => {
    expect(win.__ossShell).toEqual({ version: 1, capabilities: ["save-file"] });
    win.__ossShell = { version: 1, capabilities: ["other"] };
    new Function(SAVE_FILE_DESCRIPTOR)();
    new Function(SAVE_FILE_DESCRIPTOR)();
    expect(win.__ossShell.capabilities).toEqual(["other", "save-file"]);
  });

  it("hands the backup to the wrapper and resolves when the sheet closes", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    const saved = saveBackupFile(BACKUP, EXPORTED_AT);
    await vi.waitFor(() => expect(posted).toHaveLength(1));

    const request = posted[0]!;
    expect(request.version).toBe(1);
    expect(request.filename).toBe("calendar-backup-2026-09-28.json");
    // Parameters stripped: iOS maps the bare type to a UTI.
    expect(request.mimeType).toBe("application/json");
    const text = decodeUtf8Base64(request.base64);
    expect(text).toBe(serializeBackup(BACKUP));
    // What reaches the sheet is a backup the import reads back whole.
    const parsed = parseBackup(text, DEFAULT_THEME_APPEARANCE);
    expect(parsed.ok && parsed.backup).toEqual(BACKUP);

    new Function(saveFileResultScript(request.id, true))();
    await expect(saved).resolves.toBe("shared");
    expect(click).not.toHaveBeenCalled();
  });

  it("rejects with the wrapper's error, so the Storage tab can say so", async () => {
    const saved = saveBackupFile(BACKUP, EXPORTED_AT);
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    new Function(
      saveFileResultScript(
        posted[0]!.id,
        false,
        "Sharing is not available on this device.",
      ),
    )();
    await expect(saved).rejects.toThrow(
      "Sharing is not available on this device.",
    );
  });

  it("ignores an answer meant for another export", async () => {
    const saved = saveBackupFile(BACKUP, EXPORTED_AT);
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    new Function(saveFileResultScript("someone-else", false, "no"))();
    new Function(saveFileResultScript(posted[0]!.id, true))();
    await expect(saved).resolves.toBe("shared");
  });
});

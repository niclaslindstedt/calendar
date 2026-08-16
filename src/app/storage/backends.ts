// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The storage-backend registry and connect flows, over the framework's
// adapters. This module owns:
//   - which backends exist and whether each is available in this build /
//     browser (env keys present, File System Access supported),
//   - the device-local connection state (OAuth tokens, the picked folder
//     handle, the active backend id),
//   - building the active `StorageAdapter` the document store saves through.
//
// The framework owns the actual protocol code (PKCE flows, Dropbox/Drive
// REST, the folder file store) — this file just wires it to localStorage keys
// and the app's env.

import {
  BrowserLocalStorageAdapter,
  clearDirectoryHandle,
  completeDropboxAuth,
  createDropboxAdapter,
  createFolderAdapter,
  createGdriveAdapter,
  hasPendingDropboxAuth,
  isFolderBackendAvailable,
  loadDirectoryHandle,
  localCacheKey,
  saveDirectoryHandle,
  startDropboxAuth,
  startGdriveAuth,
  withLocalCache,
  type StorageAdapter,
} from "@niclaslindstedt/oss-framework/storage";

import { logStore } from "../log.ts";
import type { BackendId } from "./demoAdapter.ts";

export type { BackendId } from "./demoAdapter.ts";

const FILE_NAME = "calendar.json";
const ACTIVE_KEY = "calendar:backend";
const DROPBOX_ACCESS_KEY = "calendar:dropbox:access";
const DROPBOX_REFRESH_KEY = "calendar:dropbox:refresh";
const GDRIVE_TOKEN_KEY = "calendar:gdrive:token";

const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY as
  string | undefined;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  string | undefined;
const GDRIVE_APP_FOLDER =
  (import.meta.env.VITE_GDRIVE_APP_FOLDER as string | undefined) || "Calendar";

const storageLog = (scope: string) => logStore.createLogger(scope);

// --- active backend id ------------------------------------------------------

export function readActiveBackendId(): BackendId {
  const stored = localStorage.getItem(ACTIVE_KEY);
  if (
    stored === "browser" ||
    stored === "folder" ||
    stored === "dropbox" ||
    stored === "gdrive"
  ) {
    return stored;
  }
  return "browser";
}

export function writeActiveBackendId(id: BackendId): void {
  // "demo" is a session-only takeover — never persisted as the real choice.
  if (id === "demo") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

// --- availability (build/browser gates) -------------------------------------

export function isDropboxAvailable(): boolean {
  return Boolean(DROPBOX_APP_KEY);
}

export function isGdriveAvailable(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

export function isFolderAvailable(): boolean {
  return isFolderBackendAvailable();
}

// --- connection state -------------------------------------------------------

export function isDropboxConnected(): boolean {
  return Boolean(localStorage.getItem(DROPBOX_ACCESS_KEY));
}

export function isGdriveConnected(): boolean {
  return Boolean(sessionStorage.getItem(GDRIVE_TOKEN_KEY));
}

export function disconnectDropbox(): void {
  localStorage.removeItem(DROPBOX_ACCESS_KEY);
  localStorage.removeItem(DROPBOX_REFRESH_KEY);
}

export function disconnectGdrive(): void {
  sessionStorage.removeItem(GDRIVE_TOKEN_KEY);
}

export async function disconnectFolder(): Promise<void> {
  await clearDirectoryHandle();
}

/** Whether a folder handle is stored from an earlier session. (The OS may
 *  still re-prompt for permission on first use.) */
export async function loadFolderConnected(): Promise<boolean> {
  try {
    return (await loadDirectoryHandle()) !== null;
  } catch {
    return false;
  }
}

// --- connect flows ----------------------------------------------------------

/** Kick off the Dropbox consent redirect. The page navigates away; the code
 *  comes back as `?code=` and is consumed by `completeOauthOnBoot`. */
export function connectDropbox(): Promise<void> {
  if (!DROPBOX_APP_KEY) return Promise.reject(new Error("no app key"));
  return startDropboxAuth(DROPBOX_APP_KEY, storageLog("dropbox"));
}

/** Open the Google consent popup; resolves once a token is stored. GIS popup
 *  tokens are short-lived and session-scoped, so a browser restart asks
 *  again. */
export async function connectGdrive(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) throw new Error("no client id");
  const token = await startGdriveAuth(GOOGLE_CLIENT_ID, storageLog("gdrive"));
  sessionStorage.setItem(GDRIVE_TOKEN_KEY, token);
}

/** Show the directory picker and persist the handle. Must run in a user
 *  gesture. Returns false when the user cancels the picker. */
export async function connectFolder(): Promise<boolean> {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (opts?: {
        mode?: string;
      }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) return false;
  try {
    const handle = await picker.call(window, { mode: "readwrite" });
    await saveDirectoryHandle(handle);
    return true;
  } catch (err) {
    // AbortError = the user closed the picker; anything else is worth a line.
    if ((err as DOMException).name !== "AbortError") {
      storageLog("folder").error("directory picker failed", err);
    }
    return false;
  }
}

/** Consume an inbound OAuth redirect (`?code=…`) on boot, if one is pending.
 *  Returns the backend that finished connecting, or null. */
export async function completeOauthOnBoot(): Promise<BackendId | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code || !DROPBOX_APP_KEY || !hasPendingDropboxAuth()) return null;
  const result = await completeDropboxAuth(
    DROPBOX_APP_KEY,
    code,
    undefined,
    storageLog("dropbox"),
  );
  localStorage.setItem(DROPBOX_ACCESS_KEY, result.accessToken);
  if (result.refreshToken) {
    localStorage.setItem(DROPBOX_REFRESH_KEY, result.refreshToken);
  }
  // Clean the code out of the address bar so a reload doesn't re-exchange it.
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState(null, "", url.toString());
  return "dropbox";
}

// --- adapter construction ---------------------------------------------------

/** Build the adapter for a backend id, or null when it isn't connected /
 *  available (the caller falls back to "browser"). Cloud adapters are
 *  wrapped in the framework's offline mirror so the calendar still opens
 *  without a network. */
export async function buildAdapter(
  id: BackendId,
): Promise<StorageAdapter | null> {
  switch (id) {
    case "browser":
      return new BrowserLocalStorageAdapter({
        key: "calendar:document",
        logger: storageLog("browser"),
      });

    case "folder": {
      const handle = await loadDirectoryHandle();
      if (!handle) return null;
      return createFolderAdapter(handle, {
        fileName: FILE_NAME,
        logger: storageLog("folder"),
      });
    }

    case "dropbox": {
      const accessToken = localStorage.getItem(DROPBOX_ACCESS_KEY);
      if (!accessToken || !DROPBOX_APP_KEY) return null;
      const adapter = createDropboxAdapter(
        {
          accessToken,
          refreshToken: localStorage.getItem(DROPBOX_REFRESH_KEY),
          onAccessTokenRefreshed: (fresh) =>
            localStorage.setItem(DROPBOX_ACCESS_KEY, fresh),
        },
        {
          appKey: DROPBOX_APP_KEY,
          fileName: FILE_NAME,
          logger: storageLog("dropbox"),
        },
      );
      return withLocalCache(adapter, {
        storage: localStorage,
        key: localCacheKey("dropbox", "calendar"),
        logger: storageLog("dropbox"),
      });
    }

    case "gdrive": {
      const token = sessionStorage.getItem(GDRIVE_TOKEN_KEY);
      if (!token) return null;
      const adapter = createGdriveAdapter(token, {
        appFolderName: GDRIVE_APP_FOLDER,
        fileName: FILE_NAME,
        logger: storageLog("gdrive"),
      });
      return withLocalCache(adapter, {
        storage: localStorage,
        key: localCacheKey("gdrive", "calendar"),
        logger: storageLog("gdrive"),
      });
    }

    case "demo":
      // Built by the caller (`useCalendarStore`) so each enable is fresh.
      return null;
  }
}

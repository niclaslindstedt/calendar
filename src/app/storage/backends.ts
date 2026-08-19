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
//
// Everything here is per-*namespace*: a backend is a place, and each
// namespace is a separate document in that place. The connection state (a
// token, a folder handle) is shared by every namespace on the device; only
// where the document sits varies — a suffixed name beside its siblings on
// most backends, a folder of its own on Dropbox — and `./paths.ts` owns that
// naming.

import { DEFAULT_NAMESPACE_SLUG } from "@niclaslindstedt/oss-framework/namespaces";
import {
  BrowserLocalStorageAdapter,
  clearDirectoryHandle,
  completeDropboxAuth,
  createDropboxAdapter,
  createFolderAdapter,
  createGdriveAdapter,
  deleteDropboxPath,
  deleteLocalDocument,
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
import { emptyDoc, serializeDoc } from "../types.ts";
import type { BackendId } from "./demoAdapter.ts";
import {
  DROPBOX_DOCUMENT_FILE,
  cacheScope,
  documentFileName,
  documentKey,
  dropboxDisplayPath,
  dropboxRootPath,
} from "./paths.ts";

export type { BackendId } from "./demoAdapter.ts";

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

// Dropbox fixes the app folder's name in the app's own configuration — an
// "App folder"-scoped app lives under `Apps/<name>/` and the API's root *is*
// that folder, so the name is never sent with a request. The app still needs
// it to tell the user which folder to look in, hence the build-time knob:
// point a deployment at its own Dropbox app and the displayed location follows.
const DROPBOX_APP_FOLDER =
  (import.meta.env.VITE_DROPBOX_APP_FOLDER as string | undefined)?.trim() ||
  "nird-calendar";

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

// --- where the document sits ------------------------------------------------

/** Where a namespace's calendar lives in Dropbox, spelled the way Dropbox
 *  shows it. The app folder's name is a build-time setting the user can't see
 *  from the outside, so the Storage tab prints this rather than leaving them
 *  to hunt for the folder. */
export function dropboxLocation(slug: string): string {
  return dropboxDisplayPath(DROPBOX_APP_FOLDER, slug);
}

// --- adapter construction ---------------------------------------------------

/** Build the adapter for a backend id and namespace slug, or null when the
 *  backend isn't connected / available (the caller falls back to "browser").
 *  Cloud adapters are wrapped in the framework's offline mirror so the
 *  calendar still opens without a network — one mirror per namespace, so two
 *  namespaces can't serve each other's cached document. */
export async function buildAdapter(
  id: BackendId,
  slug: string = DEFAULT_NAMESPACE_SLUG,
): Promise<StorageAdapter | null> {
  const fileName = documentFileName(slug);
  switch (id) {
    case "browser":
      return new BrowserLocalStorageAdapter({
        key: documentKey(slug),
        logger: storageLog("browser"),
      });

    case "folder": {
      const handle = await loadDirectoryHandle();
      if (!handle) return null;
      return createFolderAdapter(handle, {
        fileName,
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
          // A folder per namespace at the app folder's root, the calendar
          // inside it. Dropbox creates the folder on the first upload, and a
          // folder that isn't there yet reads as an empty namespace rather
          // than an error — so a new namespace needs no setup round-trip.
          rootPath: dropboxRootPath(slug),
          fileName: DROPBOX_DOCUMENT_FILE,
          logger: storageLog("dropbox"),
        },
      );
      return withLocalCache(adapter, {
        storage: localStorage,
        key: localCacheKey("dropbox", cacheScope(slug)),
        logger: storageLog("dropbox"),
      });
    }

    case "gdrive": {
      const token = sessionStorage.getItem(GDRIVE_TOKEN_KEY);
      if (!token) return null;
      const adapter = createGdriveAdapter(token, {
        appFolderName: GDRIVE_APP_FOLDER,
        fileName,
        logger: storageLog("gdrive"),
      });
      return withLocalCache(adapter, {
        storage: localStorage,
        key: localCacheKey("gdrive", cacheScope(slug)),
        logger: storageLog("gdrive"),
      });
    }

    case "demo":
      // Built by the caller (`useCalendarStore`) so each enable is fresh.
      return null;
  }
}

// --- namespace teardown -----------------------------------------------------

/** Throw away a deleted namespace's document. The device-local copies (the
 *  browser document, every backend's offline mirror) are removed outright.
 *  Dropbox holds the namespace as a folder, so the folder goes with it —
 *  a deleted calendar leaves nothing behind in the app folder. Elsewhere the
 *  copy in the *active* remote backend is emptied rather than removed,
 *  because a `StorageAdapter` can write but not delete. Either way a
 *  namespace re-created under the same slug comes back blank instead of
 *  inheriting the deleted one's notes.
 *
 *  Best-effort throughout: a namespace leaves the registry whether or not the
 *  cloud round-trip succeeds, so a failure here is logged, not thrown. */
export async function discardNamespaceData(
  id: BackendId,
  slug: string,
): Promise<void> {
  if (slug === DEFAULT_NAMESPACE_SLUG) return;

  deleteLocalDocument(documentKey(slug));
  for (const backend of ["dropbox", "gdrive"] as const) {
    try {
      localStorage.removeItem(localCacheKey(backend, cacheScope(slug)));
    } catch {
      // Storage unavailable — nothing cached to drop either.
    }
  }

  if (id === "browser" || id === "demo") return;
  if (id === "dropbox" && (await removeDropboxNamespaceFolder(slug))) return;
  try {
    const adapter = await buildAdapter(id, slug);
    await adapter?.save(serializeDoc(emptyDoc()));
  } catch (err) {
    storageLog(id).error(
      "could not clear the deleted namespace's document",
      err,
    );
  }
}

/** Delete a namespace's whole Dropbox folder. Returns false when there is no
 *  connection to delete through, or the call failed — the caller then falls
 *  back to emptying the document in place. */
async function removeDropboxNamespaceFolder(slug: string): Promise<boolean> {
  const accessToken = localStorage.getItem(DROPBOX_ACCESS_KEY);
  if (!accessToken) return false;
  try {
    await deleteDropboxPath(accessToken, dropboxRootPath(slug));
    return true;
  } catch (err) {
    storageLog("dropbox").error("could not delete the namespace's folder", err);
    return false;
  }
}

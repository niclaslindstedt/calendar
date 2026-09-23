// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The file store the iCLOUD BACKEND is built from, over a host that offers
// the capability (`icloudHost.ts`).
//
// iCloud Drive is a folder, not a service with an API, so this backend is the
// picked-local-folder backend with a different transport underneath — and it
// is deliberately built that way. The framework's `createFileStoreAdapter`
// turns the text store below into the same whole-document `StorageAdapter`
// the folder backend gets, with the same revision check on save.
//
// Every calendar is a file in the container's document root, named exactly as
// it is in a picked folder (`paths.ts`): `calendar.json` for the default one,
// `calendar.<slug>.json` beside it for each other. That root is what the
// Files app shows as the app's own "Calendar" folder.
//
// NO RETRIES. A host reads a folder on the device's own disk; iCloud's
// syncing happens underneath it, on its own schedule, and a read that failed
// will not succeed a moment later for a reason a retry could reach — exactly
// as for the local folder backend. (`backends.ts` does wrap this adapter in
// the framework's offline mirror, but for the widgets' sake, not the
// network's — see there.)

import {
  createFileStoreAdapter,
  type FileStore,
  type StorageAdapter,
  type StorageBackendId,
} from "@niclaslindstedt/oss-framework/storage";

import { logStore } from "../log.ts";
import { parseICloudEntries, type ICloudHost } from "./icloudHost.ts";

const log = logStore.createLogger("icloud");

/** The backend's stable identifier, used to label the adapter.
 *
 *  The framework's `StorageBackendId` is the closed union of the backends it
 *  ships, while its own documentation says an app that adds a backend "keys it
 *  under its own string" — so the cast is the type catching up with the
 *  contract, not a hole in it. Spelled once, here. */
export const ICLOUD_BACKEND_ID = "icloud" as StorageBackendId;

/** What the container is called in the Files app. Not a build knob: it is
 *  `NSUbiquitousContainerName` in the wrapper's config plugin
 *  (`native/plugins/with-icloud.js`), and this is only the app's copy of it
 *  for the location line in Settings → Storage. */
export const ICLOUD_FOLDER_NAME = "Calendar";

/** The text-level {@link FileStore} the whole-document adapter is built on.
 *  Paths are `/`-separated and relative to the container's document root. */
export function icloudFileStore(host: ICloudHost): FileStore {
  return {
    async list() {
      return parseICloudEntries(await host.list());
    },
    read: (path) => host.read(path),
    write: (path, text) => host.write(path, text),
    remove: (path) => host.remove(path),
  };
}

/** The whole-document adapter for one calendar's file in the container. */
export function createICloudAdapter(
  host: ICloudHost,
  fileName: string,
): StorageAdapter {
  return createFileStoreAdapter(icloudFileStore(host), {
    id: ICLOUD_BACKEND_ID,
    label: "iCloud Drive",
    fileName,
    logger: log,
    // See the header: the transport is a local folder, so there is no network
    // error for a retry to ride out.
    retryDelaysMs: [],
  });
}

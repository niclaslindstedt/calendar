// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE APP <-> iCLOUD DRIVE SEAM, JavaScript side.
//
// The whole native surface this module adds is a small file store: list,
// read, write, remove, inside the app's own iCloud Drive container. iCloud
// does the syncing; nothing here merges, diffs, or interprets a byte. The web
// app drives it through the framework's ordinary storage-adapter contract, the
// same way it drives a picked local folder.
//
// APPLE ONLY. iCloud has no Android equivalent, so the module declares only
// the `apple` platform and `requireOptionalNativeModule` returns `null`
// everywhere else — an Android build, Expo Go, a bare `expo start`. The
// wrapper then reports the backend as unavailable and the web app hides it,
// rather than crashing at import.

import { requireOptionalNativeModule } from "expo";

/**
 * The iCloud container the calendars sync through.
 *
 * Changing this after release strands every synced copy — the app starts
 * reading a container nothing has ever written, and the reader's notes look
 * gone (they are not; they are in the old container). It is pinned in four
 * places that must agree: here, the Swift twin
 * (`ios/ICloudStoreModule.swift`), `identifiers.js` (which the entitlements in
 * `app.config.js` and the Files-app declaration in `plugins/with-icloud.js`
 * both read). `tests/native_icloud_test.ts` holds them together.
 */
export const ICLOUD_CONTAINER = "iCloud.se.agilator.calendar";

/** One file in the container, as the native side reports it. */
export type ICloudNativeEntry = {
  /** Path relative to the container's `Documents` folder, `/`-separated. */
  path: string;
  /** Opaque token that changes when the bytes change (modification time and
   *  size). Never interpreted — the framework only compares it. */
  rev: string;
};

export type ICloudStoreNativeModule = {
  /** Whether the container is reachable: `true` once the ubiquity container
   *  has resolved, `false` when the device has no iCloud account or iCloud
   *  Drive is off. */
  isAvailable(): Promise<boolean>;
  /** Every file under the container's `Documents` folder, recursively. */
  list(): Promise<ICloudNativeEntry[]>;
  /** One file's contents as UTF-8 text, or `null` when it does not exist. */
  readText(path: string): Promise<string | null>;
  /** Write (create or overwrite) one file from UTF-8 text. */
  writeText(path: string, text: string): Promise<void>;
  /** Delete one file. A missing file is treated as already gone. */
  remove(path: string): Promise<void>;
};

/** The native module, or `null` in a build that does not carry it. */
export const ICloudStore =
  requireOptionalNativeModule<ICloudStoreNativeModule>("ICloudStore");

export default ICloudStore;

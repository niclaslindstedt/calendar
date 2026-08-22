// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE APP ↔ WIDGET SEAM, JavaScript side.
//
// A widget does not run inside the app. On iOS it is an App Extension in its
// own process, on Android a broadcast receiver the launcher pokes — neither
// can reach the WebView, its `localStorage`, or anything else the app holds in
// memory. So the app hands the widgets a finished snapshot (see
// `../../src/snapshot.ts`) through the only thing both sides can address: a
// shared container. On iOS that is an App Group's `UserDefaults`; on Android,
// a private `SharedPreferences` file — the widget is part of the same app
// there, so no group is needed.
//
// This module is the *whole* native surface the wrapper adds. It writes the
// snapshot and asks the OS to refresh the timelines. There is deliberately no
// path back: the calendar's widgets are read-only, so nothing the user does on
// the Home Screen has to be drained into the app.
//
// Loaded OPTIONALLY. A build without the native side — Expo Go, a bare
// `expo start`, a platform where autolinking did not pick it up — gets `null`
// and the app runs with no widgets rather than crashing at import.

import { requireOptionalNativeModule } from "expo";

/**
 * The App Group / preferences file both sides address.
 *
 * Changing this after release orphans every installed widget's data — the
 * extension keeps reading a container the app has stopped writing, and prints
 * a stale calendar forever. It is pinned in four places that must agree:
 * here, `app.config.js` (the main app's entitlement), `plugins/with-widgets.js`
 * and `targets/widget/expo-target.config.js` (the extension's).
 */
export const APP_GROUP = "group.se.niclaslindstedt.calendar";

/** The key the snapshot JSON is stored under inside that container. Mirrored
 *  in `ios/WidgetBridgeModule.swift` and the Kotlin provider. */
export const SNAPSHOT_KEY = "snapshot";

export type WidgetBridgeNativeModule = {
  /** Write the snapshot JSON into the shared container, then reload every
   *  widget timeline. Resolves once the write has landed. */
  setSnapshot(json: string): Promise<void>;
  /** Reload every widget timeline without changing the snapshot — used when
   *  the day rolls over and the same notes have to be re-laid-out. */
  reloadAll(): Promise<void>;
};

/** The native module, or `null` in a build that does not carry it. */
export const WidgetBridge =
  requireOptionalNativeModule<WidgetBridgeNativeModule>("WidgetBridge");

export default WidgetBridge;

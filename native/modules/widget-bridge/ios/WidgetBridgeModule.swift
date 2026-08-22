// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE APP ↔ WIDGET SEAM, Apple side.
//
// The WidgetKit extension (native/targets/widget) is a separate process with a
// separate container. The one thing it shares with the app is the App Group,
// so the app writes the snapshot into the group's `UserDefaults` and the
// extension reads it back on every timeline refresh.
//
// `UserDefaults` rather than a file in the group container on purpose: the
// snapshot is small and bounded (see snapshot.ts), the extension reads it
// synchronously while building a timeline, and defaults give that read for
// free with no coordination or partial-write window.

import ExpoModulesCore
import WidgetKit

/// The App Group both sides address. Kept in step with `../index.ts`,
/// `app.config.js`, `plugins/with-widgets.js` and the target's entitlements —
/// changing it after release orphans every installed widget.
private let APP_GROUP = "group.se.niclaslindstedt.calendar"

/// The key the snapshot JSON sits under inside that group.
private let SNAPSHOT_KEY = "snapshot"

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    /// Publish a new snapshot and refresh every widget.
    ///
    /// Throws rather than failing quietly when the group is unreachable: that
    /// only happens when the entitlement is missing from the build, which is a
    /// misconfiguration the developer needs to see, not a runtime condition
    /// the user can do anything about. The JS side logs it and carries on.
    AsyncFunction("setSnapshot") { (json: String) in
      guard let defaults = UserDefaults(suiteName: APP_GROUP) else {
        throw WidgetGroupUnavailableException()
      }
      defaults.set(json, forKey: SNAPSHOT_KEY)
      reloadTimelines()
    }

    /// Re-render the widgets from the snapshot already in the container. The
    /// app calls this when the date rolls over under a running app: the notes
    /// have not changed, but which of them is "today" has.
    AsyncFunction("reloadAll") {
      reloadTimelines()
    }
  }
}

/// WidgetKit only exists on iOS 14+; below that the app simply has no widgets
/// and this is a no-op rather than a link error.
private func reloadTimelines() {
  if #available(iOS 14.0, *) {
    WidgetCenter.shared.reloadAllTimelines()
  }
}

internal final class WidgetGroupUnavailableException: Exception {
  override var reason: String {
    "The App Group \(APP_GROUP) is unavailable — check the app's entitlements."
  }
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/** @type {import('@bacons/apple-targets').Config} */
// The WidgetKit extension target. `@bacons/apple-targets` generates it into
// the Xcode project during `expo prebuild` — every `.swift` file in this
// directory becomes part of the target — so nothing here is committed under
// `ios/`, which is prebuild output and regenerated from scratch.
//
// The App Group is the whole reason the extension can show anything: it is the
// container the app writes the snapshot into (see
// `../../modules/widget-bridge`). It has to match the main app's entitlement
// byte for byte, so both come from `../../identifiers.js` rather than being
// typed twice.
const { APP_GROUP } = require("../../identifiers.js");

module.exports = {
  type: "widget",
  name: "calendarwidget",
  entitlements: {
    "com.apple.security.application-groups": [APP_GROUP],
  },
  // Matches the app's deployment target. The widgets use no API newer than
  // iOS 16's `containerBackground`, which is applied conditionally.
  deploymentTarget: "15.1",
  frameworks: ["WidgetKit", "SwiftUI"],
};

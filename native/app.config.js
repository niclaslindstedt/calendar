// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Expo config, as a FUNCTION rather than a static app.json so the app's
// marketing version can be read from the web app's `package.json`. The wrapper
// has no version of its own — it ships one build of the calendar, and the two
// must never disagree about which one. Store build numbers are auto-incremented
// by EAS (see eas.json), so nothing here is bumped by hand.

const { version } = require("../package.json");

// Reverse-DNS app id, derived from the author domain and identical on both
// stores so the app is one product across platforms.
const BUNDLE_ID = "se.niclaslindstedt.calendar";

// The container the app and the widgets share. Pinned in four places that must
// agree — see plugins/with-widgets.js for the list.
const APP_GROUP = `group.${BUNDLE_ID}`;

// The app's light "paper" default (src/app/themeColor.ts's own fallback). Only
// paints the splash and the chrome before the page reports its live theme.
const BRAND_BG = "#f6f8fa";

// The near-black the app mark is cut from (scripts/generate-icons.mjs's INK).
// The adaptive icon's foreground runs to the edges of its tile, so the layer
// behind it has to be the same ink or the launcher's mask shows a seam.
const MARK_INK = "#1b2027";

// The EAS project this app builds under. `eas init` prints the id; paste it
// here or pass it in the environment (which is what CI does), because
// `eas init` cannot write into a dynamic config. Left unset, the project is
// simply unlinked and `eas build` will ask — it is not a build failure.
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? "";

module.exports = () => ({
  expo: {
    name: "Calendar",
    slug: "nird-calendar",
    version,
    // The calendar is a wall calendar: the month grid is laid out to fill one
    // portrait screen exactly (six week rows, no scrollbar). Landscape is not
    // broken, but it is not what the layout is measured for, so the app is
    // pinned the way the reader holds the phone.
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    scheme: "nird-calendar",
    backgroundColor: BRAND_BG,
    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      entitlements: {
        // What lets the app write the container the widget extension reads.
        "com.apple.security.application-groups": [APP_GROUP],
      },
      infoPlist: {
        // The bundled build is served over plain HTTP on the loopback
        // interface. ATS is left ON — only localhost is excepted, so nothing
        // else in the app may fall back to cleartext.
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: true,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false,
            },
          },
        },
        // Skips the App Store export-compliance prompt: no non-exempt crypto.
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: BUNDLE_ID,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: MARK_INK,
      },
    },

    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 180,
          resizeMode: "contain",
          backgroundColor: BRAND_BG,
        },
      ],
      // The bundled static server (lighttpd, via
      // @dr.pogodin/react-native-static-server) needs Android minSdk 28, and
      // the loopback origin is plain HTTP so cleartext has to be permitted.
      [
        "expo-build-properties",
        { android: { minSdkVersion: 28, usesCleartextTraffic: true } },
      ],
      // The Home Screen widgets: the App Group on iOS, the receiver and its
      // resources on Android.
      "./plugins/with-widgets",
      // Generates the WidgetKit extension target from ./targets/widget.
      ["@bacons/apple-targets", { appleTeamId: "$(TeamIdentifierPrefix)" }],
    ],

    extra: {
      // NO remote URL here, deliberately. The app serves the copy of the
      // calendar bundled inside it (assets/webroot.zip) from a loopback
      // server — that is what makes it work offline, and what makes it an app
      // rather than a viewer for a website (App Store guideline 4.2). To point
      // a debug build at a deployed slot, set EXPO_PUBLIC_CALENDAR_URL at
      // build time; src/config.ts reads that env var directly.
      ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
    },
  },
});

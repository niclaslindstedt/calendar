// THE ONE PLACE A DEPLOYMENT'S COORDINATES ENTER THIS REPOSITORY.
//
// The repository is the project; a store listing is a deployment of it. So the
// listing's name and identifier are configuration, not source: they arrive as
// build variables and are never committed. What is committed is the project's
// own plain name and a development id, which is what a fresh checkout runs
// under.
//
//   APP_DISPLAY_NAME  the listing name, and the name under the icon
//   APP_BUNDLE_ID     iOS bundle identifier + Android package name
//   EAS_PROJECT_ID    the Expo project this builds against
//
// Each is a GitHub Actions secret that `.github/workflows/` forwards, and an
// EAS environment variable on the project, because EAS resolves the config
// again on its own builders. The names are identical in every app in the
// fleet, so a secret is pasted rather than translated.
//
// Everything a native container is addressed by is spelled HERE and imported:
// the App Group, the iCloud container, the Android widget package. Spelling
// them in each consumer is how a widget ends up addressing a container the app
// never writes.

/** The project's own name. Not the listing name — see APP_DISPLAY_NAME. */
const PROJECT_NAME = "Calendar";

/** Reverse-DNS id used only by local/dev builds; never submitted. */
const DEV_BUNDLE_ID = "dev.local.calendar";

const DISPLAY_NAME = process.env.APP_DISPLAY_NAME?.trim() || PROJECT_NAME;
const BUNDLE_ID = process.env.APP_BUNDLE_ID?.trim() || DEV_BUNDLE_ID;
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID?.trim() ?? "";

// THE APP GROUP IS NOT THE BUNDLE ID, and deriving it from one would be a
// mistake. It is the name of a container, registered once in the developer
// portal and addressed by two processes; the listing it ships under is not its
// business. Deriving it would mean a plain checkout addressing
// `group.dev.local.calendar` while the extension's Swift — which cannot read a
// build variable — says something else, and a widget reading the wrong
// container builds clean, signs clean and is empty forever.
//
// So it is committed, it is the same in every build, and
// `plugins/with-widgets.js` fails the prebuild if the Swift disagrees with it.
/** The container the app and the widget extension share. */
const APP_GROUP = "group.se.agilator.calendar";

/** The package the widgets' Kotlin lives in. A class name, not a coordinate. */
const ANDROID_WIDGET_PKG = "se.agilator.calendar.widget";

// THE iCLOUD CONTAINER IS NOT THE BUNDLE ID either, for the same reason as the
// App Group. It names a container, registered once in the developer portal and
// addressed by the app and its native module; the listing it ships under is
// not its business. Deriving it would mean a plain checkout addressing
// `iCloud.dev.local.calendar` while the module's Swift — which cannot read a
// build variable — said something else, and a document store pointed at the
// wrong container syncs nothing while reporting success.
//
// So it is committed, identical in every build, and read from here by both the
// entitlements (`app.config.js`) and the Files-app declaration
// (`plugins/with-icloud.js`). The Swift and the module's TypeScript
// (`modules/icloud-store/`) spell it as the same literal, and
// `tests/native_icloud_test.ts` fails when any of them disagrees.
/** The iCloud Drive container the calendars sync through. */
const ICLOUD_CONTAINER = "iCloud.se.agilator.calendar";

// A `production` build is one headed for a store, so the fallbacks above are
// not good enough: fail here rather than uploading a binary under the dev
// bundle id or the project name. EAS sets EAS_BUILD_PROFILE on its builders.
if (process.env.EAS_BUILD_PROFILE === "production") {
  for (const name of ["APP_DISPLAY_NAME", "APP_BUNDLE_ID", "EAS_PROJECT_ID"]) {
    if (!process.env[name]?.trim()) {
      throw new Error(
        `${name} is not set. A production build needs it — set it as an EAS ` +
          `environment variable on the EAS project (and as a repository ` +
          `secret for the build workflow). See RELEASING.md.`,
      );
    }
  }
}

module.exports = {
  PROJECT_NAME,
  DEV_BUNDLE_ID,
  DISPLAY_NAME,
  BUNDLE_ID,
  EAS_PROJECT_ID,
  APP_GROUP,
  ANDROID_WIDGET_PKG,
  ICLOUD_CONTAINER,
};

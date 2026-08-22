// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// WIRES THE HOME SCREEN WIDGETS INTO BOTH NATIVE PROJECTS during
// `expo prebuild`.
//
// It has to be a config plugin rather than files committed under `ios/` and
// `android/`: those directories are prebuild OUTPUT, regenerated from scratch
// by `expo prebuild --clean` and never committed, so anything added there by
// hand survives exactly until the next build.
//
// The two platforms need very different things:
//
//   iOS  — the WidgetKit extension is a whole separate target, and generating
//          Xcode targets is `@bacons/apple-targets`' job (see
//          ../targets/widget). All that is left here is joining the MAIN app
//          to the App Group, which is the container the extension reads.
//
//   Android — a widget is just a receiver inside the app, so there is no
//          target to generate: copy the sources and the two XML resources into
//          the app module and declare the receiver in the manifest. Anything
//          under `src/main` is packed into the APK automatically, so no Gradle
//          change is needed.

const fs = require("node:fs");
const path = require("node:path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withStringsXml,
} = require("expo/config-plugins");

// Pinned in four places that must agree — here, ../app.config.js,
// ../modules/widget-bridge/{index.ts,ios/WidgetBridgeModule.swift} and
// ../targets/widget/expo-target.config.js. Changing it after release orphans
// every installed widget's data.
const APP_GROUP = "group.se.niclaslindstedt.calendar";

// The receiver's fully-qualified name. Mirrored in the Kotlin file's `package`
// declaration and in the bridge module's update broadcast.
const ANDROID_PKG = "se.niclaslindstedt.calendar.widget";
const RECEIVER = `${ANDROID_PKG}.CalendarWidgetProvider`;

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

module.exports = function withWidgets(config) {
  // --- iOS ------------------------------------------------------------------
  // The main app joins the App Group so it can write the container the widget
  // extension reads. The extension declares the same group for itself, in its
  // expo-target.config.js.
  config = withEntitlementsPlist(config, (c) => {
    const key = "com.apple.security.application-groups";
    const groups = new Set(c.modResults[key] ?? []);
    groups.add(APP_GROUP);
    c.modResults[key] = [...groups];
    return c;
  });

  // --- Android: sources + resources ----------------------------------------
  config = withDangerousMod(config, [
    "android",
    (c) => {
      const src = path.join(c.modRequest.projectRoot, "widgets", "android");
      const main = path.join(
        c.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
      );
      const javaDir = path.join(main, "java", ...ANDROID_PKG.split("."));

      for (const file of fs.readdirSync(src)) {
        if (file.endsWith(".kt")) {
          copyFile(path.join(src, file), path.join(javaDir, file));
        }
      }

      // `calendar_widget.xml` is a LAYOUT and `calendar_widget_info.xml` is
      // provider metadata; Android resolves them from different resource
      // folders, so they cannot both go in `res/xml`.
      copyFile(
        path.join(src, "calendar_widget.xml"),
        path.join(main, "res", "layout", "calendar_widget.xml"),
      );
      copyFile(
        path.join(src, "calendar_widget_info.xml"),
        path.join(main, "res", "xml", "calendar_widget_info.xml"),
      );
      return c;
    },
  ]);

  // --- Android: the strings the layout and the metadata reference ----------
  config = withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: "calendar_widget_description" },
          _: "The next days you have written something on",
        },
        {
          $: { name: "calendar_widget_empty" },
          _: "Nothing coming up.",
        },
      ],
      c.modResults,
    );
    return c;
  });

  // --- Android: declare the receiver ---------------------------------------
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.receiver = app.receiver ?? [];
    if (app.receiver.some((r) => r.$?.["android:name"] === RECEIVER)) return c;

    app.receiver.push({
      $: {
        "android:name": RECEIVER,
        // The launcher is a different app, so the receiver has to be
        // exported for APPWIDGET_UPDATE to reach it at all.
        "android:exported": "true",
        "android:label": "@string/calendar_widget_description",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
              },
            },
            // The widget's content is relative to "today", so it has to
            // re-render when the day changes under it — including after a
            // timezone change or a manual clock adjustment, which is why all
            // three are listed rather than relying on a polling period.
            { $: { "android:name": "android.intent.action.DATE_CHANGED" } },
            { $: { "android:name": "android.intent.action.TIME_SET" } },
            { $: { "android:name": "android.intent.action.TIMEZONE_CHANGED" } },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/calendar_widget_info",
          },
        },
      ],
    });
    return c;
  });

  return config;
};

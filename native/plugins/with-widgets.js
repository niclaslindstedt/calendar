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

// The package the widgets' Kotlin lives in. Mirrored in the Kotlin files'
// `package` declaration and in the bridge module's update broadcast.
const ANDROID_PKG = "se.niclaslindstedt.calendar.widget";

// The four widgets, as the launcher's picker sees them. Each is one receiver
// pointing at its own `<appwidget-provider>` metadata; the classes differ only
// in which span of days they print (widgets/android/CalendarWidgetProvider.kt).
//
// `labelText` is what the picker shows under the preview and `descriptionText`
// the line beneath it. Both are spelled out per widget rather than shared,
// because the picker is where a reader chooses between "This week" and "Work
// week" — that choice IS the configuration, so the wording has to carry it.
const WIDGETS = [
  {
    className: "TodayWidgetProvider",
    info: "calendar_widget_today_info",
    label: "calendar_widget_today",
    labelText: "Today",
    description: "calendar_widget_today_description",
    descriptionText: "The date, and the note you left on it",
  },
  {
    className: "NextThreeWidgetProvider",
    info: "calendar_widget_next_three_info",
    label: "calendar_widget_next_three",
    labelText: "Next 3 days",
    description: "calendar_widget_next_three_description",
    descriptionText: "Today and the two days after it",
  },
  {
    className: "ThisWeekWidgetProvider",
    info: "calendar_widget_this_week_info",
    label: "calendar_widget_this_week",
    labelText: "This week",
    description: "calendar_widget_this_week_description",
    descriptionText: "Every day of the week you are in",
  },
  {
    className: "WorkWeekWidgetProvider",
    info: "calendar_widget_work_week_info",
    label: "calendar_widget_work_week",
    labelText: "Work week",
    description: "calendar_widget_work_week_description",
    descriptionText: "This week without the days your country does not work",
  },
];

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

      // Android resolves LAYOUTS and provider METADATA from different
      // resource folders, so the two kinds cannot share one. The `_info`
      // suffix is what tells them apart — keep naming new metadata files
      // that way, or they land in res/layout and the widget fails to inflate
      // with an error that names neither file.
      for (const file of fs.readdirSync(src)) {
        if (!file.endsWith(".xml")) continue;
        const folder = file.endsWith("_info.xml") ? "xml" : "layout";
        copyFile(path.join(src, file), path.join(main, "res", folder, file));
      }
      return c;
    },
  ]);

  // --- Android: the strings the layouts and the metadata reference ---------
  config = withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      WIDGETS.flatMap((widget) => [
        { $: { name: widget.label }, _: widget.labelText },
        { $: { name: widget.description }, _: widget.descriptionText },
      ]),
      c.modResults,
    );
    return c;
  });

  // --- Android: declare the receivers --------------------------------------
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.receiver = app.receiver ?? [];

    for (const widget of WIDGETS) {
      const name = `${ANDROID_PKG}.${widget.className}`;
      if (app.receiver.some((r) => r.$?.["android:name"] === name)) continue;

      app.receiver.push({
        $: {
          "android:name": name,
          // The launcher is a different app, so the receiver has to be
          // exported for APPWIDGET_UPDATE to reach it at all.
          "android:exported": "true",
          "android:label": `@string/${widget.label}`,
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
              // A widget's content is relative to "today", so it has to
              // re-render when the day changes under it — including after a
              // timezone change or a manual clock adjustment, which is why
              // all three are listed rather than relying on a polling period.
              { $: { "android:name": "android.intent.action.DATE_CHANGED" } },
              { $: { "android:name": "android.intent.action.TIME_SET" } },
              {
                $: { "android:name": "android.intent.action.TIMEZONE_CHANGED" },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": `@xml/${widget.info}`,
            },
          },
        ],
      });
    }
    return c;
  });

  return config;
};

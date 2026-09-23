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

// Both derived in ../identifiers.js, which is the only place the bundle id
// enters this repository. Changing the group after release orphans every
// installed widget's data.
//
// Swift cannot read a build variable, so the two `.swift` files that address
// the container still spell it out — and `assertSwiftAgrees` below fails the
// prebuild when they disagree with this. A mismatched App Group is the worst
// failure this feature has: it compiles, it signs, it installs, and the widget
// is simply empty forever.
const {
  APP_GROUP,
  ANDROID_WIDGET_PKG: ANDROID_PKG,
  BUNDLE_ID,
} = require("../identifiers.js");

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

/**
 * Copy a Kotlin source, pointing its `R` import at THIS build's application id.
 *
 * The generated resources live in the app's own package, which is the bundle
 * id — a build variable now, so the import cannot be a literal in a file that
 * is committed. The committed line names the development id; this rewrites it
 * on the way in, and adds it when a file uses `R` without importing it at all.
 */
function copyKotlin(from, to, applicationId) {
  let source = fs.readFileSync(from, "utf8");
  const wanted = `import ${applicationId}.R`;
  if (/^import [\w.]+\.R$/m.test(source)) {
    source = source.replace(/^import [\w.]+\.R$/m, wanted);
  } else if (/\bR\.[a-z]/.test(source)) {
    source = source.replace(/^(package .+)$/m, `$1\n\n${wanted}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, source);
}

/**
 * Fail the prebuild if a Swift file addresses a different container than the
 * one the entitlements grant. Reads the literal rather than rewriting it: a
 * generated constant would be one more thing to get wrong, and the check is
 * the part that has value.
 */
function assertSwiftAgrees(projectRoot) {
  const sources = [
    path.join(projectRoot, "targets", "widget", "Snapshot.swift"),
    path.join(
      projectRoot,
      "modules",
      "widget-bridge",
      "ios",
      "WidgetBridgeModule.swift",
    ),
  ];
  for (const file of sources) {
    if (!fs.existsSync(file)) continue;
    const found = fs.readFileSync(file, "utf8").match(/"(group\.[^"]+)"/);
    if (found && found[1] !== APP_GROUP) {
      throw new Error(
        `${path.basename(file)} addresses ${found[1]}, but this build's App ` +
          `Group is ${APP_GROUP}. A widget reading the wrong container builds ` +
          `clean and shows nothing — fix the literal, or the APP_BUNDLE_ID.`,
      );
    }
  }
}

module.exports = function withWidgets(config) {
  assertSwiftAgrees(__dirname.replace(/\/plugins$/, ""));

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
          copyKotlin(
            path.join(src, file),
            path.join(javaDir, file),
            c.android?.package ?? BUNDLE_ID,
          );
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

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE ONE SCRIPT THE WRAPPER INJECTS INTO THE PAGE.
//
// The web app is shipped unchanged — nothing in `src/` knows it is running
// inside a native shell, and that is the whole point of a thin wrapper. So
// everything native needs from the page is read from the *outside*, by this
// script, over `window.ReactNativeWebView.postMessage`:
//
//   • the resolved theme colours, so the native chrome (status bar, safe-area
//     bands) and the widgets match whichever preset the reader picked; and
//   • the `calendar:` / `oss:cache:` slice of `localStorage`, which is where
//     the notes live. `src/snapshot.ts` turns that into the widget snapshot.
//
// It also unregisters the service worker (see `SW_TEARDOWN`).
//
// This file exports STRINGS, not behaviour: `react-native-webview` takes the
// script as source text. Keep it dependency-free ES5-ish — it runs in the
// page, not in Metro's bundle, so nothing here is transpiled or polyfilled.

/** The message channel. Namespaced so a stray `postMessage` from the page (or
 *  from a future framework feature) is never mistaken for a report. */
export const REPORT_TYPE = "calendar-native/report";

/** How long a burst of `localStorage` writes is allowed to settle before a
 *  report goes out. A note is saved keystroke-by-keystroke through a debounced
 *  store, so reporting every write would wake both widget processes on every
 *  letter typed. */
const REPORT_DEBOUNCE_MS = 600;

/** The `localStorage` prefixes worth carrying out of the page. Everything the
 *  snapshot reads is under one of them; the OAuth tokens under
 *  `calendar:dropbox:*` / `calendar:gdrive:*` are excluded by name below, so
 *  a credential never crosses the bridge. */
const KEY_PREFIXES = ["calendar:", "oss:cache:"];

/** Keys matching these never leave the page, whatever their prefix. Access
 *  tokens are the app's business, not the wrapper's. */
const SECRET_KEYS = [
  "calendar:dropbox:access",
  "calendar:dropbox:refresh",
  "calendar:gdrive:token",
];

/**
 * Take the service worker out of the picture, once, at startup.
 *
 * The wrapper serves the app off local disk, so the worker's offline cache
 * buys nothing here — and it actively hurts: the origin is a fixed
 * `http://localhost:<port>`, so a worker registered by version N of the app
 * keeps answering from its precache after a store update has already unpacked
 * version N+1 into the webroot. The visible symptom is an App Store update
 * that changes nothing until the app is deleted and reinstalled.
 *
 * Everything is guarded: an older WebView with no `caches` or no
 * `serviceWorker` simply skips it.
 */
const SW_TEARDOWN = `
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (reg) { reg.unregister(); });
      }).catch(function () {});
    }
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        keys.forEach(function (key) { caches.delete(key); });
      }).catch(function () {});
    }
  } catch (e) {}
`;

/**
 * The script injected BEFORE the page loads.
 *
 * Only the service-worker teardown goes here, and it has to: a worker that has
 * already claimed the page is answering fetches by the time the document
 * fires `load`, so unregistering it after the fact leaves this launch on the
 * stale bundle. Reporting waits for the page, since there is nothing to read
 * until the app has mounted.
 */
export const BEFORE_LOAD_SCRIPT = `(function () {${SW_TEARDOWN}})(); true;`;

/**
 * The script injected once the page has loaded.
 *
 * Reports immediately, then on every settled `localStorage` write, on a
 * `storage` event, and whenever the page becomes visible again (the app came
 * back to the foreground, and the day may well have changed while it was
 * away). `setItem` / `removeItem` / `clear` are patched rather than polled:
 * the store writes through `localStorage`, so a patched write is the exact
 * moment there is something new to say.
 */
export const AFTER_LOAD_SCRIPT = `(function () {
  if (window.__calendarNativeReporter) return;
  window.__calendarNativeReporter = true;

  var PREFIXES = ${JSON.stringify(KEY_PREFIXES)};
  var SECRETS = ${JSON.stringify(SECRET_KEYS)};

  function collect() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (!key) continue;
        if (SECRETS.indexOf(key) !== -1) continue;
        var wanted = false;
        for (var p = 0; p < PREFIXES.length; p += 1) {
          if (key.indexOf(PREFIXES[p]) === 0) { wanted = true; break; }
        }
        if (!wanted) continue;
        var value = localStorage.getItem(key);
        if (typeof value === "string") out[key] = value;
      }
    } catch (e) {}
    return out;
  }

  function colours() {
    try {
      var style = getComputedStyle(document.documentElement);
      var read = function (name) { return (style.getPropertyValue(name) || "").trim(); };
      return {
        background: read("--page-bg"),
        foreground: read("--fg"),
        muted: read("--muted"),
        accent: read("--accent")
      };
    } catch (e) { return {}; }
  }

  function report() {
    try {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: ${JSON.stringify(REPORT_TYPE)},
        storage: collect(),
        theme: colours()
      }));
    } catch (e) {}
  }

  var timer = null;
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; report(); }, ${REPORT_DEBOUNCE_MS});
  }

  try {
    var proto = Object.getPrototypeOf(localStorage) || Storage.prototype;
    ["setItem", "removeItem", "clear"].forEach(function (name) {
      var original = proto[name];
      if (typeof original !== "function") return;
      proto[name] = function () {
        var result = original.apply(this, arguments);
        schedule();
        return result;
      };
    });
  } catch (e) {}

  window.addEventListener("storage", schedule);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) schedule();
  });

  // The theme engine paints on the frame after mount, so the very first read
  // can land on an unstyled document. Report once now for the notes and once
  // shortly after for the colours.
  report();
  setTimeout(report, 400);
})(); true;`;

/** Narrow an arbitrary parsed `postMessage` body to a report. */
export function isReport(value: unknown): value is {
  type: string;
  storage: Record<string, string>;
  theme: Record<string, string>;
} {
  const message = value as { type?: unknown; storage?: unknown } | null;
  return (
    typeof message === "object" &&
    message !== null &&
    message.type === REPORT_TYPE &&
    typeof message.storage === "object" &&
    message.storage !== null
  );
}

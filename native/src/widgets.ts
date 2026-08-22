// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE PUBLISHER: what the app does with a report from the page.
//
// The page reports its storage (see `injected.ts`), `snapshot.ts` derives the
// snapshot, and this module hands it to the native bridge. Its own job is the
// two things neither of those should own:
//
//   • DEGRADING. The bridge module is loaded optionally, so a build without it
//     — Expo Go, a bare `expo start`, a platform where autolinking missed it —
//     reports "no widgets" and the app runs normally. Widgets are the one
//     feature this wrapper adds; they are not allowed to be the reason it
//     fails to start.
//   • NOT WRITING WHAT IT ALREADY WROTE. Publishing wakes a widget process on
//     both platforms, and a note is saved keystroke-by-keystroke, so the same
//     snapshot arrives over and over. The signature comparison here is what
//     turns that back into one write per actual change.

import { buildSnapshot, snapshotSignature, type PageReport } from "./snapshot";

type Bridge = {
  setSnapshot(json: string): Promise<void>;
  reloadAll(): Promise<void>;
};

// `undefined` = not resolved yet; `null` = resolved to unavailable.
let cached: Bridge | null | undefined;

/** The native bridge, or null in a build that does not carry it. Memoised. */
function bridge(): Bridge | null {
  if (cached !== undefined) return cached;
  try {
    // Required lazily so a build without the module does not fail at import.
    const module = require("../modules/widget-bridge") as {
      default?: Bridge | null;
      WidgetBridge?: Bridge | null;
    };
    cached = module.WidgetBridge ?? module.default ?? null;
  } catch {
    cached = null;
  }
  if (cached === null) {
    console.warn("[widgets] native bridge unavailable — widgets are off");
  }
  return cached;
}

/** The last snapshot actually written, by signature. */
let published: string | null = null;

/**
 * Derive and publish a snapshot, unless an identical one is already out there.
 *
 * Returns whether it wrote. Failures are swallowed after a warning: a widget
 * that is a refresh behind is a far better outcome than an app that throws
 * inside a WebView message handler.
 */
export async function publishReport(
  report: PageReport,
  now: Date = new Date(),
): Promise<boolean> {
  const native = bridge();
  if (!native) return false;

  const snapshot = buildSnapshot(report, now);
  const signature = snapshotSignature(snapshot);
  if (signature === published) return false;

  try {
    await native.setSnapshot(JSON.stringify(snapshot));
    published = signature;
    return true;
  } catch (error) {
    console.warn("[widgets] could not publish the snapshot", error);
    return false;
  }
}

/**
 * Re-render the widgets from the snapshot already published.
 *
 * For the date rolling over under a running app: the notes have not changed,
 * but which of them is "today" has, and the widget's own timeline may not have
 * reached that midnight yet.
 */
export async function reloadWidgets(): Promise<void> {
  const native = bridge();
  if (!native) return;
  try {
    await native.reloadAll();
  } catch (error) {
    console.warn("[widgets] could not reload the widgets", error);
  }
}

/** Forget what was last published, so the next report is written even if it is
 *  byte-identical. Used when the day changes: the snapshot is the same but the
 *  widgets' reading of it is not. */
export function forgetPublished(): void {
  published = null;
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The developer-mode "Demo data" backend: a `StorageAdapter` whose document
// is the demo's Personal calendar (`../dev/demoData.ts`), held in memory.
// While the toggle is on it takes over storage completely — nothing is
// written to disk, and turning it off (or reloading) returns to the real
// backend with the user's document untouched. A fresh adapter is created each
// time the toggle turns on, so every demo session starts from the pristine
// sample.

import type {
  StorageAdapter,
  StorageBackendId,
  StoredSnapshot,
} from "@niclaslindstedt/oss-framework/storage";

import { buildPersonalDoc } from "../dev/demoData.ts";
import { serializeDoc, type CalendarDoc } from "../types.ts";

/** The app-level backend id union: the framework's backends this app offers,
 *  plus the two the app adds itself — iCloud Drive, where a host offers it
 *  (`icloudHost.ts`), and our demo. Google Drive is excluded deliberately —
 *  the framework still ships the adapter, and this app no longer connects to
 *  it, so saying so in the type is what keeps `buildAdapter`'s switch
 *  exhaustive. */
export type BackendId = Exclude<StorageBackendId, "gdrive"> | "icloud" | "demo";

/** Build the demo document around a moment — the demo's Personal calendar
 *  (`../dev/demoData.ts`, the same one the store screenshots show), every note
 *  placed relative to the week `anchor` is in. Exported (with an injectable
 *  anchor) so tests can pin it to a fixed day. */
export function buildDemoDoc(anchor: Date = new Date()): CalendarDoc {
  return buildPersonalDoc(anchor);
}

/** In-memory demo backend. `id` is our app-level `"demo"`; the cast is the
 *  one place the app widens the framework's backend-id union. */
export function createDemoAdapter(anchor: Date = new Date()): StorageAdapter {
  let text = serializeDoc(buildDemoDoc(anchor));

  const snapshot = (): StoredSnapshot => ({ text });

  return {
    id: "demo" as StorageBackendId,
    label: "Demo data",
    capabilities: new Set(["loadSync"] as const),
    loadSync: () => snapshot(),
    load: () => Promise.resolve(snapshot()),
    save: (next: string) => {
      // Edits round-trip in memory so the demo behaves like real storage,
      // but nothing ever reaches disk.
      text = next;
      return Promise.resolve(snapshot());
    },
  };
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The presentation demo: `VITE_SEED=demo` (`make demo`) boots the app onto one
// person's year — `buildDemoDocs` in `./demoData.ts` — held entirely in
// memory. It is the live demo and what the App Store screenshots are taken of.
//
// **How it stays off the device.** Everything this install keeps goes through
// `localStorage`: the browser backend's documents, the calendar registry and
// the active calendar, the backend choice and its Dropbox tokens, the
// settings, the theme and the language. So the demo swaps that one seam:
// before the app's first module loads, `bootDemo` puts an in-memory `Storage`
// in `window.localStorage`'s place, holding the demo calendars under the
// browser backend's own keys. Every screen then runs the app's real code over
// the demo — the synchronous first paint, calendar switching, the planner —
// and every edit lands in memory and is gone on reload. Nothing of the demo is
// written to the device, and the device's notes are never read: the only
// thing carried over is this install's look (`carriesOver`), so a demo opens
// in the settings and theme the person chose — and the screenshot harness can
// set them the way Settings does.
//
// Connecting a storage backend is refused while the demo runs (`App.tsx`),
// since the first save would copy the demo into the reader's real folder or
// cloud.
//
// Dev tooling, not a shipped feature: `DEMO` folds to `false` in any build
// without `VITE_SEED=demo`, so this module never reaches the production
// bundle.

import { buildDemoDocs } from "./demoData.ts";
import { documentKey } from "../storage/paths.ts";
import { serializeDoc } from "../types.ts";

/** True in a build made with `VITE_SEED=demo`; folds to `false` otherwise. */
export const DEMO = import.meta.env.VITE_SEED === "demo";

/** A `Storage` that lives and dies with the page. */
export class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value));
  }
}

const SETTINGS_KEY = "calendar:settings";

/**
 * The keys a demo copies from the device: how this install looks and which
 * language it speaks — never a note, a calendar, a backend, a token, the
 * contacts opt-in list or the logs.
 */
const CARRIED = new Set([
  SETTINGS_KEY,
  "calendar:appearance",
  "calendar:language",
]);

export function carriesOver(key: string): boolean {
  return CARRIED.has(key);
}

/** The device's settings with everything that points at storage taken out:
 *  the demo always saves through the browser backend (into memory), and the
 *  Developer tab's own demo toggle would swap the demo for its sample. */
function demoSettings(raw: string | null): string {
  let parsed: Record<string, unknown> = {};
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (value && typeof value === "object") {
      parsed = value as Record<string, unknown>;
    }
  } catch {
    // A corrupt blob is replaced by the defaults.
  }
  return JSON.stringify({ ...parsed, backend: "browser", demoData: false });
}

/**
 * Build the in-memory store the demo runs on: this device's look (see
 * `carriesOver`), then the demo calendars' documents under the browser
 * backend's keys.
 */
export function demoStorage(
  device: Storage | null,
  now: Date = new Date(),
): MemoryStorage {
  const memory = new MemoryStorage();
  if (device) {
    for (let i = 0; i < device.length; i++) {
      const key = device.key(i);
      if (key === null || !carriesOver(key)) continue;
      const value = device.getItem(key);
      if (value !== null) memory.setItem(key, value);
    }
  }
  memory.setItem(SETTINGS_KEY, demoSettings(memory.getItem(SETTINGS_KEY)));
  memory.setItem("calendar:backend", "browser");
  for (const [slug, doc] of Object.entries(buildDemoDocs(now))) {
    memory.setItem(documentKey(slug), serializeDoc(doc));
  }
  return memory;
}

/**
 * Swap `window.localStorage` for the demo's in-memory store. Called from
 * `main.tsx` before the app's first module loads, so no read ever reaches the
 * device's notes. Returns false (and changes nothing) where the property
 * can't be replaced.
 */
export function bootDemo(): boolean {
  let device: Storage | null = null;
  try {
    device = window.localStorage;
  } catch {
    // Storage blocked: the demo still runs, in the default look.
  }
  const memory = demoStorage(device);
  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => memory,
    });
  } catch {
    return false;
  }
  return window.localStorage === memory;
}

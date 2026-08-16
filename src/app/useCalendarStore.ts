// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The document store: the calendar document, loaded from and saved through
// the active storage backend. Owns load-on-switch, the debounced save
// pipeline with revision tracking, and the save-status line the Storage tab
// shows. Deliberately simpler than a full sync engine: one document, last
// writer wins, conflicts resolve by adopting the remote copy (per-day notes
// make silent overwrites low-stakes).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  ConflictError,
  describeStorageError,
  type StorageAdapter,
} from "@niclaslindstedt/oss-framework/storage";

import { migrator } from "./migrations.ts";
import { error as logError, status } from "../output.ts";
import {
  coerceDoc,
  emptyDoc,
  serializeDoc,
  type CalendarDoc,
} from "./types.ts";
import { buildAdapter, type BackendId } from "./storage/backends.ts";
import { createDemoAdapter } from "./storage/demoAdapter.ts";

export type SaveState =
  | { kind: "loading" }
  | { kind: "saved" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export type CalendarStore = {
  /** The live document (empty while the first load is in flight). */
  doc: CalendarDoc;
  /** Set (or clear, with "") the text for a day. */
  setEntry: (day: DayKey, text: string) => void;
  saveState: SaveState;
  /** The backend the store is actually saving through — falls back to
   *  "browser" when the requested backend isn't connected. */
  effectiveBackend: BackendId;
};

function parseSnapshot(text: string): CalendarDoc {
  try {
    return coerceDoc(migrator.migrate(JSON.parse(text)).data);
  } catch (err) {
    logError(`Stored document unreadable — starting empty (${String(err)})`);
    return emptyDoc();
  }
}

/** The store. `requestedBackend` is the settings choice; `demoMode` swaps in
 *  a fresh in-memory demo adapter while true (the real backend and document
 *  are untouched). */
export function useCalendarStore(
  requestedBackend: BackendId,
  demoMode: boolean,
): CalendarStore {
  const [doc, setDoc] = useState<CalendarDoc>(emptyDoc);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "loading" });
  const [effectiveBackend, setEffectiveBackend] =
    useState<BackendId>("browser");

  const adapterRef = useRef<StorageAdapter | null>(null);
  const revisionRef = useRef<string | undefined>(undefined);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic token: a slow load from a backend the user already switched
  // away from must not clobber the current one.
  const loadSeq = useRef(0);

  // (Re)build the adapter and load the document whenever the backend choice
  // or demo mode changes.
  useEffect(() => {
    const seq = ++loadSeq.current;
    setSaveState({ kind: "loading" });

    (async () => {
      let adapter: StorageAdapter | null = null;
      let effective: BackendId = requestedBackend;
      if (demoMode) {
        adapter = createDemoAdapter();
        effective = "demo";
      } else {
        adapter = await buildAdapter(requestedBackend);
        if (!adapter) {
          adapter = await buildAdapter("browser");
          effective = "browser";
        }
      }
      if (seq !== loadSeq.current || !adapter) return;
      adapterRef.current = adapter;
      setEffectiveBackend(effective);

      // Fast path first so localStorage-backed boots never flash empty.
      const sync = adapter.loadSync?.();
      if (sync) {
        revisionRef.current = sync.revision;
        setDoc(parseSnapshot(sync.text));
        setSaveState({ kind: "saved" });
      }

      try {
        const snapshot = await adapter.load();
        if (seq !== loadSeq.current) return;
        if (snapshot) {
          revisionRef.current = snapshot.revision;
          setDoc(parseSnapshot(snapshot.text));
        } else if (!sync) {
          setDoc(emptyDoc());
        }
        setSaveState({ kind: "saved" });
        status(`Loaded calendar from ${effective}`);
      } catch (err) {
        if (seq !== loadSeq.current) return;
        const message = describeStorageError(err);
        logError(`Load from ${effective} failed: ${message}`);
        setSaveState({ kind: "error", message });
      }
    })();

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [requestedBackend, demoMode]);

  const push = useCallback(async (next: CalendarDoc) => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    setSaveState({ kind: "saving" });
    try {
      const snapshot = await adapter.save(
        serializeDoc(next),
        revisionRef.current,
      );
      revisionRef.current = snapshot.revision;
      setSaveState({ kind: "saved" });
    } catch (err) {
      if (err instanceof ConflictError) {
        // Another device pushed first: adopt the remote copy and tell the log.
        revisionRef.current = err.remote.revision;
        setDoc(parseSnapshot(err.remote.text));
        setSaveState({ kind: "saved" });
        logError("Save conflict — loaded the newer copy from the backend");
        return;
      }
      const message = describeStorageError(err);
      logError(`Save failed: ${message}`);
      setSaveState({ kind: "error", message });
    }
  }, []);

  const setEntry = useCallback(
    (day: DayKey, text: string) => {
      setDoc((prev) => {
        const entries = { ...prev.entries };
        const trimmed = text.trim();
        if (trimmed === "") delete entries[day];
        else entries[day] = text;
        const next = { ...prev, entries };

        // Debounce per the adapter's own preference (cloud adapters coalesce
        // keystrokes; localStorage saves immediately).
        const delay = adapterRef.current?.saveDebounceMs ?? 0;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void push(next), delay);
        return next;
      });
    },
    [push],
  );

  return useMemo(
    () => ({ doc, setEntry, saveState, effectiveBackend }),
    [doc, setEntry, saveState, effectiveBackend],
  );
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The document store: the active namespace's calendar, loaded from and saved
// through the active storage backend. Owns load-on-switch, the debounced save
// pipeline with revision tracking, and the save-status line the Storage tab
// shows. Deliberately simpler than a full sync engine: one document, last
// writer wins, conflicts resolve by adopting the remote copy (per-day notes
// make silent overwrites low-stakes).
//
// "Which document" is (backend, namespace): the backend is the place, the
// namespace is the file in it. A change to either is one thing to this store
// — a *session*: build an adapter, load, then save through it until the next
// change swaps it out.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { DEFAULT_NAMESPACE_SLUG } from "@niclaslindstedt/oss-framework/namespaces";
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

/** One (backend, namespace) document, with the adapter that reads and writes
 *  it and the revision that document is at. Held by value so an in-flight
 *  save always finishes against the adapter it started on, even if the user
 *  has since switched namespace. */
type Session = {
  adapter: StorageAdapter;
  revision: string | undefined;
};

function parseSnapshot(text: string): CalendarDoc {
  try {
    return coerceDoc(migrator.migrate(JSON.parse(text)).data);
  } catch (err) {
    logError(`Stored document unreadable — starting empty (${String(err)})`);
    return emptyDoc();
  }
}

/** The store. `requestedBackend` is the settings choice, `namespace` the
 *  active namespace's slug; `demoMode` swaps in a fresh in-memory demo
 *  adapter while true (the real backend and document are untouched — and the
 *  demo has no namespaces of its own, so the slug is ignored). */
export function useCalendarStore(
  requestedBackend: BackendId,
  demoMode: boolean,
  namespace: string = DEFAULT_NAMESPACE_SLUG,
): CalendarStore {
  const [doc, setDoc] = useState<CalendarDoc>(emptyDoc);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "loading" });
  const [effectiveBackend, setEffectiveBackend] =
    useState<BackendId>("browser");

  const sessionRef = useRef<Session | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The edit a debounce is still sitting on, with the session it belongs to.
  // A session change flushes it rather than dropping it — switching namespace
  // right after a keystroke must not lose that keystroke.
  const pending = useRef<{ session: Session; doc: CalendarDoc } | null>(null);

  const push = useCallback(async (session: Session, next: CalendarDoc) => {
    // A save that outlives its session still completes (the bytes belong in
    // that namespace either way), but it must not touch the UI — that now
    // shows a different document.
    const live = () => sessionRef.current === session;
    if (live()) setSaveState({ kind: "saving" });
    try {
      const snapshot = await session.adapter.save(
        serializeDoc(next),
        session.revision,
      );
      session.revision = snapshot.revision;
      if (live()) setSaveState({ kind: "saved" });
    } catch (err) {
      if (err instanceof ConflictError) {
        // Another device pushed first: adopt the remote copy and tell the log.
        session.revision = err.remote.revision;
        if (live()) {
          setDoc(parseSnapshot(err.remote.text));
          setSaveState({ kind: "saved" });
        }
        logError("Save conflict — loaded the newer copy from the backend");
        return;
      }
      const message = describeStorageError(err);
      logError(`Save failed: ${message}`);
      if (live()) setSaveState({ kind: "error", message });
    }
  }, []);

  /** Send a debounced edit now — on a session change, so the document it
   *  belongs to gets it before the store moves on. */
  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const due = pending.current;
    pending.current = null;
    if (due) void push(due.session, due.doc);
  }, [push]);

  // (Re)build the adapter and load the document whenever the backend choice,
  // the namespace, or demo mode changes.
  useEffect(() => {
    let current = true;
    flush();
    sessionRef.current = null;
    setSaveState({ kind: "loading" });

    (async () => {
      let adapter: StorageAdapter | null = null;
      let effective: BackendId = requestedBackend;
      if (demoMode) {
        adapter = createDemoAdapter();
        effective = "demo";
      } else {
        adapter = await buildAdapter(requestedBackend, namespace);
        if (!adapter) {
          adapter = await buildAdapter("browser", namespace);
          effective = "browser";
        }
      }
      // A slow load from a document the user has already switched away from
      // must not clobber the current one.
      if (!current || !adapter) return;
      const session: Session = { adapter, revision: undefined };
      sessionRef.current = session;
      setEffectiveBackend(effective);

      // Fast path first so localStorage-backed boots never flash empty.
      const sync = adapter.loadSync?.();
      if (sync) {
        session.revision = sync.revision;
        setDoc(parseSnapshot(sync.text));
        setSaveState({ kind: "saved" });
      } else {
        // A cloud namespace has nothing to show until its load lands; the
        // previous namespace's notes must not sit there in the meantime.
        setDoc(emptyDoc());
      }

      try {
        const snapshot = await adapter.load();
        if (!current || sessionRef.current !== session) return;
        if (snapshot) {
          session.revision = snapshot.revision;
          setDoc(parseSnapshot(snapshot.text));
        } else if (!sync) {
          setDoc(emptyDoc());
        }
        setSaveState({ kind: "saved" });
        status(`Loaded calendar from ${effective}`);
      } catch (err) {
        if (!current || sessionRef.current !== session) return;
        const message = describeStorageError(err);
        logError(`Load from ${effective} failed: ${message}`);
        setSaveState({ kind: "error", message });
      }
    })();

    return () => {
      current = false;
      flush();
    };
  }, [requestedBackend, demoMode, namespace, flush]);

  const setEntry = useCallback(
    (day: DayKey, text: string) => {
      setDoc((prev) => {
        const entries = { ...prev.entries };
        const trimmed = text.trim();
        if (trimmed === "") delete entries[day];
        else entries[day] = text;
        const next = { ...prev, entries };

        const session = sessionRef.current;
        if (!session) return next;
        // Debounce per the adapter's own preference (cloud adapters coalesce
        // keystrokes; localStorage saves immediately).
        const delay = session.adapter.saveDebounceMs ?? 0;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        pending.current = { session, doc: next };
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          pending.current = null;
          void push(session, next);
        }, delay);
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

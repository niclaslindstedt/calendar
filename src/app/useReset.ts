// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The reset, wired up: Settings → Storage asks for a calendar (or all of
// them) to be emptied, and this is the one place that knows how that reaches
// every store and backend it has to.
//
// It is deliberately the same shape as `useBackup` and shares its plumbing —
// `storage/reset.ts` is the pure rules, `storage/backupIo.ts` does the
// round-trip through the adapters, and the calendar on screen is special-cased
// the same way in both: emptied through the live store, so the reader sees it
// go without a reload and the revision the store is holding stays current.

import { useCallback, useState } from "react";

import { status } from "../output.ts";
import type { BackendId } from "./storage/backends.ts";
import { writeCalendarDocuments } from "./storage/backupIo.ts";
import {
  clearedDocuments,
  noteCount,
  resetTargets,
  type ResetScope,
} from "./storage/reset.ts";
import { emptyDoc } from "./types.ts";
import type { CalendarsStore } from "./useCalendars.ts";
import type { CalendarStore } from "./useCalendarStore.ts";

/** What a reset did: the calendars it emptied, the notes it took off the one
 *  on screen (the only count that is free — the others are not loaded), and
 *  the calendars whose emptied document couldn't be written. */
export type ResetResult = {
  scope: ResetScope;
  calendars: number;
  notes: number;
  failed: string[];
};

export type ResetActions = {
  /** True while the writes are in flight (a cloud backend, once per
   *  calendar, in the worst case). */
  busy: boolean;
  /** How many notes the calendar on screen is holding — read from the live
   *  document, so it counts the keystroke still sitting on the debounce. */
  activeNotes: number;
  /** Empty the calendar on screen, or every calendar. */
  reset: (scope: ResetScope) => Promise<ResetResult>;
};

export function useReset(deps: {
  /** The backend the store is actually saving through. */
  backend: BackendId;
  calendars: CalendarsStore;
  store: CalendarStore;
}): ResetActions {
  const [busy, setBusy] = useState(false);
  const { backend, calendars, store } = deps;
  const activeSlug = calendars.activeSlug;

  const reset = useCallback(
    async (scope: ResetScope): Promise<ResetResult> => {
      setBusy(true);
      try {
        const slugs = resetTargets(calendars.list, activeSlug, scope);
        const notes = noteCount(store.doc);
        // The one on screen first, through the live store: it is the write the
        // reader is watching, and going through the store also drops the
        // keystroke still sitting on the debounce rather than letting it land
        // on top of the emptied document a moment later.
        store.replaceDoc(emptyDoc());
        // ...and the rest through the adapters, skipping the one on screen.
        // Which is also why `failed` can't name it: a failed save of the
        // active document is the store's own to report, and it does — the
        // Storage tab's status line above says so.
        const failed = await writeCalendarDocuments(
          backend,
          clearedDocuments(slugs),
          activeSlug,
        );
        status(
          `Reset ${slugs.length - failed.length} calendars (${notes} notes ` +
            `removed from the one on screen)`,
        );
        return {
          scope,
          calendars: slugs.length - failed.length,
          notes,
          failed,
        };
      } finally {
        setBusy(false);
      }
    },
    [activeSlug, backend, calendars.list, store],
  );

  return { busy, activeNotes: noteCount(store.doc), reset };
}

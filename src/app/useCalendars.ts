// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The calendar registry — the "store stays in the app" seam for the
// framework's `namespaces` module. The framework owns the shape, the pure
// list transforms and the management dialog; this hook owns *where* the list
// and the active-calendar pointer live (two localStorage keys) and what
// happens to a calendar's notes when it is deleted.
//
// The framework's word for one of these is a "namespace" — a generic slot an
// app files a document under. This app has exactly one kind of document, so
// the slot and the thing in it are the same thing to a reader: a calendar.
// That translation is made at the import below (and, for the default slug, in
// `storage/paths.ts`); nothing downstream of it says "namespace".
//
// Switching calendars only changes the active slug; `useCalendarStore` —
// which keys off it — loads that calendar's document from the same backend.
// The backend choice and its connection (a token, a folder handle) are
// device-wide and shared by every calendar; only the document's name differs
// (`storage/paths.ts`).

import { useCallback } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";
import {
  addNamespace as addCalendar,
  normalizeNamespaces as normalizeCalendars,
  parseNamespaces as parseCalendars,
  removeNamespace as removeCalendar,
  renameNamespace as renameCalendar,
  serializeNamespaces as serializeCalendars,
  setNamespaceAppearance as setCalendarAppearance,
  type Namespace as Calendar,
  type NamespaceAppearance as CalendarAppearance,
} from "@niclaslindstedt/oss-framework/namespaces";

import { useT } from "./i18n/index.ts";
import { discardCalendarData, type BackendId } from "./storage/backends.ts";
import { DEFAULT_CALENDAR_SLUG } from "./storage/paths.ts";
import {
  CALENDAR_ACTIVE_KEY,
  CALENDAR_LIST_KEY,
  migrateLegacyRegistryKeys,
} from "./storage/registryKeys.ts";

export type { Calendar, CalendarAppearance };

// Before the first read, not on a render: the hook below takes its initial
// value from `localStorage` the moment it first runs, so a device still
// carrying the pre-rename keys has to have been moved over by then.
if (typeof localStorage !== "undefined") {
  migrateLegacyRegistryKeys(localStorage);
}

// First-run registry: the calendar you already had (the reserved `default`
// slug, which keeps the un-suffixed storage names) plus a work one, so the
// switcher means something the first time it is opened. The second calendar
// starts empty — nothing is copied into it.
//
// Built from the catalog rather than from literals: these two names are the
// only calendar names the app itself ever writes, and a Swedish reader's
// first-run menu should not open in English. They are ordinary user data from
// the moment they are stored — renaming one sticks, and a later language
// change leaves both alone.
function seedCalendars(personal: string, work: string): Calendar[] {
  return normalizeCalendars([
    { slug: DEFAULT_CALENDAR_SLUG, name: personal },
    { slug: "work", name: work, glyph: "briefcase", color: "#61afef" },
  ]);
}

export type CalendarsStore = ReturnType<typeof useCalendars>;

/** `backend` is the storage choice a deleted calendar's document has to be
 *  cleared from — the registry itself is always device-local. */
export function useCalendars(backend: BackendId) {
  const t = useT();
  // The registry is stored in the module's own serial format, not raw JSON —
  // the `parse` / `serialize` overrides keep the stored shape the framework's.
  const [list, setList] = useLocalStorageState<Calendar[]>(
    CALENDAR_LIST_KEY,
    seedCalendars(t("calendars.seedPersonal"), t("calendars.seedWork")),
    { parse: (raw) => parseCalendars(raw), serialize: serializeCalendars },
  );
  // The active pointer is a raw slug string; a stored slug that has left the
  // registry falls back to the default calendar.
  const [activeSlug, setActiveSlug] = useLocalStorageState<string>(
    CALENDAR_ACTIVE_KEY,
    DEFAULT_CALENDAR_SLUG,
    {
      parse: (raw) =>
        list.some((c) => c.slug === raw) ? raw : DEFAULT_CALENDAR_SLUG,
      serialize: (slug) => slug,
    },
  );

  const switchTo = useCallback(
    (slug: string) => setActiveSlug(slug),
    [setActiveSlug],
  );

  const create = useCallback(
    (name: string, appearance?: CalendarAppearance) => {
      setList((cur) => {
        const { list: withNew, created } = addCalendar(cur, name);
        switchTo(created.slug);
        return appearance
          ? setCalendarAppearance(withNew, created.slug, appearance)
          : withNew;
      });
    },
    [setList, switchTo],
  );

  const rename = useCallback(
    (slug: string, name: string) =>
      setList((cur) => renameCalendar(cur, slug, name)),
    [setList],
  );

  const setAppearance = useCallback(
    (slug: string, patch: CalendarAppearance) =>
      setList((cur) => setCalendarAppearance(cur, slug, patch)),
    [setList],
  );

  // Removing a calendar drops it from the registry *and* throws away its
  // notes (the framework only edits the list — destroying the data is the
  // app's job). If it was the active one, fall back to the default.
  const remove = useCallback(
    async (slug: string) => {
      setList((cur) => removeCalendar(cur, slug));
      setActiveSlug((cur) => (cur === slug ? DEFAULT_CALENDAR_SLUG : cur));
      await discardCalendarData(backend, slug);
    },
    [backend, setList, setActiveSlug],
  );

  // Write a whole registry at once — what an import commits once the merge
  // is settled (`storage/backup.ts`). Normalised on the way in, like every
  // other read of this list, and the active calendar is left where it is: an
  // import adds calendars, it does not move the reader off the one they are
  // looking at.
  const replaceAll = useCallback(
    (next: Calendar[]) => setList(normalizeCalendars(next)),
    [setList],
  );

  const activeCalendar = list.find((c) => c.slug === activeSlug) ?? list[0]!;

  return {
    list,
    activeSlug: activeCalendar.slug,
    activeCalendar,
    switchTo,
    create,
    rename,
    setAppearance,
    remove,
    replaceAll,
  };
}

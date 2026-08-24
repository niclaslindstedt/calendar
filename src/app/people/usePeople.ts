// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The contacts store: the host's address book in memory, the reader's opt-in
// list on disk, and the day index the calendar draws from.
//
// The split between those three is the whole privacy design, so it is worth
// saying plainly:
//
//   • the CONTACTS are held in React state only. They are read at launch (and
//     when the reader asks) and they die with the tab. Nothing writes them to
//     `localStorage`, to a storage backend, to a backup file, or across the
//     native bridge to the widgets.
//   • the SELECTION — a list of opaque host ids — is the one thing persisted,
//     device-locally (`selection.ts`).
//   • the INDEX is derived from the two, per country pack, and is what the
//     views read.
//
// A reader who never grants permission has all three empty and pays for none
// of it: `EMPTY_PEOPLE` is a frozen singleton, so the memoized views see the
// same object every render.

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";

import type { LocalePack } from "../locale/index.ts";
import { warn } from "../../output.ts";
import {
  parseContacts,
  parsePermission,
  useContactsHost,
  type ContactsPermission,
} from "./contactsHost.ts";
import { EMPTY_PEOPLE, indexPeople, type PeopleIndex } from "./celebrations.ts";
import {
  CONTACTS_SELECTION_KEY,
  NO_SELECTION,
  countSelected,
  deselectAll,
  parseSelection,
  selectAll,
  toggleSelected,
  type ContactSelection,
} from "./selection.ts";
import type { Contact } from "./types.ts";

export type PeopleStore = {
  /** Whether a host offers contacts at all. False on the website, which is
   *  what keeps the Settings tab from appearing there. */
  readonly available: boolean;
  readonly permission: ContactsPermission;
  /** Every contact the host handed over, in display order. Empty until
   *  permission stands. */
  readonly contacts: readonly Contact[];
  /** True while a read or a permission prompt is in flight. */
  readonly loading: boolean;
  /** The ids the reader has ticked. */
  readonly selection: ContactSelection;
  /** The selected contacts indexed against the active country pack — what the
   *  views draw from. */
  readonly index: PeopleIndex;
  /** Raise the system permission prompt and, if it is granted, read. */
  request: () => Promise<void>;
  /** Re-read the address book (Settings → Contacts → Refresh). */
  refresh: () => Promise<void>;
  toggle: (id: string) => void;
  /** Tick every id given — the contacts currently on screen, which may be a
   *  filtered list (`selection.ts` explains why that matters). */
  selectMany: (ids: readonly string[]) => void;
  deselectMany: (ids: readonly string[]) => void;
  /** How many of these ids are ticked. */
  countIn: (ids: readonly string[]) => number;
};

export function usePeople(pack: LocalePack): PeopleStore {
  const host = useContactsHost();
  const [permission, setPermission] = useState<ContactsPermission>(
    "unavailable",
  );
  const [contacts, setContacts] = useState<readonly Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [stored, setStored] = useLocalStorageState<ContactSelection>(
    CONTACTS_SELECTION_KEY,
    NO_SELECTION,
  );
  // Canonicalised on the way out rather than on the way in, so a hand-edited
  // or older value is tolerated without rewriting the reader's storage behind
  // their back.
  const selection = useMemo(() => parseSelection(stored), [stored]);

  // Boot: ask what permission stands, and read if it already does. This is the
  // silent path — `permission()` must never raise a prompt (`contactsHost.ts`)
  // — so a reader who granted contacts on a previous launch gets their
  // people's days drawn without being asked again, and one who never did is
  // not asked at all.
  useEffect(() => {
    if (!host) {
      setPermission("unavailable");
      setContacts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const standing = parsePermission(await host.permission());
        if (cancelled) return;
        setPermission(standing);
        if (standing !== "granted") {
          setContacts([]);
          return;
        }
        const read = parseContacts(await host.list());
        if (!cancelled) setContacts(read);
      } catch (error) {
        // A host that throws is a host that cannot answer — the calendar is
        // drawn without contacts rather than not drawn.
        if (!cancelled) {
          setPermission("unavailable");
          setContacts([]);
          warn(`Contacts host unavailable: ${String(error)}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [host]);

  const read = useCallback(async () => {
    if (!host) return;
    setLoading(true);
    try {
      setContacts(parseContacts(await host.list()));
    } catch (error) {
      warn(`Could not read contacts: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [host]);

  const request = useCallback(async () => {
    if (!host) return;
    setLoading(true);
    try {
      const answer = parsePermission(await host.request());
      setPermission(answer);
      if (answer === "granted") setContacts(parseContacts(await host.list()));
      else setContacts([]);
    } catch (error) {
      warn(`Could not ask for contacts: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [host]);

  // Only the ticked contacts are indexed — the opt-in is applied here, before
  // any of them reaches the calendar. Keyed on the pack (which is a stable
  // reference for as long as the country and the eve choices hold) and on the
  // two lists, so an unrelated render does not refold the almanac.
  const index = useMemo(() => {
    if (contacts.length === 0 || selection.length === 0) return EMPTY_PEOPLE;
    const chosen = new Set(selection);
    return indexPeople(
      pack,
      contacts.filter((contact) => chosen.has(contact.id)),
    );
  }, [pack, contacts, selection]);

  const toggle = useCallback(
    (id: string) => setStored((prev) => toggleSelected(parseSelection(prev), id)),
    [setStored],
  );
  const selectMany = useCallback(
    (ids: readonly string[]) =>
      setStored((prev) => selectAll(parseSelection(prev), ids)),
    [setStored],
  );
  const deselectMany = useCallback(
    (ids: readonly string[]) =>
      setStored((prev) => deselectAll(parseSelection(prev), ids)),
    [setStored],
  );
  const countIn = useCallback(
    (ids: readonly string[]) => countSelected(selection, ids),
    [selection],
  );

  return {
    available: host !== null,
    permission,
    contacts,
    loading,
    selection,
    index,
    request,
    refresh: read,
    toggle,
    selectMany,
    deselectMany,
    countIn,
  };
}

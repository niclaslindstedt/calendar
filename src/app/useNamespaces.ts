// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The namespace registry — the "store stays in the app" seam for the
// framework's `namespaces` module. The framework owns the `Namespace` shape,
// the pure list transforms and the management dialog; this hook owns *where*
// the list and the active-namespace pointer live (two localStorage keys) and
// what happens to a namespace's calendar when it is deleted.
//
// A namespace is a whole separate calendar: switching one only changes the
// active slug, and `useCalendarStore` — which keys off it — loads that
// namespace's document from the same backend. The backend choice and its
// connection (a token, a folder handle) are device-wide and shared by every
// namespace; only the document's name differs (`storage/paths.ts`).

import { useCallback } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";
import {
  DEFAULT_NAMESPACE_SLUG,
  addNamespace,
  normalizeNamespaces,
  parseNamespaces,
  removeNamespace,
  renameNamespace,
  serializeNamespaces,
  setNamespaceAppearance,
  type Namespace,
  type NamespaceAppearance,
} from "@niclaslindstedt/oss-framework/namespaces";

import { useT } from "./i18n/index.ts";
import { discardNamespaceData, type BackendId } from "./storage/backends.ts";

const LIST_KEY = "calendar:namespaces";
const ACTIVE_KEY = "calendar:namespace:active";

// First-run registry: the calendar you already had (the reserved `default`
// slug, which keeps the un-suffixed storage names) plus a work one, so the
// switcher means something the first time it is opened. The second namespace
// starts empty — nothing is copied into it.
//
// Built from the catalog rather than from literals: these two names are the
// only namespace names the app itself ever writes, and a Swedish reader's
// first-run menu should not open in English. They are ordinary user data from
// the moment they are stored — renaming one sticks, and a later language
// change leaves both alone.
function seedNamespaces(personal: string, work: string): Namespace[] {
  return normalizeNamespaces([
    { slug: DEFAULT_NAMESPACE_SLUG, name: personal },
    { slug: "work", name: work, glyph: "briefcase", color: "#61afef" },
  ]);
}

export type NamespacesStore = ReturnType<typeof useNamespaces>;

/** `backend` is the storage choice a deleted namespace's document has to be
 *  cleared from — the registry itself is always device-local. */
export function useNamespaces(backend: BackendId) {
  const t = useT();
  // The registry is stored in the module's own serial format, not raw JSON —
  // the `parse` / `serialize` overrides keep the stored shape the framework's.
  const [list, setList] = useLocalStorageState<Namespace[]>(
    LIST_KEY,
    seedNamespaces(t("namespaces.seedPersonal"), t("namespaces.seedWork")),
    { parse: (raw) => parseNamespaces(raw), serialize: serializeNamespaces },
  );
  // The active pointer is a raw slug string; a stored slug that has left the
  // registry falls back to the default namespace.
  const [activeSlug, setActiveSlug] = useLocalStorageState<string>(
    ACTIVE_KEY,
    DEFAULT_NAMESPACE_SLUG,
    {
      parse: (raw) =>
        list.some((n) => n.slug === raw) ? raw : DEFAULT_NAMESPACE_SLUG,
      serialize: (slug) => slug,
    },
  );

  const switchTo = useCallback(
    (slug: string) => setActiveSlug(slug),
    [setActiveSlug],
  );

  const create = useCallback(
    (name: string, appearance?: NamespaceAppearance) => {
      setList((cur) => {
        const { list: withNew, created } = addNamespace(cur, name);
        switchTo(created.slug);
        return appearance
          ? setNamespaceAppearance(withNew, created.slug, appearance)
          : withNew;
      });
    },
    [setList, switchTo],
  );

  const rename = useCallback(
    (slug: string, name: string) =>
      setList((cur) => renameNamespace(cur, slug, name)),
    [setList],
  );

  const setAppearance = useCallback(
    (slug: string, patch: NamespaceAppearance) =>
      setList((cur) => setNamespaceAppearance(cur, slug, patch)),
    [setList],
  );

  // Removing a namespace drops it from the registry *and* throws away its
  // calendar (the framework only edits the list — destroying the data is the
  // app's job). If it was the active one, fall back to the default.
  const remove = useCallback(
    async (slug: string) => {
      setList((cur) => removeNamespace(cur, slug));
      setActiveSlug((cur) => (cur === slug ? DEFAULT_NAMESPACE_SLUG : cur));
      await discardNamespaceData(backend, slug);
    },
    [backend, setList, setActiveSlug],
  );

  const activeNamespace = list.find((n) => n.slug === activeSlug) ?? list[0]!;

  return {
    list,
    activeSlug: activeNamespace.slug,
    activeNamespace,
    switchTo,
    create,
    rename,
    setAppearance,
    remove,
  };
}

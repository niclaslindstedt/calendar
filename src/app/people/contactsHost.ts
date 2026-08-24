// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE SEAM: where the calendar asks its host whether it can offer contacts.
//
// A browser cannot read a device's address book — there is no such API — so
// on the website this seam is simply never filled and the whole feature is
// absent, down to the Settings tab. The app-store build's WebView host fills
// it in (`native/src/contactsBridge.ts`), and so could any other host that one
// day wanted to.
//
// That phrasing is the important part, and it is a deliberate softening of a
// rule in `CLAUDE.md`: "nothing in `src/` may learn that the wrapper exists".
// Nothing here does. This module never asks whether it is running natively,
// on which platform, or in which build — it asks whether a CONTACTS PROVIDER
// is present, which is a question about capability and not about identity. A
// second host offering the same three methods would light the same feature up
// with no change here, and the wrapper stays free to disappear without
// leaving a native-shaped hole in the app.
//
// What the app keeps either way is the DOMAIN. A host hands over names and
// birthdays; which day a name is celebrated on, how a spelling folds, and
// what a leap-day birthday does in a common year are all decided in
// `celebrations.ts` against the country packs. A host that computed any of
// that itself would drift from the almanac the calendar prints.

import { useEffect, useState } from "react";

import { isContact, type Contact } from "./types.ts";

/** Whether the host may read contacts.
 *
 *  `unavailable` is not a refusal — it is the website, where no host offers
 *  contacts at all, and it is what hides the Settings tab. */
export type ContactsPermission =
  "granted" | "denied" | "undetermined" | "unavailable";

/** What a host has to provide to light the feature up.
 *
 *  Three methods, all async, and deliberately no events: the calendar reads
 *  the address book at launch and when the reader asks, not continuously. A
 *  host watching for contact changes and pushing them would be holding a
 *  subscription to the reader's address book for as long as the app is open,
 *  which is more access than marking birthdays needs. */
export type ContactsHost = {
  /** Bumped only for a breaking change to the three methods below; a host
   *  announcing a version this build does not know is ignored entirely
   *  rather than called with the wrong shape. */
  readonly version: 1;
  /** What permission stands right now, WITHOUT asking for it. Safe to call on
   *  boot: it must never raise a system prompt. */
  permission(): Promise<ContactsPermission>;
  /** Ask the reader for permission, raising the system prompt. Called only
   *  from a press in Settings → Contacts. */
  request(): Promise<ContactsPermission>;
  /** Every contact the host can see, with names and birthdays and nothing
   *  else. Resolves empty when permission does not stand. */
  list(): Promise<readonly Contact[]>;
};

/** The event a host fires once it has installed itself. The injected script
 *  can run after the app has mounted, so the app cannot simply read `window`
 *  once and conclude the feature is absent. */
export const CONTACTS_HOST_EVENT = "calendar:contacts-host";

/** Where a host installs itself. */
const HOST_PROPERTY = "__calendarContacts";

type HostWindow = Window & { [HOST_PROPERTY]?: unknown };

/** The installed host, or null. Validates the shape rather than trusting it:
 *  the value arrives from code outside this bundle. */
export function getContactsHost(): ContactsHost | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as HostWindow)[HOST_PROPERTY];
  if (typeof candidate !== "object" || candidate === null) return null;
  const host = candidate as Partial<ContactsHost>;
  if (host.version !== 1) return null;
  if (
    typeof host.permission !== "function" ||
    typeof host.request !== "function" ||
    typeof host.list !== "function"
  ) {
    return null;
  }
  return host as ContactsHost;
}

/** The host, as state — null until one is installed, and re-read when one
 *  announces itself. */
export function useContactsHost(): ContactsHost | null {
  const [host, setHost] = useState<ContactsHost | null>(() =>
    getContactsHost(),
  );
  useEffect(() => {
    // Re-read on announcement rather than trusting what the event carries:
    // `getContactsHost` is the one validation, and an event is not a reason
    // to skip it.
    const onAnnounce = () => setHost(getContactsHost());
    window.addEventListener(CONTACTS_HOST_EVENT, onAnnounce);
    // …and once more now, in case the host installed itself between this
    // component's first render and this effect.
    onAnnounce();
    return () => window.removeEventListener(CONTACTS_HOST_EVENT, onAnnounce);
  }, []);
  return host;
}

/** Narrow a host's `list()` result. Anything malformed is dropped one entry
 *  at a time rather than failing the whole read — a single contact with a
 *  month of 0 must not cost the reader every other birthday. */
export function parseContacts(value: unknown): readonly Contact[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isContact);
}

/** Narrow a permission answer. An unrecognised string is treated as
 *  `undetermined`, which is the answer that offers to ask again — the two
 *  states it must never be mistaken for are `granted` (which would have the
 *  app read an address book it has no right to) and `unavailable` (which
 *  would hide the tab). */
export function parsePermission(value: unknown): ContactsPermission {
  return value === "granted" ||
    value === "denied" ||
    value === "unavailable" ||
    value === "undetermined"
    ? value
    : "undetermined";
}

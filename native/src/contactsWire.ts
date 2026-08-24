// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// WHAT CROSSES THE CONTACTS BRIDGE — the shapes, and nothing that can read a
// contact.
//
// This module exists to stay IMPORT-FREE, and that is its whole job. The root
// `tsc` type-checks `tests/`, `tests/native_contacts_test.ts` imports
// `contactsBridge.ts`, and a root `npm ci` does not install `native/`'s own
// dependencies — so anything reachable from that test which imports
// `expo-contacts` turns a fully-installed machine green and CI red. (Same trap
// as `native/tsconfig.json` not extending Expo's base; see `AGENTS.md`.)
//
// So `contactsBridge.ts` — pure, and exercised from the root suite — takes its
// types from here, and only `contacts.ts` reaches for `expo-contacts`. Nothing
// in the root's type graph reaches it at all.
//
// The two types below MIRROR `src/app/people/`'s rather than importing them,
// for the reason `WEEK_RULES` is a mirror: `native/` is a separate npm project
// and reaching across would make the wrapper's typecheck depend on the web
// app's module resolution. `tests/native_contacts_test.ts` is what keeps the
// two honest.

/** Mirrors `ContactsPermission` in `src/app/people/contactsHost.ts`. */
export type ContactsPermission =
  "granted" | "denied" | "undetermined" | "unavailable";

/** Mirrors `Contact` in `src/app/people/types.ts` — the name and the birthday
 *  a calendar prints, and deliberately nothing else a contact store holds. */
export type WireContact = {
  id: string;
  name: string;
  firstName?: string;
  birthday?: { month: number; day: number; year?: number };
};

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// READING THE ADDRESS BOOK — the native half of the calendar's contacts
// feature, and the second thing this wrapper adds to the web app.
//
// That is deliberate, and it is what makes this an app. App Store guideline
// 4.2 rejects a build that is a viewer for a website, so the wrapper has to
// do things the browser cannot: it serves the calendar from inside the
// download (works with no network at all), it puts the month on the Home
// Screen as a widget, and — here — it marks the days the reader's own people
// are celebrated, which no browser can do because no browser can read a
// device's contacts. See `native/README.md`.
//
// What this module is NOT allowed to do is decide anything. It reads names
// and birthdays and hands them over; which day a name is celebrated on, how a
// spelling folds, and what a 29 February birthday does in a common year are
// all the web app's (`src/app/people/celebrations.ts`), against the country
// packs it already ships. A Swift and a Kotlin copy of that arithmetic is
// exactly the drift `CLAUDE.md` forbids — the same rule that keeps the
// widgets from printing name days.
//
// Two fields, and no more. `expo-contacts` will hand over numbers, addresses,
// emails and photographs for the asking; the field list below is the asking,
// and it names exactly what draws a calendar.

import * as Contacts from "expo-contacts";

// The wire shapes live apart, in a module with no imports at all — this file
// is the one that reaches for `expo-contacts`, and nothing the root `tsc`
// type-checks is allowed to reach this file. See `contactsWire.ts`.
import type { ContactsPermission, WireContact } from "./contactsWire";

export type { ContactsPermission, WireContact };

/** The only fields asked for. Every other `Contacts.Fields` value is a piece
 *  of somebody's life this calendar has no use for; a birthday and a name are
 *  what it prints. */
const FIELDS = [
  Contacts.Fields.Name,
  Contacts.Fields.FirstName,
  Contacts.Fields.Birthday,
] as const;

/** Turn an Expo permission response into the web app's four states. */
function toPermission(status: Contacts.PermissionStatus): ContactsPermission {
  if (status === Contacts.PermissionStatus.GRANTED) return "granted";
  if (status === Contacts.PermissionStatus.DENIED) return "denied";
  return "undetermined";
}

/**
 * What permission stands, WITHOUT asking for it.
 *
 * The page calls this on every launch, so it must never raise a system
 * prompt — a calendar that asked for the address book each time it opened
 * would be the thing this feature is careful not to be. `getPermissionsAsync`
 * is the read-only half of the Expo API; `requestContacts` below is the half
 * that prompts, and it is only ever reached from a press in Settings.
 */
export async function contactsPermission(): Promise<ContactsPermission> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return toPermission(status);
  } catch {
    // A platform or a build where the module is not linked: the feature is
    // absent rather than refused, which is what hides the Settings tab.
    return "unavailable";
  }
}

/** Raise the system prompt. Called from Settings → Contacts and nowhere else. */
export async function requestContacts(): Promise<ContactsPermission> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return toPermission(status);
  } catch {
    return "unavailable";
  }
}

/**
 * Every contact the device will show us, as names and birthdays.
 *
 * Resolves empty rather than throwing when permission does not stand — the
 * page treats "no contacts" and "not allowed" as the same drawn calendar, and
 * an exception crossing the bridge would only become one anyway.
 */
export async function listContacts(): Promise<WireContact[]> {
  const standing = await contactsPermission();
  if (standing !== "granted") return [];

  try {
    const { data } = await Contacts.getContactsAsync({ fields: [...FIELDS] });
    const out: WireContact[] = [];
    for (const raw of data) {
      const wire = toWire(raw);
      if (wire) out.push(wire);
    }
    return out;
  } catch {
    return [];
  }
}

/** One Expo contact, narrowed to what the calendar prints — or null when
 *  there is not even a name to print. Exported for the test, which is the
 *  only thing that can exercise the field mapping without a device. */
export function toWire(raw: Contacts.ExistingContact): WireContact | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  const name = (raw.name ?? "").trim();
  if (!id || !name) return null;

  const wire: WireContact = { id, name };
  const firstName = raw.firstName?.trim();
  if (firstName) wire.firstName = firstName;

  const birthday = toBirthday(raw.birthday);
  if (birthday) wire.birthday = birthday;
  return wire;
}

/**
 * A contact store's birthday, as a month and a day.
 *
 * Three things make this less trivial than it looks, and all three are real
 * data a real phone hands over:
 *
 *   • `month` is ZERO-BASED in `expo-contacts` (it mirrors JavaScript's
 *     `Date`), and the calendar's is one-based. Getting this wrong shifts
 *     every birthday in the address book by a month — quietly, because
 *     January simply becomes December of nobody's year.
 *   • the YEAR is optional, and very often absent. A birthday without one is
 *     a perfectly good birthday and must not be dropped.
 *   • a non-Gregorian `calendar` (a Hebrew or Chinese birthday, which iOS
 *     stores as such) is NOT converted here. Converting it would need that
 *     calendar's arithmetic, and the wrapper is not allowed to grow a second
 *     copy of the domain — so it is passed over, and the reader sees the
 *     contact in Settings with no birthday against their name rather than a
 *     date on the wrong day.
 */
export function toBirthday(
  value: Contacts.Date | undefined,
): WireContact["birthday"] | null {
  if (!value) return null;
  if (value.format !== undefined && value.format !== "gregorian") return null;
  if (typeof value.month !== "number" || typeof value.day !== "number") {
    return null;
  }

  const month = value.month + 1; // zero-based in expo-contacts
  const day = value.day;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  const birthday: NonNullable<WireContact["birthday"]> = { month, day };
  if (typeof value.year === "number" && Number.isInteger(value.year)) {
    birthday.year = value.year;
  }
  return birthday;
}

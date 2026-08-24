// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Settings → Contacts: which of the device's contacts the calendar marks.
//
// The tab only exists where a host offers contacts (`people/contactsHost.ts`),
// which today means the app-store builds — a browser cannot read an address
// book, so on the website there is nothing to offer and no tab. That is a
// capability check rather than a build check, and the difference matters:
// nothing in this file, or anywhere under `src/`, asks whether it is running
// inside the native wrapper.
//
// Three rules shape the whole screen, and all three are promises the privacy
// policy makes:
//
//   1. Permission is asked for HERE and nowhere else — from a press, not on
//      launch. A reader who never opens this tab is never prompted.
//   2. Granting permission marks NOBODY. The list arrives with every box
//      clear, and a contact reaches the calendar only once it is ticked.
//   3. Nothing about a contact is written down (`people/selection.ts`). What
//      persists is the list of ids, and the names on this screen are held in
//      memory for as long as the app is open.
//
// Select all / Deselect all act on the contacts SHOWING, which is why the
// search box and the pair belong to each other: "all" in a filtered list
// means the people you filtered to, not the four hundred you did not.

import { useMemo, useState } from "react";

import {
  Button,
  ClearableInput,
  GiftIcon,
  Section,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type TFunction } from "../i18n/index.ts";
import { monthName, nameKey, type LocalePack } from "../locale/index.ts";
import { indexPeople } from "../people/celebrations.ts";
import { givenNames, type Contact } from "../people/types.ts";
import type { PeopleStore } from "../people/usePeople.ts";

/** What one row says under the name: when they are celebrated, and how.
 *
 *  Resolved by indexing the contact ON ITS OWN against the pack, rather than
 *  by reading the store's index — the store's holds only the SELECTED
 *  contacts, and this row has to say what ticking would get you before you
 *  tick it. Indexing one contact is a handful of folds. */
function celebrationLabel(
  contact: Contact,
  pack: LocalePack,
  t: TFunction,
): string {
  const parts: string[] = [];

  if (contact.birthday) {
    const { month, day } = contact.birthday;
    parts.push(
      t("contacts.birthdayOn", {
        date: `${day} ${monthName(pack, month, "short")}`,
      }),
    );
  } else {
    parts.push(t("contacts.noBirthday"));
  }

  const index = indexPeople(pack, [contact]);
  const nameDay = [...index.days.entries()]
    .flatMap(([key, day]) => day.nameDays.map((n) => ({ key, ...n })))
    // Earliest in the year first, so a name celebrated twice reads in
    // calendar order rather than in table order.
    .sort((a, b) => a.key.localeCompare(b.key))[0];
  if (nameDay) {
    const month = Number(nameDay.key.slice(0, 2));
    const day = Number(nameDay.key.slice(3, 5));
    parts.push(
      t("contacts.nameDayOn", {
        date: `${day} ${monthName(pack, month, "short")}`,
        // The ALMANAC's spelling, which may not be the contact's — a Nicklas
        // is celebrated on Niklas's day, and the row should say so rather
        // than leave them wondering why they matched.
        name: nameDay.almanacName,
      }),
    );
  } else if (pack.nameDays) {
    parts.push(t("contacts.nameDayNone"));
  }

  return parts.join(" · ");
}

/** The contacts matching what was typed.
 *
 *  Folded through the pack's own spelling rules (`nameKey`), so searching a
 *  Swedish address book for "kristofer" finds the Christoffer in it — the
 *  same folding the calendar uses to match him to a name day, which is the
 *  only way this list can be searched by the spelling the reader has in mind
 *  rather than the one the phone stored. Falls back to a plain substring so a
 *  surname (which `nameKey` never sees) is still findable. */
function filterContacts(
  contacts: readonly Contact[],
  query: string,
  pack: LocalePack,
): readonly Contact[] {
  const trimmed = query.trim();
  if (!trimmed) return contacts;
  const folded = nameKey(trimmed, pack.nameSpelling);
  const plain = trimmed.toLocaleLowerCase(pack.bcp47);
  return contacts.filter((contact) => {
    if (contact.name.toLocaleLowerCase(pack.bcp47).includes(plain)) return true;
    if (!folded) return false;
    return givenNames(contact).some((name) =>
      nameKey(name, pack.nameSpelling).startsWith(folded),
    );
  });
}

export function ContactsSection({
  people,
  pack,
}: {
  people: PeopleStore;
  pack: LocalePack;
}) {
  const t = useT();
  const [query, setQuery] = useState("");

  // Sorted in the pack's own collation — a Swedish address book puts Åsa
  // after Ö, which is where a Swede looks for her (the same reason
  // `allNames` sorts the almanac that way).
  const sorted = useMemo(
    () =>
      [...people.contacts].sort((a, b) =>
        a.name.localeCompare(b.name, pack.bcp47),
      ),
    [people.contacts, pack.bcp47],
  );
  const showing = useMemo(
    () => filterContacts(sorted, query, pack),
    [sorted, query, pack],
  );
  const showingIds = useMemo(() => showing.map((c) => c.id), [showing]);
  const selectedHere = people.countIn(showingIds);

  return (
    <Section title={t("contacts.heading")}>
      <p className="text-muted text-xs">{t("contacts.blurb")}</p>

      {people.permission !== "granted" ? (
        <Gate people={people} />
      ) : sorted.length === 0 ? (
        <Empty people={people} />
      ) : (
        <>
          <div className="mt-3">
            <ClearableInput
              value={query}
              onValueChange={setQuery}
              aria-label={t("contacts.search")}
              placeholder={t("contacts.searchPlaceholder")}
              clearLabel={t("contacts.searchClear")}
            />
          </div>

          {/* The pair, and the count they act on. `py-2` over the framework's
              default for the same reason the vacation shortcut takes it: this
              is a phone-first dialog and the row has to clear 36 px. */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => people.selectMany(showingIds)}
              disabled={selectedHere === showingIds.length}
              className="flex-1 py-2"
            >
              {t("contacts.selectAll")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => people.deselectMany(showingIds)}
              disabled={selectedHere === 0}
              className="flex-1 py-2"
            >
              {t("contacts.deselectAll")}
            </Button>
          </div>
          <p className="text-muted mt-2 text-xs">
            {t("contacts.selectedCount", {
              n: people.selection.length,
              total: sorted.length,
            })}
            {query.trim() !== "" && ` — ${t("contacts.filteredHint")}`}
          </p>

          {showing.length === 0 ? (
            <p className="text-muted mt-3 text-xs">{t("contacts.noMatches")}</p>
          ) : (
            <div className="mt-2">
              {showing.map((contact) => (
                <ToggleRow
                  key={contact.id}
                  label={contact.name}
                  hint={celebrationLabel(contact, pack, t)}
                  checked={people.selection.includes(contact.id)}
                  onChange={() => people.toggle(contact.id)}
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void people.refresh()}
              disabled={people.loading}
              className="py-2"
            >
              {people.loading ? t("contacts.loading") : t("contacts.refresh")}
            </Button>
          </div>
        </>
      )}

      <p className="text-muted mt-4 text-xs">{t("contacts.privacyNote")}</p>
    </Section>
  );
}

/** Before permission stands: either the offer to ask, or the explanation that
 *  only the system can undo a refusal. */
function Gate({ people }: { people: PeopleStore }) {
  const t = useT();
  const denied = people.permission === "denied";
  return (
    <div className="border-line bg-surface-2 mt-3 rounded border p-3">
      <p className="text-fg-bright flex items-center gap-2 text-sm font-bold">
        <GiftIcon className="h-4 w-4" />
        {denied ? t("contacts.deniedTitle") : t("contacts.askTitle")}
      </p>
      <p className="text-muted mt-2 text-xs">
        {denied ? t("contacts.deniedBody") : t("contacts.askBody")}
      </p>
      {/* No button on the denied path: the app cannot re-prompt once the
          system has been told no, and a button that silently did nothing
          would be worse than the sentence above telling them where to go. */}
      {!denied && (
        <Button
          variant="primary"
          onClick={() => void people.request()}
          disabled={people.loading}
          className="mt-3 flex w-full items-center justify-center gap-2 py-2"
        >
          {people.loading ? t("contacts.loading") : t("contacts.ask")}
        </Button>
      )}
    </div>
  );
}

/** Permission stands, and there is nobody in the address book. */
function Empty({ people }: { people: PeopleStore }) {
  const t = useT();
  return (
    <div className="border-line bg-surface-2 mt-3 rounded border p-3">
      <p className="text-fg-bright text-sm font-bold">
        {t("contacts.emptyTitle")}
      </p>
      <p className="text-muted mt-2 text-xs">{t("contacts.emptyBody")}</p>
      <Button
        variant="secondary"
        onClick={() => void people.refresh()}
        disabled={people.loading}
        className="mt-3 py-2"
      >
        {people.loading ? t("contacts.loading") : t("contacts.refresh")}
      </Button>
    </div>
  );
}

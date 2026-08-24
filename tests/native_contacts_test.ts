// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The contacts bridge (`native/src/contactsBridge.ts`) and the storage keys
// the wrapper must never carry out of the page (`native/src/injected.ts`).
//
// Same reasoning as `native_snapshot_test.ts`, and the same shape: `native/`
// is outside the root install and nothing there is otherwise exercised by
// `make test`, while the failure modes are all silent. A bridge whose event
// name drifts does not error — the Settings tab simply never appears. A
// `SECRET_KEYS` list that loses an entry does not error either — it quietly
// starts shipping the reader's contact ids into the App Group container the
// widgets read.
//
// `contacts.ts` itself imports `expo-contacts`, which the root install does
// not have, so only its two pure functions are exercised — through a local
// re-implementation would prove nothing, so they are imported directly and
// the module is kept import-light enough for that to work.

import { describe, expect, it } from "vitest";

import {
  CONTACTS_REQUEST_TYPE,
  CONTACTS_SCRIPT,
  isContactsRequest,
  resolveScript,
} from "../native/src/contactsBridge.ts";
import { AFTER_LOAD_SCRIPT } from "../native/src/injected.ts";
import { CONTACTS_SELECTION_KEY } from "../src/app/people/selection.ts";
import { CONTACTS_HOST_EVENT } from "../src/app/people/contactsHost.ts";

describe("the injected provider", () => {
  it("installs itself where the web app looks for it", () => {
    // The property name is the contract. `contactsHost.ts` reads
    // `window.__calendarContacts`; a rename on either side is not an error,
    // it is a Contacts tab that never appears.
    expect(CONTACTS_SCRIPT).toContain("window.__calendarContacts");
  });

  it("announces itself with the event the seam listens for", () => {
    // The script can land either side of the app's first render, so the
    // announcement is what covers the race. Pinned against the app's own
    // constant, because these two really do have to be the same string.
    expect(CONTACTS_SCRIPT).toContain(JSON.stringify(CONTACTS_HOST_EVENT));
  });

  it("offers the three methods the host contract requires", () => {
    for (const method of ["permission", "request", "list"]) {
      expect(CONTACTS_SCRIPT).toContain(`call("${method}")`);
    }
    expect(CONTACTS_SCRIPT).toContain("version: 1");
  });

  it("is guarded against a second injection", () => {
    // A reload re-runs the injected scripts; installing twice would strand
    // every promise the first copy was holding.
    expect(CONTACTS_SCRIPT).toContain("if (window.__calendarContacts) return;");
  });
});

describe("isContactsRequest", () => {
  const valid = { type: CONTACTS_REQUEST_TYPE, id: "c1", method: "list" };

  it("accepts a well-formed request", () => {
    expect(isContactsRequest(valid)).toBe(true);
  });

  it("rejects anything else the page may post", () => {
    // The page is free to `postMessage` whatever it likes, and the storage
    // report goes down the same channel.
    expect(isContactsRequest(null)).toBe(false);
    expect(
      isContactsRequest({ ...valid, type: "calendar-native/report" }),
    ).toBe(false);
    expect(isContactsRequest({ ...valid, method: "delete" })).toBe(false);
    expect(isContactsRequest({ ...valid, id: "" })).toBe(false);
    expect(isContactsRequest({ type: CONTACTS_REQUEST_TYPE })).toBe(false);
  });
});

/** Do what the page does with a resolve script: pull the JS string literal
 *  out of it, read it as JavaScript would, then parse the JSON inside. */
function roundTrip(script: string): unknown {
  const open = script.indexOf("JSON.parse(") + "JSON.parse(".length;
  const literal = script.slice(
    open,
    script.lastIndexOf(")", script.indexOf("\n", open)),
  );
  return JSON.parse(JSON.parse(literal) as string);
}

describe("resolveScript", () => {
  it("settles the pending call by id", () => {
    const script = resolveScript("c7", "granted");
    expect(script).toContain("__calendarContactsResolve");
    expect(script).toContain("c7");
  });

  it("carries a name through as data, not as code", () => {
    // A contact's name is arbitrary user text, and text is exactly what
    // breaks out of a spliced literal. The payload crosses as a JSON string
    // that the page parses, so the test is not "does the script contain the
    // scary characters" — of course it does, that is the name — but "do they
    // stay inside the string literal and come back out unchanged".
    const nasty = `"); alert(1); //`;
    const script = resolveScript("c1", [{ id: "1", name: nasty }]);
    const parsed = roundTrip(script) as { value: { name: string }[] };
    expect(parsed.value[0].name).toBe(nasty);
    // The quote that would have closed the literal is escaped where it sits.
    expect(script).toContain(String.raw`\\\"); alert(1)`);
  });

  it("escapes the two separators JSON leaves as literal newlines", () => {
    // U+2028 / U+2029 are valid inside a JSON string but are line
    // terminators to an older JavaScript parser, so a name containing one
    // would end the statement mid-string.
    const script = resolveScript("c1", [{ id: "1", name: "a b c" }]);
    expect(script).not.toContain(" ");
    expect(script).not.toContain(" ");
    expect(script).toContain("\\u2028");
  });
});

describe("what never leaves the page", () => {
  it("keeps the contacts opt-in list out of the widget snapshot", () => {
    // The widgets print the date and the note. They never print a birthday or
    // a name day, and the privacy policy says nothing about a contact reaches
    // the App Group container — which is true only while this key is in the
    // injected script's exclusion list.
    expect(AFTER_LOAD_SCRIPT).toContain(JSON.stringify(CONTACTS_SELECTION_KEY));
    const secrets = /var SECRETS = (\[[^\]]*\])/.exec(AFTER_LOAD_SCRIPT)?.[1];
    expect(secrets).toBeDefined();
    expect(JSON.parse(secrets!)).toContain(CONTACTS_SELECTION_KEY);
  });

  it("still keeps the OAuth tokens out of it", () => {
    const secrets = JSON.parse(
      /var SECRETS = (\[[^\]]*\])/.exec(AFTER_LOAD_SCRIPT)![1],
    ) as string[];
    expect(secrets).toContain("calendar:dropbox:access");
    expect(secrets).toContain("calendar:dropbox:refresh");
    expect(secrets).toContain("calendar:gdrive:token");
  });
});

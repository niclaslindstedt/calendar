// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE CONTACTS BRIDGE: how the page asks the device for its address book.
//
// The web app never learns it is running inside this wrapper. What it does is
// look for a CONTACTS PROVIDER on `window` — a capability, not an identity —
// and this is the script that installs one (see `src/app/people/contactsHost.ts`
// for the other side of the contract). A browser has no such provider and the
// whole feature, down to the Settings tab, simply is not there.
//
// `react-native-webview` gives us one message channel in each direction: the
// page posts strings out, and the app injects scripts in. That is enough for
// request/response as long as each call carries an id, so this module is:
//
//   • a script that defines `window.__calendarContacts`, whose three methods
//     post a request out and return a promise;
//   • `isContactsRequest`, which narrows an inbound message; and
//   • `resolveScript`, which builds the one line of JavaScript that settles
//     the promise back in the page.
//
// Like `injected.ts`, this file exports STRINGS. Keep the page-side code
// dependency-free and ES5-ish — it runs in the WebView, not in Metro's
// bundle, so nothing in it is transpiled or polyfilled.

// From `contactsWire.ts`, NOT from `contacts.ts`: this module is pure and is
// exercised by the root test suite, which runs against an install that has no
// `expo-contacts` in it. Importing the types from their reader — even as a
// type-only import — puts `expo-contacts` back in the root's type graph and
// turns CI red on a machine where it passes.
import type { ContactsPermission, WireContact } from "./contactsWire";

/** The message the page posts to ask for something. Namespaced like the
 *  storage report so the two are never confused. */
export const CONTACTS_REQUEST_TYPE = "calendar-native/contacts-request";

/** The three things the page may ask for — mirrors `ContactsHost`. */
export type ContactsMethod = "permission" | "request" | "list";

export type ContactsRequest = {
  type: string;
  /** Correlates the answer with the promise waiting for it. */
  id: string;
  method: ContactsMethod;
};

/** The event the page-side seam listens for. Must match
 *  `CONTACTS_HOST_EVENT` in `src/app/people/contactsHost.ts` — a mismatch is
 *  not an error, it is a Settings tab that never appears. */
const HOST_EVENT = "calendar:contacts-host";

/** Where the provider installs itself. Must match `contactsHost.ts`'s
 *  `HOST_PROPERTY`, and for the same reason. */
const HOST_PROPERTY = "__calendarContacts";

/**
 * The script that installs the provider.
 *
 * Injected after the page has loaded, and it announces itself with an event
 * because it can land either side of the app's first render — the seam reads
 * `window` once on mount and then listens, so an announcement is what covers
 * the race in the direction where this script is late.
 *
 * A pending call is settled by `resolveScript` below. Nothing here times out:
 * a request that never comes back leaves a promise pending, which the page
 * shows as the Settings tab's spinner rather than as a wrong answer — and the
 * only way one goes unanswered is the app being backgrounded mid-prompt, at
 * which point the reader has left the screen anyway.
 */
export const CONTACTS_SCRIPT = `(function () {
  if (window.${HOST_PROPERTY}) return;

  var pending = {};
  var next = 0;

  function call(method) {
    return new Promise(function (resolve) {
      var id = "c" + (next += 1);
      pending[id] = resolve;
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: ${JSON.stringify(CONTACTS_REQUEST_TYPE)},
          id: id,
          method: method
        }));
      } catch (e) {
        delete pending[id];
        // The bridge is gone: answer "no provider" rather than hang. The page
        // treats that as the website's answer and draws a calendar with no
        // contacts in it.
        resolve(method === "list" ? [] : "unavailable");
      }
    });
  }

  // Called by the app, through injectJavaScript, with the answer.
  window.__calendarContactsResolve = function (id, value) {
    var resolve = pending[id];
    if (!resolve) return;
    delete pending[id];
    resolve(value);
  };

  window.${HOST_PROPERTY} = {
    version: 1,
    permission: function () { return call("permission"); },
    request: function () { return call("request"); },
    list: function () { return call("list"); }
  };

  try {
    window.dispatchEvent(new Event(${JSON.stringify(HOST_EVENT)}));
  } catch (e) {
    // Very old WebViews: the app's own mount-time read still finds the
    // provider, it just does not get told about it.
  }
})(); true;`;

/** Narrow an arbitrary parsed `postMessage` body to a contacts request. */
export function isContactsRequest(value: unknown): value is ContactsRequest {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<ContactsRequest>;
  if (message.type !== CONTACTS_REQUEST_TYPE) return false;
  if (typeof message.id !== "string" || message.id === "") return false;
  return (
    message.method === "permission" ||
    message.method === "request" ||
    message.method === "list"
  );
}

/**
 * The line of JavaScript that settles one pending call.
 *
 * The answer is embedded as a JSON *string* and parsed in the page rather than
 * spliced in as a JavaScript literal, because the payload is somebody's
 * address book: a name is arbitrary user text, and text is exactly what breaks
 * out of a literal. `JSON.stringify` of the JSON text handles the quoting; the
 * two line separators below are the characters it does NOT escape and which
 * an older JavaScript parser treats as newlines, so they are escaped by hand.
 */
export function resolveScript(
  id: string,
  value: ContactsPermission | WireContact[],
): string {
  const payload = escapeForScript(JSON.stringify({ id, value }));
  return `(function () {
    try {
      var answer = JSON.parse(${payload});
      if (window.__calendarContactsResolve) {
        window.__calendarContactsResolve(answer.id, answer.value);
      }
    } catch (e) {}
  })(); true;`;
}

/** A JavaScript string literal holding `text`, safe to splice into a script. */
function escapeForScript(text: string): string {
  return JSON.stringify(text)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

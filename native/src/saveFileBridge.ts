// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE SAVE-FILE BRIDGE: how an export leaves the page inside the app.
//
// In a browser an export is a download — an anchor clicked at a `blob:` URL.
// Inside the WebView that click goes nowhere: the WebView offers the `blob:`
// URL to this wrapper as a navigation, and nothing on the phone can open a URL
// that only exists inside the page. The framework's `saveFile` (the call the
// calendar's backup export makes) sends the bytes here instead, when the
// wrapper advertises the `save-file` capability, and this wrapper writes them
// to a temporary file and opens the share sheet (`saveFile.ts`).
//
// The contract is the FRAMEWORK's, not this app's: the message type, the
// result event and the descriptor are spelled as in oss-framework's
// `docs/native-shell.md`, and `tests/native_save_file_test.ts` pins them to
// the framework's constants. Like the other capabilities the page is offered,
// it asks whether `save-file` is listed, never what it is running inside; a
// browser lists nothing and keeps downloading.
//
// Same shape as `authSessionBridge.ts`: strings for the page and pure
// narrowing and settling helpers, exercised from the root test suite, so this
// file imports nothing that reaches `expo`. The half that does is
// `saveFile.ts`.

/** The message the page posts (`SAVE_FILE_MESSAGE` in the framework). */
export const SAVE_FILE_TYPE = "oss-framework/save-file";

/** The window event that settles the page's promise
 *  (`SAVE_FILE_RESULT_EVENT` in the framework). */
export const SAVE_FILE_RESULT_EVENT = "oss-framework/save-file-result";

/** Injected before the page loads: adds `save-file` to the shell descriptor
 *  the framework reads (`window.__ossShell`), merging into one another script
 *  may already have set. Only advertised because `saveFile.ts` answers it —
 *  a capability listed with nothing behind it would swallow every export. */
export const SAVE_FILE_DESCRIPTOR = `(function () {
  var shell = window.__ossShell || { version: 1, capabilities: [] };
  if (shell.capabilities.indexOf("save-file") < 0) shell.capabilities.push("save-file");
  window.__ossShell = shell;
})(); true;`;

export type SaveFileRequest = {
  type: string;
  version: number;
  id: string;
  filename: string;
  mimeType: string;
  base64: string;
};

export function isSaveFileRequest(value: unknown): value is SaveFileRequest {
  const m = value as Partial<SaveFileRequest> | null;
  return (
    typeof m === "object" &&
    m !== null &&
    m.type === SAVE_FILE_TYPE &&
    typeof m.id === "string" &&
    typeof m.filename === "string" &&
    typeof m.mimeType === "string" &&
    typeof m.base64 === "string"
  );
}

/** iOS picks share targets by UTI, not MIME type. The calendar exports one
 *  kind of file (the JSON backup); the rest are the framework reference's, so
 *  a new export finds its row already here. */
export const UTI: Record<string, string> = {
  "application/json": "public.json",
  "application/pdf": "com.adobe.pdf",
  "application/zip": "public.zip-archive",
  "image/jpeg": "public.jpeg",
  "image/png": "public.png",
  "image/svg+xml": "public.svg-image",
  "text/calendar": "public.calendar-event",
  "text/csv": "public.comma-separated-values-text",
  "text/markdown": "net.daringfireball.markdown",
  "text/plain": "public.plain-text",
  "text/vcard": "public.vcard",
};

/** Never trust the name: its last path component, or `file` when that leaves
 *  nothing usable. */
export function bareName(name: string): string {
  const last = name.split(/[\\/]/).pop()?.trim() ?? "";
  return last === "" || last === "." || last === ".." ? "file" : last;
}

/** The script that settles the page's promise. */
export function saveFileResultScript(
  id: string,
  ok: boolean,
  error?: string,
): string {
  const detail = ok ? { id, ok } : { id, ok, error };
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(
    SAVE_FILE_RESULT_EVENT,
  )}, { detail: ${JSON.stringify(detail)} })); true;`;
}

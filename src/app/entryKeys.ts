// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What a key does inside the day-entry editor.
//
// A note is a note, not a form field: Enter writes a line break, the way it
// does in every other place you type prose. So the editor is left the way a
// pen is put down — by looking somewhere else (a tap outside blurs it), by
// Escape, or by the Enter that carries a modifier, which is the keyboard's
// "I'm done" everywhere a plain Enter is already spoken for.
//
// Nothing is lost by not "saving": every keystroke that fits the day is
// committed as it is typed (`DayEntry.tsx`), so closing the editor only puts
// the pen down.
//
// Pure and separate from the component so the rule can be stated once and
// tested, rather than read out of a JSX handler.

/** The parts of a keyboard event this rule looks at — an actual
 *  `KeyboardEvent` satisfies it. */
export type EntryEditorKey = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
};

/** `"newline"` is the browser's own default — the caller lets the keystroke
 *  through — and `null` is every other key, which is likewise not ours. Only
 *  `"close"` asks the caller to do something. */
export type EntryEditorAction = "newline" | "close" | null;

/** What `e` means to the open editor. */
export function entryEditorAction(e: EntryEditorKey): EntryEditorAction {
  if (e.key === "Escape") return "close";
  if (e.key !== "Enter") return null;
  return e.ctrlKey || e.metaKey ? "close" : "newline";
}

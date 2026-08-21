// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The note as the browser holds it while you are writing in it.
//
// The day's writing surface is one box for reading and for writing
// (`DayEntry`): the same element, made editable while the caret is in it. It
// has to be, because a strip row's note is laid out as *lines flowing around
// the row's margins* and a `<textarea>` is a rectangle — it cannot be given
// that shape, so a note typed into one was written in a third of the row and
// only reflowed into the whole of it once the pen was put down.
//
// The cost of that is this file: an editable element is read through the DOM
// rather than through `value`, and the two places `DayEntry` puts the caret
// back — opening the editor, and rolling back the keystroke that would have
// overflowed the day — have to say where in the *text* they mean.
//
// Everything here is deliberately small and defensive. What an engine builds
// inside an editable box is its own business: Chromium, in the
// `plaintext-only` mode this asks for, keeps the note as plain text with real
// newlines in it, while an engine falling back to ordinary editing may reach
// for `<br>` and wrapper elements. `innerText` is the one reader that
// understands both, so it is what the value is read with.

/** Whether the engine understands `contenteditable="plaintext-only"` — the
 *  mode that keeps a note plain: no pasted formatting, no rich-text editing
 *  commands, a line break that is a line break.
 *
 *  Detected rather than assumed, because the fallback matters twice over: the
 *  attribute's invalid-value default is *inherit*, so an engine that does not
 *  know the keyword would leave the note uneditable, and the IDL setter throws
 *  on a value it does not know. Where it is missing the editor asks for
 *  ordinary editing instead and takes the paste apart itself. */
export const PLAIN_TEXT_EDITING = detectPlainTextEditing();

function detectPlainTextEditing(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("div");
  try {
    probe.setAttribute("contenteditable", "plaintext-only");
  } catch {
    return false;
  }
  return probe.contentEditable === "plaintext-only";
}

/** What the editable box currently holds.
 *
 *  `innerText` rather than `textContent`: it is the rendered text, so a line
 *  break is one whether the engine wrote it as a newline or as a `<br>`. The
 *  box is `white-space: pre-wrap` (`.cal-entry`), so nothing the reader typed
 *  is collapsed on the way out. */
export function readNote(el: HTMLElement): string {
  // A box the reader has emptied is empty, whatever the engine left in it:
  // deleting the last character leaves a filler `<br>` behind in Chromium, and
  // `innerText` reads that back as a newline — so a day cleared to nothing
  // would have been saved as a blank line rather than as no note at all. No
  // text node means no note; a note that really does end in a line break has
  // one.
  if (el.textContent === "") return "";
  return el.innerText;
}

/** Put `text` in the box as the one plain text node it should be — what
 *  opening the editor seeds it with, and what a refused keystroke rolls it
 *  back to. Whatever structure the engine had built is replaced, which is also
 *  what lets {@link seatCaret} stay as simple as it is. */
export function writeNote(el: HTMLElement, text: string): void {
  if (readNote(el) === text && el.childNodes.length <= 1) return;
  el.textContent = text;
}

/** Where the caret is, counted in characters from the start of the note.
 *
 *  A range from the box's start to the caret, measured by the text it covers.
 *  `Range.toString()` sees text, not markup, so on an engine that writes its
 *  line breaks as `<br>` this counts a break as nothing — the caret can land a
 *  line-break early after a rollback there, which is the whole of what that
 *  costs. */
export function noteCaret(el: HTMLElement): number {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) return readNote(el).length;
  const at = selection.getRangeAt(0);
  if (!el.contains(at.endContainer)) return readNote(el).length;
  const upTo = document.createRange();
  upTo.selectNodeContents(el);
  upTo.setEnd(at.endContainer, at.endOffset);
  return upTo.toString().length;
}

/** Put the caret `offset` characters into the note, having just written it
 *  with {@link writeNote} — so the box holds a single text node and the offset
 *  is an offset into it. Anything else (an empty note, an offset past the end)
 *  puts the caret at the end, which is where a reader who has just been handed
 *  the pen expects it. */
export function seatCaret(el: HTMLElement, offset: number): void {
  const selection = document.getSelection();
  if (!selection) return;
  const range = document.createRange();
  const node = el.firstChild;
  const length = node?.nodeValue?.length ?? 0;
  if (node && node.nodeType === Node.TEXT_NODE && offset <= length) {
    range.setStart(node, Math.max(0, offset));
    range.collapse(true);
  } else {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Insert `text` at the caret as plain text — what the paste an engine without
 *  `plaintext-only` would otherwise have brought formatting along with is cut
 *  down to. `execCommand` is deprecated and still the only insertion that
 *  leaves the engine's own undo stack intact, which is why it is tried
 *  first. */
export function insertNoteText(el: HTMLElement, text: string): void {
  if (document.execCommand("insertText", false, text)) return;
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

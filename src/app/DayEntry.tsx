// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The shared per-day entry surface: renders the day's text at the largest
// size that fits the room the view left it, and — when the day is being
// edited — makes that same box editable, so pressing a date puts a caret on
// the calendar and you write. There is no placeholder and no dialog: an empty
// day in edit mode is a blank cell with a caret in it. All three views mount
// this; the view chooses the sizing curve, says whether its slot clips, and
// passes editing state down.
//
// **The same box, read or written.** The editor used to be a `<textarea>`
// swapped in over the read view, and a textarea is a rectangle: its lines
// cannot wrap around the margins a strip row prints down its sides
// (`stripRow.tsx`), so a note being typed was laid out in the third of the row
// a rectangle could have while the note being read had the whole of it. What
// you wrote then moved when you put the pen down, and the row refused a
// keystroke while there was still half a row of blank room under the date. An
// editable div is ordinary flowing content, so the writing surface and the
// reading surface are now one shape — and the measurement below rules on the
// text you can actually see. `entryDom.ts` is what that costs: an editable box
// is read through the DOM rather than through `value`.
//
// Two rules follow from the slot being finite (`entryFit.ts` measures it):
//
//   - what you write shrinks as it grows, down to the view's floor, and once
//     the floor no longer fits, the next keystroke is refused — the day is
//     full rather than silently swallowing text nobody can see;
//   - what you read is ended once it has run out of room — clamped to the
//     lines that fit in a cell, cut to the characters that fit in a row that
//     flows around its margins — so a long note stops at the holiday and
//     name-day captions instead of running under them.
//
// Enter is a line break here, not a save — `entryKeys.ts` has the whole rule.
// It costs a line of the day's room, so it is refused by the same measurement
// that refuses any other keystroke once the cell is full.

import { useLayoutEffect, useRef, useState } from "react";

import {
  PLAIN_TEXT_EDITING,
  insertNoteText,
  noteCaret,
  readNote,
  seatCaret,
  writeNote,
} from "./entryDom.ts";
import {
  clipEntryText,
  entryLineLimit,
  entrySlotHeight,
  fitEntryText,
} from "./entryFit.ts";
import { entryEditorAction } from "./entryKeys.ts";
import {
  resolveEntryFontPx,
  type EntryFontOptions,
  type EntryTextSize,
} from "./entryFont.ts";
import { useT } from "./i18n/index.ts";

type Props = {
  text: string;
  editing: boolean;
  font: EntryFontOptions;
  /** Shrink-to-fit, or pinned at one of the three steps. */
  size: EntryTextSize;
  /** Whether the slot clips. Month cells and week rows are a fixed height, so
   *  the note is measured against it — sized down, then truncated, then
   *  closed to further typing. A day-list row that grows with its text is
   *  not: there is always more room, so there is nothing to measure. */
  bounded: boolean;
  /** Whether the note's lines flow around margins beside them — a strip row,
   *  where the day's date and the almanac's marginalia are floats and the text
   *  runs beside them and then under them. It changes how a note that has run
   *  out of room is ended: see the two rules in the file header. */
  flow?: boolean;
  onCommit: (text: string) => void;
  onClose: () => void;
  /** Extra classes on the read view (colour/weight comes from the cell). */
  className?: string;
};

/** The day's text as a *sample* prints it: at the size the curve (or the
 *  pinned step) asks for, in the chosen face, with no measuring against a
 *  slot. What the settings dialog's samples use — they are showing what a
 *  setting does rather than what one cell has room for, so the shrink-to-fit
 *  pass that makes {@link DayEntry} a real writing surface would only be
 *  measuring a box nobody is looking at. */
export function DayEntryText({
  text,
  font,
  size,
  className,
}: {
  text: string;
  font: EntryFontOptions;
  size: EntryTextSize;
  className?: string;
}) {
  return (
    <div
      className={`cal-entry cal-font-entry ${className ?? ""}`}
      style={{ fontSize: `${resolveEntryFontPx(text.length, font, size)}px` }}
    >
      {text}
    </div>
  );
}

export function DayEntry({
  text,
  editing,
  font,
  size,
  bounded,
  flow = false,
  onCommit,
  onClose,
  className,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState(text);
  const readRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  /** The last text that fit the slot — what a refused keystroke rolls back
   *  to. */
  const acceptedRef = useRef(text);
  /** The keystroke awaiting a verdict: applied to the DOM, not yet saved. */
  const pendingRef = useRef<{ value: string; caret: number } | null>(null);

  const shown = editing ? draft : text;
  // The pre-layout guess React renders with. `dynamic` then measures from the
  // band's ceiling down to its floor, so the note ends up at the largest size
  // its cell can actually hold; a pinned step measures only to find out
  // whether it fits at all.
  const guessPx = resolveEntryFontPx(shown.length, font, size);
  const startPx = size === "dynamic" ? font.maxPx : guessPx;
  const floorPx = size === "dynamic" ? font.minPx : guessPx;

  // Reading: fit the text to the slot, and end it where the room runs out.
  // Re-measured whenever the slot resizes — a rotation or a settings change
  // moves the room around under it.
  useLayoutEffect(() => {
    const el = readRef.current;
    if (!el) return;
    // The text node the renderer put here. A clipped note is written through
    // it rather than around it, so restoring the whole text before every
    // measurement is a single assignment — and the renderer keeps the node it
    // knows about.
    const node = el.firstChild;
    const whole = () => {
      if (node && node.nodeValue !== text) node.nodeValue = text;
    };
    if (!bounded) {
      // The slot grows with the note, so there is nothing to measure — and
      // nothing to end, should the row have been a fixed one a moment ago.
      whole();
      el.classList.remove("cal-entry-clamp");
      el.style.removeProperty("-webkit-line-clamp");
      el.style.fontSize = `${guessPx}px`;
      return;
    }
    let lastAvailable = -1;
    const measure = () => {
      const available = entrySlotHeight(el);
      if (available === lastAvailable) return;
      lastAvailable = available;
      whole();
      el.classList.remove("cal-entry-clamp");
      el.style.removeProperty("-webkit-line-clamp");
      const fit = fitEntryText(el, available, startPx, floorPx);
      if (fit.fits) return;
      if (flow) {
        // Lines that make room for the row's margins cannot be clamped by a
        // `-webkit-box`, whose line boxes ignore floats; the text ends itself
        // instead.
        clipEntryText(el, available, text);
        return;
      }
      el.style.setProperty(
        "-webkit-line-clamp",
        String(entryLineLimit(available, fit.px)),
      );
      el.classList.add("cal-entry-clamp");
    };
    measure();
    const slot = el.parentElement;
    if (!slot) return;
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    return () => observer.disconnect();
    // `editing` is a dependency because it mounts this element: leaving the
    // editor puts a fresh div here with the same text, and it still has to be
    // measured.
  }, [text, editing, bounded, flow, guessPx, startPx, floorPx]);

  // Entering edit mode seeds the box from the stored text and seats the caret
  // at the end. A layout effect rather than a passive one: the focus has to
  // land inside the tap that opened the editor, or a phone keyboard won't come
  // up.
  useLayoutEffect(() => {
    if (!editing) return;
    setDraft(text);
    acceptedRef.current = text;
    pendingRef.current = null;
    const el = editorRef.current;
    if (el) {
      writeNote(el, text);
      el.focus();
      seatCaret(el, text.length);
    }
    // The stored text is only the seed — mid-edit remote updates must not
    // yank the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Writing: size the draft to the slot, then rule on the keystroke that
  // produced it. Saving happens here rather than in the input handler so that
  // only text that made it into the day is ever committed.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const pending = pendingRef.current;
    pendingRef.current = null;

    let fits = true;
    if (bounded) {
      fits = fitEntryText(el, entrySlotHeight(el), startPx, floorPx).fits;
    } else {
      // An unbounded box grows with its text on its own — it is flowing
      // content, not a rectangle to be resized.
      el.style.fontSize = `${guessPx}px`;
    }

    if (!pending) return;
    const accepted = acceptedRef.current;
    // Deleting always goes through, even from an overflowing day: text that no
    // longer fits (a smaller step was picked, a holiday moved in) has to stay
    // editable down to something that does.
    if (fits || pending.value.length <= accepted.length) {
      acceptedRef.current = pending.value;
      onCommit(pending.value);
      return;
    }

    // Refused: the day is full at the smallest size it has. Put the text back
    // and leave the caret where the insertion would have started.
    const caret = Math.max(
      0,
      pending.caret - (pending.value.length - accepted.length),
    );
    writeNote(el, accepted);
    setDraft(accepted);
    seatCaret(el, caret);
    // As above: entering edit mode mounts the box without necessarily changing
    // the draft.
  }, [draft, editing, bounded, guessPx, startPx, floorPx, onCommit]);

  if (!editing) {
    if (text === "") return null;
    return (
      <div
        ref={readRef}
        className={`cal-entry cal-font-entry ${className ?? ""}`}
        style={{ fontSize: `${guessPx}px` }}
      >
        {text}
      </div>
    );
  }

  const commit = () => {
    onCommit(draft);
    onClose();
  };

  return (
    <div
      ref={editorRef}
      // Editable, and nothing more: `plaintext-only` where the engine has it,
      // so a paste arrives as text and the editing commands a rich-text box
      // answers to are simply not there (`entryDom.ts`). The content is put in
      // by hand rather than rendered, because a renderer restating the text
      // under a caret is what moves the caret.
      contentEditable={PLAIN_TEXT_EDITING ? "plaintext-only" : true}
      role="textbox"
      aria-multiline="true"
      aria-label={t("editor.label")}
      className="cal-entry-editor cal-entry cal-font-entry"
      style={{ fontSize: `${guessPx}px` }}
      onInput={(e) => {
        const el = e.currentTarget;
        pendingRef.current = { value: readNote(el), caret: noteCaret(el) };
        setDraft(pendingRef.current.value);
      }}
      onBlur={commit}
      onPaste={(e) => {
        // Only where the engine has no `plaintext-only` to do this for us: a
        // paste there would otherwise bring its formatting into the day.
        if (PLAIN_TEXT_EDITING) return;
        e.preventDefault();
        insertNoteText(
          e.currentTarget,
          e.clipboardData?.getData("text/plain") ?? "",
        );
      }}
      onKeyDown={(e) => {
        // Enter writes a line break — a note is prose, not a form field — so
        // only Escape and a modified Enter put the pen down (`entryKeys.ts`).
        // A refused newline is the same refusal any other keystroke gets: the
        // day is full at the smallest size it has.
        if (entryEditorAction(e) !== "close") return;
        e.preventDefault();
        // The closing key must not reach the cell behind the editor: closing
        // re-renders before this event finishes bubbling, so the cell's own
        // Enter-to-type handler would see a day that is no longer being
        // edited and open it straight back up.
        e.stopPropagation();
        commit();
      }}
    />
  );
}

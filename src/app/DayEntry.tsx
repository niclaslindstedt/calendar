// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The shared per-day entry surface: renders the day's text at the largest
// size that fits the room the view left it, and — when the day is being
// edited — swaps in an in-place textarea with the same typography, so pressing
// a date puts a caret on the calendar and you write. There is no placeholder
// and no dialog: an empty day in edit mode is a blank cell with a caret in it.
// All three views mount this; the view chooses the sizing curve, says whether
// its slot clips, and passes editing state down.
//
// Two rules follow from the slot being finite (`entryFit.ts` measures it):
//
//   - what you write shrinks as it grows, down to the view's floor, and once
//     the floor no longer fits, the next keystroke is refused — the day is
//     full rather than silently swallowing text nobody can see;
//   - what you read is clamped to the lines that fit and ends in an ellipsis,
//     so a long note stops at the holiday and name-day captions instead of
//     running under them.
//
// Enter is a line break here, not a save — `entryKeys.ts` has the whole rule.
// It costs a line of the day's room, so it is refused by the same measurement
// that refuses any other keystroke once the cell is full.

import { useLayoutEffect, useRef, useState } from "react";

import { entryLineLimit, entrySlotHeight, fitEntryText } from "./entryFit.ts";
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
  onCommit: (text: string) => void;
  onClose: () => void;
  /** Extra classes on the read view (colour/weight comes from the cell). */
  className?: string;
};

export function DayEntry({
  text,
  editing,
  font,
  size,
  bounded,
  onCommit,
  onClose,
  className,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState(text);
  const readRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
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

  // Reading: fit the text to the slot, and clamp it to the lines that fit when
  // even the floor overflows. Re-measured whenever the slot resizes — a
  // rotation or a settings change moves the room around under it.
  useLayoutEffect(() => {
    const el = readRef.current;
    if (!el) return;
    if (!bounded) {
      // The slot grows with the note, so there is nothing to measure — and
      // nothing to clamp, should the row have been a fixed one a moment ago.
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
      el.classList.remove("cal-entry-clamp");
      el.style.removeProperty("-webkit-line-clamp");
      const fit = fitEntryText(el, available, startPx, floorPx);
      if (fit.fits) return;
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
  }, [text, editing, bounded, guessPx, startPx, floorPx]);

  // Entering edit mode re-seeds the draft from the stored text and seats the
  // caret at the end. A layout effect rather than a passive one: the focus has
  // to land inside the tap that opened the editor, or a phone keyboard won't
  // come up.
  useLayoutEffect(() => {
    if (!editing) return;
    setDraft(text);
    acceptedRef.current = text;
    pendingRef.current = null;
    const el = editorRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
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
      // Back to the slot's own height, in case this row was growing a moment
      // ago (the day list swaps between the two).
      el.style.removeProperty("height");
      fits = fitEntryText(el, entrySlotHeight(el), startPx, floorPx).fits;
    } else {
      // An unbounded row grows with its text, and so does its editor.
      el.style.fontSize = `${guessPx}px`;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
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
    el.value = accepted;
    setDraft(accepted);
    el.setSelectionRange(caret, caret);
    // As above: entering edit mode mounts the textarea without necessarily
    // changing the draft.
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
    <textarea
      ref={editorRef}
      className="cal-entry-editor cal-entry cal-font-entry"
      style={{ fontSize: `${guessPx}px` }}
      value={draft}
      aria-label={t("editor.label")}
      onInput={(e) => {
        const el = e.currentTarget;
        pendingRef.current = {
          value: el.value,
          caret: el.selectionStart ?? el.value.length,
        };
        setDraft(el.value);
      }}
      onBlur={commit}
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

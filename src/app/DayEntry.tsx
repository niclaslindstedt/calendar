// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The shared per-day entry surface: renders the day's text at its
// shrink-to-fit size, and — when the day is being edited — swaps in an
// in-place textarea with the same typography, so clicking a date and typing
// feels like writing on the calendar itself. All three views mount this; the
// view chooses the sizing curve and passes editing state down.

import { useEffect, useRef, useState } from "react";

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
  onCommit,
  onClose,
  className,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState(text);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Entering edit mode re-seeds the draft from the stored text and seats the
  // caret at the end.
  useEffect(() => {
    if (!editing) return;
    setDraft(text);
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // The stored text is only the seed — mid-edit remote updates must not
    // yank the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    if (text === "") return null;
    return (
      <div
        className={`cal-entry ${className ?? ""}`}
        style={{ fontSize: `${resolveEntryFontPx(text.length, font, size)}px` }}
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
      ref={ref}
      className="cal-entry-editor cal-entry"
      style={{ fontSize: `${resolveEntryFontPx(draft.length, font, size)}px` }}
      value={draft}
      placeholder={t("editor.placeholder")}
      aria-label={t("editor.placeholder")}
      onInput={(e) => {
        const next = e.currentTarget.value;
        setDraft(next);
        // Live-save as you type: the calendar shows what you have; closing
        // the editor is just putting the pen down.
        onCommit(next);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

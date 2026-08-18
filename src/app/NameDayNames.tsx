// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day's celebrated names, as a run of text whose every name is also the
// way into the name-day search.
//
// All three views print the same run — "Kasper, Melker, Baltsar" — so they
// share this rather than each growing its own copy of the tap handling. The
// separators stay OUTSIDE the tappable spans: the run has to read and break as
// one piece of text, and a tap target is not allowed to change where a line
// ends.

import { hyphenate as hyphenateText, type LocalePack } from "./locale/index.ts";

type Props = {
  names: readonly string[];
  pack: LocalePack;
  /** Seed the search with the tapped name. */
  onOpen: (name: string) => void;
  /** Soft-hyphenate each name — for the month cell, whose line is 46 px wide.
   *  The wider views leave names whole. */
  hyphenated?: boolean;
};

export function NameDayNames({ names, pack, onOpen, hyphenated }: Props) {
  return (
    <>
      {names.map((name, i) => (
        <span key={name}>
          {i > 0 && ", "}
          <span
            role="button"
            tabIndex={0}
            aria-label={name}
            // `stopPropagation` keeps the tap off the day's click-to-type,
            // the same way the holiday name does.
            onClick={(e) => {
              e.stopPropagation();
              onOpen(name);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              onOpen(name);
            }}
            className="cursor-pointer focus-visible:outline-2"
          >
            {/* Hyphenated a name at a time, which is what `hyphenate` does
                inside a joined string anyway — it works word by word. */}
            {hyphenated ? hyphenateText(name, pack.hyphenation) : name}
          </span>
        </span>
      ))}
    </>
  );
}

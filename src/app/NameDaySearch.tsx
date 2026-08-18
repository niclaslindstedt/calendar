// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The name-day screen: the almanac's names, and which day each is celebrated
// on — browsable as a list, searchable by a name spelled the way the person
// searching spells it.
//
// The way in is tapping one of the day's names anywhere in the calendar, which
// mirrors how a holiday's name opens the holidays screen: the text you are
// asking about is already in front of you, so it doubles as the way in. It
// opens on the **list**, scrolled to the name you touched — you tapped a name
// to see the names, and landing in the alphabet where that name is keeps the
// tap meaningful without demanding a query you did not type.
//
// Typing turns it into a search. That is the whole mode switch: an empty field
// is the alphabet, a filled one is an answer.
//
// It is a dialog rather than a destination because you are asking a question
// about a name, not leaving the calendar — and the answer takes you back into
// it. The shell (full-screen on a phone, Escape, focus restore) is the
// framework's `Modal`; the list, the matching and the row are app-local,
// because "which names sound like this one" is domain knowledge.

import { Fragment, useEffect, useMemo, useRef } from "react";

import {
  ClearableInput,
  CloseIcon,
  Modal,
  SearchIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import { monthName, type LocalePack } from "./locale/index.ts";
import {
  allNames,
  searchNames,
  type NameDayEntry,
  type NameHit,
} from "./nameSearch.ts";

type Props = {
  open: boolean;
  pack: LocalePack;
  /** The name that was tapped — where the list opens. */
  seed: string;
  /** The live query. Owned by the shell so the screen keeps what was typed
   *  across a re-render of the calendar behind it. */
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  /** Picking a name takes the calendar to its day, in the year on display. */
  onPick: (month: number, day: number) => void;
};

export function NameDaySearch({
  open,
  pack,
  seed,
  query,
  onQueryChange,
  onClose,
  onPick,
}: Props) {
  const t = useT();
  const trimmed = query.trim();
  // The almanac is static data, so both of these are keyed on the pack; the
  // search additionally runs on every keystroke, which is why the index it
  // reads is built once rather than per query.
  const names = useMemo(() => allNames(pack), [pack]);
  const hits = useMemo(
    () => (trimmed ? searchNames(pack, trimmed) : null),
    [pack, trimmed],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="namedays-title"
      closeLabel={t("names.close")}
      // The body is 627 names in a scroller, and the dialog's swipe-to-close
      // reads the same downward drag as the first flick of a scroll. Scrolling
      // wins here; the × and Escape close it.
      swipeToClose={false}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-3 px-3 py-2">
        <h2 id="namedays-title" className="sr-only">
          {t("names.title")}
        </h2>
        <SearchIcon className="text-muted h-5 w-5 shrink-0" />
        {/* Deliberately not focused on open: the keyboard would bury the
            list the tap asked for. Touching the field is the gesture that
            means "I want to search", and it is one tap. */}
        <ClearableInput
          value={query}
          onValueChange={onQueryChange}
          enterKeyHint="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellcheck={false}
          aria-label={t("names.title")}
          placeholder={t("names.placeholder")}
          clearLabel={t("names.clear")}
          wrapperClassName="min-w-0 flex-1"
          className="py-1 text-base"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("names.close")}
          className="text-muted hover:bg-surface-2 hover:text-fg -mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded focus-visible:outline-2"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {names.length === 0 ? (
          <Message text={t("names.unavailable")} />
        ) : hits === null ? (
          <NameList
            entries={names}
            pack={pack}
            lettered
            at={seed}
            onPick={onPick}
          />
        ) : hits.length === 0 ? (
          <Message text={t("names.noResults", { query: trimmed })} />
        ) : (
          <>
            <Caption
              text={
                hits.length === 1
                  ? t("names.oneMatch")
                  : t("names.matches", { n: hits.length })
              }
            />
            <NameList entries={hits} pack={pack} onPick={onPick} />
          </>
        )}
      </div>
    </Modal>
  );
}

/** The list, in two guises: the whole almanac under its initials, or a page
 *  of hits under their headings. Both are the same row. */
function NameList({
  entries,
  pack,
  onPick,
  /** Break the list up by initial — the browsing mode only. */
  lettered,
  /** The name the calendar was tapped on: where the list opens. */
  at,
}: {
  entries: readonly (NameDayEntry | NameHit)[];
  pack: LocalePack;
  onPick: (month: number, day: number) => void;
  lettered?: boolean;
  at?: string;
}) {
  const t = useT();
  const landing = useRef<HTMLLIElement>(null);
  const similarLabel = t("names.similar");
  const rows = useMemo(
    () => headed(entries, lettered ?? false, similarLabel),
    [entries, lettered, similarLabel],
  );

  // Land on the tapped name rather than at "Abel". `auto` rather than
  // `smooth`: the list should already be at the right place when it appears,
  // not scroll there while you are reading it.
  useEffect(() => {
    landing.current?.scrollIntoView({ block: "center" });
  }, [at]);

  return (
    <ul className="m-0 list-none p-0 pb-[env(safe-area-inset-bottom)]">
      {rows.map((row) => {
        const here = at !== undefined && row.entry.name === at;
        return (
          <Fragment
            key={`${row.entry.name}-${row.entry.month}-${row.entry.day}`}
          >
            {row.heading !== null && (
              // A heading is a sibling of the rows rather than part of one,
              // which is what lets the initial stick: a `sticky` element can
              // only travel inside its own parent, so a heading nested in its
              // first row would unstick again one row later.
              <li
                className={`text-muted border-b border-line bg-surface px-4 pt-2 pb-1 text-xs tracking-wide uppercase ${
                  row.sticky ? "sticky top-0 z-10" : ""
                }`}
              >
                {row.heading}
              </li>
            )}
            <NameRow
              rowRef={here ? landing : undefined}
              entry={row.entry}
              pack={pack}
              here={here}
              onPick={() => onPick(row.entry.month, row.entry.day)}
            />
          </Fragment>
        );
      })}
    </ul>
  );
}

/**
 * The rows, each carrying the heading that belongs above it, if any.
 *
 * Two kinds of heading, never both in one list, because the two modes never
 * share one: an **initial** in the browsing list — in the pack's own alphabet,
 * since `localeCompare` has already sorted Å, Ä and Ö after Z — and, in the
 * search results, a single heading above the first guess. A name reached
 * through the edit allowance is a guess and should look like one; they always
 * come last, because every direct match outranks them.
 *
 * Only the initials stick: they are a place in the alphabet, which you want to
 * keep seeing as you scroll. The guess heading is a fence you cross once.
 */
function headed(
  entries: readonly (NameDayEntry | NameHit)[],
  lettered: boolean,
  similarLabel: string,
): {
  entry: NameDayEntry | NameHit;
  heading: string | null;
  sticky: boolean;
}[] {
  let letter = "";
  let seenGuess = false;
  return entries.map((entry) => {
    if (lettered) {
      const initial = entry.name.slice(0, 1).toUpperCase();
      const heading = initial === letter ? null : initial;
      letter = initial;
      return { entry, heading, sticky: true };
    }
    const guess = "kind" in entry && entry.kind === "fuzzy";
    const heading = guess && !seenGuess ? similarLabel : null;
    seenGuess = seenGuess || guess;
    return { entry, heading, sticky: false };
  });
}

function NameRow({
  rowRef,
  entry,
  pack,
  here,
  onPick,
}: {
  /** Not `ref`: Preact does not hand a plain `ref` to a function component. */
  rowRef?: { current: HTMLLIElement | null };
  entry: NameDayEntry | NameHit;
  pack: LocalePack;
  here: boolean;
  onPick: () => void;
}) {
  return (
    <li ref={rowRef}>
      <button
        type="button"
        onClick={onPick}
        aria-current={here ? "true" : undefined}
        className={`hover:bg-surface-2 flex w-full cursor-pointer items-baseline gap-3 border-b border-line px-4 py-2.5 text-left focus-visible:outline-2 ${
          here ? "bg-surface-2" : ""
        }`}
      >
        {/* Set in the calendar's own name-day face, so the answer looks like
            the thing you tapped. */}
        <span className="cal-font-nameday text-fg min-w-0 flex-1 text-base">
          {entry.name}
        </span>
        <span className="cal-serif text-muted shrink-0 text-sm">
          {entry.day} {monthName(pack, entry.month)}
        </span>
      </button>
    </li>
  );
}

function Caption({ text }: { text: string }) {
  return (
    <p className="text-muted px-4 pt-3 pb-1 text-xs tracking-wide uppercase">
      {text}
    </p>
  );
}

function Message({ text }: { text: string }) {
  return <p className="text-muted px-6 py-10 text-center text-sm">{text}</p>;
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The week screen: the year's weeks with the dates they span, and a search
// that takes either half of the coordinate.
//
// The way in is tapping a week number anywhere in the calendar — the month
// grid's gutter, a strip row's rail, the day held up close — which mirrors how
// a holiday's name opens the holidays screen and one of a day's names opens
// the almanac. The number you are asking about is already in front of you, so
// it doubles as the way in.
//
// It opens on the **list**, scrolled to the week you touched: you tapped a
// week number to see the weeks, and landing where that week is keeps the tap
// meaningful without demanding a query you did not type. Typing turns it into
// a search — the same mode switch the name-day screen makes, and for the same
// reason: an empty field is the table, a filled one is an answer.
//
// A dialog rather than a destination, again like the almanac: you are asking
// where a week is, and the answer takes you back into the calendar at it. The
// shell (full-screen on a phone, Escape, focus restore) is the framework's
// `Modal`; the table, the readings and the row are app-local, because "what
// can `12/8` mean" is domain knowledge (`weekSearch.ts`).

import { Fragment, useEffect, useMemo, useRef } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  ClearableInput,
  CloseIcon,
  Modal,
  SearchIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import { LIST_BOTTOM_PAD } from "./layout.ts";
import { monthName, type LocalePack } from "./locale/index.ts";
import {
  dayLabel,
  searchWeeks,
  weekMonth,
  weekOf,
  weekRangeLabel,
  weeksInYear,
  type WeekHit,
} from "./weekSearch.ts";

type Props = {
  open: boolean;
  pack: LocalePack;
  /** A day inside the week that was tapped — where the list opens, and which
   *  year's table it opens. A day rather than a number, because a bare "week
   *  1" does not say which of the two years around New Year it belongs to,
   *  and that is exactly the week most likely to be tapped from the wrong
   *  side of the turn. */
  seed: DayKey;
  /** The live query. Owned by the shell so the screen keeps what was typed
   *  across a re-render of the calendar behind it. */
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  /** Picking a week takes the calendar to it — the day it opens on. */
  onPick: (start: DayKey) => void;
};

export function WeekSearch({
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
  const here = useMemo(() => weekOf(pack, seed), [pack, seed]);
  // The year the table is of: the week's own rather than the tapped day's, so
  // the 31st of December opens next year's week 1 where it belongs instead of
  // at the far end of a table that does not contain it.
  const year = weekMonth(here).year;
  const rows = useMemo(() => weeksInYear(pack, year), [pack, year]);
  const hits = useMemo(
    () => (trimmed ? searchWeeks(pack, year, trimmed) : null),
    [pack, year, trimmed],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="weeks-title"
      closeLabel={t("weeks.close")}
      // Fifty-odd rows in a scroller, and the dialog's swipe-to-close reads
      // the same downward drag as the first flick of a scroll. Scrolling wins
      // here; the × and Escape close it.
      swipeToClose={false}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-3 px-3 py-2">
        <h2 id="weeks-title" className="sr-only">
          {t("weeks.title")}
        </h2>
        <SearchIcon className="text-muted h-5 w-5 shrink-0" />
        {/* Deliberately not focused on open, as in the almanac: the keyboard
            would bury the table the tap asked for. */}
        <ClearableInput
          value={query}
          onValueChange={onQueryChange}
          enterKeyHint="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellcheck={false}
          aria-label={t("weeks.title")}
          placeholder={t("weeks.placeholder")}
          clearLabel={t("weeks.clear")}
          wrapperClassName="min-w-0 flex-1"
          className="py-1 text-base"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("weeks.close")}
          className="text-muted hover:bg-surface-2 hover:text-fg -mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded focus-visible:outline-2"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {hits === null ? (
          <WeekList
            hits={rows.map((row) => ({ ...row, on: null }))}
            pack={pack}
            headed
            at={here.start}
            onPick={onPick}
          />
        ) : hits.length === 0 ? (
          <>
            <Message text={t("weeks.noResults", { query: trimmed })} />
            <Message text={t("weeks.hint")} />
          </>
        ) : (
          <>
            <Caption
              text={
                hits.length === 1
                  ? t("weeks.oneMatch")
                  : t("weeks.matches", { n: hits.length })
              }
            />
            <WeekList hits={hits} pack={pack} onPick={onPick} />
          </>
        )}
      </div>
    </Modal>
  );
}

/** The table, in both of its guises: the year under its month headings, or a
 *  page of answers. Both are the same row.
 *
 *  Only the browsing list is headed, and the heading is the month the week
 *  mostly lies in ({@link weekMonth}) — the almanac's own filing, since that
 *  is the day it numbers the week by. It sticks, because scrolled fifty rows
 *  down a year "week 34" is a number until something says August. The results
 *  are not headed: they are already an answer to a question that named the
 *  month, or the week, or the day. */
function WeekList({
  hits,
  pack,
  onPick,
  headed,
  at,
}: {
  hits: readonly WeekHit[];
  pack: LocalePack;
  onPick: (start: DayKey) => void;
  headed?: boolean;
  /** The week the calendar was tapped on: where the list opens. */
  at?: DayKey;
}) {
  const landing = useRef<HTMLLIElement>(null);
  const rows = useMemo(
    () => monthHeaded(hits, pack, headed ?? false),
    [hits, pack, headed],
  );

  // Land on the tapped week rather than at week 1. `auto` rather than
  // `smooth`: the list should already be at the right place when it appears,
  // not scroll there while you are reading it.
  useEffect(() => {
    landing.current?.scrollIntoView({ block: "center" });
  }, [at]);

  return (
    // The gutter under the last week, matching the calendar views' own
    // (`LIST_BOTTOM_PAD`): the inset alone is the home indicator's band, so
    // spending it leaves the last row butted against the swipe bar.
    <ul
      className="m-0 list-none p-0"
      style={{ paddingBottom: LIST_BOTTOM_PAD }}
    >
      {rows.map((row) => {
        const mine = at !== undefined && row.hit.start === at;
        return (
          <Fragment key={`${row.hit.start}-${row.hit.on ?? ""}`}>
            {row.heading !== null && (
              // A sibling of the rows rather than part of one: a `sticky`
              // element can only travel inside its own parent, so a heading
              // nested in its first row would unstick one row later.
              <li className="text-muted sticky top-0 z-10 border-b border-line bg-surface px-4 pt-2 pb-1 text-xs tracking-wide uppercase">
                {row.heading}
              </li>
            )}
            <WeekRowButton
              rowRef={mine ? landing : undefined}
              hit={row.hit}
              pack={pack}
              here={mine}
              onPick={() => onPick(row.hit.start)}
            />
          </Fragment>
        );
      })}
    </ul>
  );
}

/** The rows, each carrying the month heading that belongs above it, if any —
 *  computed up front rather than accumulated down the map, because a render
 *  that carries state from one row to the next is a render that can be
 *  restarted halfway. */
function monthHeaded(
  hits: readonly WeekHit[],
  pack: LocalePack,
  headed: boolean,
): { hit: WeekHit; heading: string | null }[] {
  let last = "";
  return hits.map((hit) => {
    if (!headed) return { hit, heading: null };
    const on = weekMonth(hit);
    const title = `${monthName(pack, on.month)} ${on.year}`;
    const heading = title === last ? null : title;
    last = title;
    return { hit, heading };
  });
}

function WeekRowButton({
  rowRef,
  hit,
  pack,
  here,
  onPick,
}: {
  /** Not `ref`: Preact does not hand a plain `ref` to a function component. */
  rowRef?: { current: HTMLLIElement | null };
  hit: WeekHit;
  pack: LocalePack;
  here: boolean;
  onPick: () => void;
}) {
  const t = useT();
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
        <span className="min-w-0 flex-1">
          {/* Set in the calendar's own week face, so the answer looks like the
              thing you tapped. */}
          <span className="cal-font-week text-fg block text-base">
            {t("topbar.week", { n: hit.week })}
          </span>
          {/* Why this week is in the answer — the date a reading was made of.
              It is what tells the two halves of an ambiguous `12/8` apart, so
              it is spelled out in full rather than echoed as typed. */}
          {hit.on !== null && (
            <span className="text-muted block text-xs">
              {dayLabel(pack, hit.on)}
            </span>
          )}
        </span>
        <span className="cal-serif text-muted shrink-0 text-sm">
          {weekRangeLabel(pack, hit)}
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
  return <p className="text-muted px-6 py-4 text-center text-sm">{text}</p>;
}

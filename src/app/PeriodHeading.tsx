// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The heading every view shares: MONTH 2026. All three views render this, so
// the period is named in the same place whichever one is open — and in the
// same type. The month grid used to set its masthead larger and in caps while
// the two strip views set theirs smaller and in lower case, which read as
// three calendars rather than three views of one; the wall-calendar caps won,
// because that is what a printed month title looks like, and the size came
// down to what the longest month name can hold (see {@link HEADING_TITLE}).
//
// The three calendar views hand it no navigation at all, so it draws no
// chevrons for them: their periods turn up and down (`SwipeDeck`), and a
// chevron is a direction — the two that would be right there point at the top
// and the bottom of the screen, which reads as "scroll". A caller that really
// does page sideways passes the pair and gets ‹ › back: the holidays screen's
// years do. The row keeps its height either way ({@link HEADING_HEIGHT}),
// because the day list pins this over its scroll and measures the clearance
// from it.

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";

type Props = {
  /** The period's name — the month, or "Week 34". */
  title: string;
  /** The quieter trailing detail (the year, or the week's month + year). */
  meta?: string;
  /** Extra classes on the heading row — how the day list pins it to the top
   *  of its own scroller. */
  className?: string;
  /** The colour the heading is banded with (Settings → Calendar → Heading),
   *  or `null` for the plain heading the app shipped with. A band sets its
   *  text in white, the way a printed almanac prints its masthead. */
  accent?: string | null;
  /** Whether the band runs edge to edge on a phone (see below). Only a band
   *  can bleed — an unbanded heading has nothing to reach the edges with. */
  bleed?: boolean;
  /** Whether what follows brings its own leading, so the heading leaves no
   *  air of its own ({@link HEADING_GAP}). Set by a view whose first row is
   *  spaced off a rule everywhere else — under a band, the band *is* that
   *  rule, and a gap on top of the row's own padding gives the first day of
   *  the week more air than the six days under it. Both strip views set it:
   *  the day list unconditionally, because its heading carries the list's own
   *  hairline where it is not banded (see `DayListView`). */
  flush?: boolean;
  /** Paging, for a caller whose periods really do turn left and right. Hand
   *  over both and the heading flanks its title with the two chevrons; leave
   *  them out — as all three calendar views do — and it is a masthead and
   *  nothing else. */
  onPrevious?: () => void;
  onNext?: () => void;
};

/** The masthead's type, the same in every view.
 *
 *  Caps and letter-spacing are the wall calendar's, and the size is a
 *  measurement rather than a taste call, like every other size in this app
 *  (AGENTS.md): the title has to hold the longest month name *and* the year
 *  beside it in what the arrows leave of a 393 px screen, which is 273 px once
 *  the band's padding and the two 36 px buttons are taken off. The widest name
 *  either shipped pack has is "SEPTEMBER"; measured with `canvas.measureText`
 *  in the heading's own resolved serif it comes to 217 px with the year beside
 *  it — 56 px of slack, which is the room a device whose serif is wider than
 *  the one this was measured in needs. At the 30 px and 0.18em the month view
 *  used to set, the same pair measured ~274 px against the same 273 px, which
 *  is why "September" was the month that gave the game away.
 *
 *  Past `sm` the calendar is a centred column on a wide page and the masthead
 *  steps up with it. 30 px is the ceiling there: a `text-3xl` line box is
 *  2.25 rem, exactly the arrows' height, so the band's measured height
 *  ({@link HEADING_HEIGHT}) stays true — the `text-4xl` the month view used to
 *  reach for was 2.5 rem and quietly made the band taller than the number the
 *  day list scrolls by. */
export const HEADING_TITLE =
  "cal-serif text-2xl font-normal tracking-[0.14em] uppercase sm:text-3xl";

/** …and the quieter detail beside it — the year, at the ratio the wall
 *  calendar's masthead prints it, with the tracking dropped: a year is a
 *  number to read, not a title to space out. */
export const HEADING_META = "text-lg tracking-normal sm:text-xl";

const ARROW_BASE =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] transition-colors focus-visible:ring-2 focus-visible:outline-none";

/** How tall the heading stands: the `py-4` below marks 1rem above and below
 *  the tallest thing in the row, which is the 2.25rem arrow button — both
 *  titles the views set are shorter than their own arrows, so the sum does not
 *  depend on which view is asking.
 *
 *  Exported because the day list pins this over its own scroll, so a row it
 *  opens on has to clear exactly this much (`scroll-padding-top`). Derived
 *  from the two classes rather than measured off a screenshot, and
 *  `tests/layout_test.ts` reads those classes back out of this file so the
 *  three can never drift.
 *
 *  …and set back on the row as its `min-height`, because on the page where
 *  the reader turns the calendar vertically there are no arrows and the band
 *  is then only as tall as its title: 2rem of line box inside the same 2rem of
 *  padding, which is 4rem rather than this. The row used to guard that with a
 *  minimum of the arrow's own height — and it never once bound, because every
 *  box in this app is `border-box`, so a 2.25rem minimum was compared against
 *  the whole 4rem band rather than against the 2rem of content the arrows
 *  would have filled. The quarter-rem it left the day list short is a
 *  quarter-rem the home row's week rule spent below the masthead instead of
 *  behind it. A minimum written in the same terms as the thing it has to
 *  match cannot go wrong that way. */
export const HEADING_HEIGHT = "4.25rem";

/** The air the heading leaves under itself, before the first thing the view
 *  prints.
 *
 *  The band is a solid edge, so whatever follows it sits *on* that edge
 *  unless something holds it off, and the month grid's weekday row is held
 *  off by this. What follows it in a strip view is not: a row there already
 *  carries the leading it is given under every *other* row's hairline
 *  (`STRIP_ROW_PAD`), so the gap was air on top of air and the first day of
 *  the week stood further off the masthead than the six days under it stood
 *  off each other. A view says which it is with `flush`; it is the same gap
 *  either way, for the reason `layout.ts` gives for keeping the shared
 *  measurements in one place.
 *
 *  So only the month grid actually spends it today — which is why it is no
 *  longer part of {@link HEADING_CLEARANCE}.
 *
 *  It carries the room factor (`roomScale.ts`) like every other measured
 *  length here: the rows below it are set larger on a bigger screen, and a
 *  gap left at the phone's 12 px between them would read as the same crowding
 *  one size up. `--cal-room` is mapped down per scope by the `.cal-scope-*`
 *  class the view carries, which is above the heading in all three. */
export const HEADING_GAP = "calc(0.75rem * var(--cal-room, 1))";

/** How much the heading occupies at the top of a scroller that pins it. The
 *  day list keeps this much of its scrollport clear (`scroll-padding-top`),
 *  so a row it scrolls to lands where an unscrolled one sits rather than
 *  under the masthead.
 *
 *  The band and nothing else, because the day list's heading is `flush`: its
 *  first row seats on the band the way every other row seats on the hairline
 *  above it, so there is no air under the masthead for a scrolled-to row to
 *  match. It kept {@link HEADING_GAP} in here while there was — and the two
 *  answers have to stay one number, or the month you page to opens a row's
 *  worth of white lower than the month you are living in. */
export const HEADING_CLEARANCE = HEADING_HEIGHT;

/** On the page's own ground, and on a colour band. The banded pair are white
 *  at two strengths rather than the theme's muted/foreground tokens: the band
 *  is one fixed colour in both themes, so the ink over it has to be too. */
const ARROW_INK =
  "text-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-fg";
const ARROW_ON_BAND =
  "text-white/80 hover:bg-white/20 hover:text-white focus-visible:ring-white";

export function PeriodHeading({
  title,
  meta,
  className = "",
  accent = null,
  bleed = false,
  flush = false,
  onPrevious,
  onNext,
}: Props) {
  const t = useT();
  const arrows = onPrevious !== undefined && onNext !== undefined;
  // On a phone the band reaches the screen's edges, the way printed furniture
  // reaches the paper's — in every view, because in every view the rules under
  // it do. The month grid used to be the exception, on the reasoning that its
  // own edges were the page's margin and a band a gutter wider than the grid
  // read as a misalignment; what it actually read as was one view's masthead
  // stopping short of two others'. Only on a phone: past `sm` the calendar is a
  // centred column on a wide page, and a masthead spanning the whole window
  // would be heading the window rather than the calendar.
  //
  // `-mx-3` is the views' own `px-3`, cancelled; the band puts it back
  // as padding (`px-5` = the gutter plus the band's own `px-2`) so the arrows
  // stay where they were, over the rows' margins.
  const banded = accent !== null;
  const bled = banded && bleed;
  const arrow = `${ARROW_BASE} ${banded ? ARROW_ON_BAND : ARROW_INK}`;
  return (
    <div
      className={`flex shrink-0 items-center gap-1 py-4 ${
        banded ? "text-white" : ""
      } ${bled ? "-mx-3 px-5 sm:mx-0 sm:px-2" : banded ? "px-2" : ""} ${className}`}
      // The background is inline so it wins over whatever the caller's
      // `className` carries — the day list pins its heading with an opaque
      // `bg-page-bg` so the rows pass under it, and the band has to be what
      // shows. The gap is inline because it is a `calc()` on the room factor
      // rather than a spacing step, and the minimum because it is the exported
      // constant itself: the one number the day list scrolls by is the one
      // number the band is held to ({@link HEADING_HEIGHT}).
      style={{
        minHeight: HEADING_HEIGHT,
        marginBottom: flush ? undefined : HEADING_GAP,
        ...(banded ? { background: accent } : {}),
      }}
    >
      {arrows && (
        <button
          type="button"
          aria-label={t("topbar.previous")}
          onClick={onPrevious}
          className={arrow}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      )}

      <h2 className={`min-w-0 flex-1 text-center ${HEADING_TITLE}`}>
        {title}
        {meta && (
          <span
            className={`ml-3 ${banded ? "text-white/80" : "text-muted"} ${HEADING_META}`}
          >
            {meta}
          </span>
        )}
      </h2>

      {arrows && (
        <button
          type="button"
          aria-label={t("topbar.next")}
          onClick={onNext}
          className={arrow}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

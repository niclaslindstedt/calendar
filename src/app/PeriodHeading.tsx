// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The heading every view shares: ‹ MONTH 2026 ›. The period arrows live here
// rather than in the top menu — on a portrait phone the menu has no room for
// them beside the view switcher, and the arrows read better flanking the
// thing they move. All three views render this, so the navigation sits in the
// same place whichever one is open — and, since this build, in the same type.
// The month grid used to set its masthead larger and in caps while the two
// strip views set theirs smaller and in lower case, which read as three
// calendars rather than three views of one; the wall-calendar caps won,
// because that is what a printed month title looks like, and the size came
// down to what the longest month name can hold (see {@link HEADING_TITLE}).
//
// …and none at all where the reader pages up and down (Settings → Calendar →
// Navigation): a chevron is a direction, and two pointing sideways over a
// calendar that turns vertically are worse than no chevrons at all. The row
// keeps its height regardless (`min-h-9`, the arrows' own), because the day
// list pins this over its scroll and measures the clearance from it.

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
  /** Whether the two chevrons are printed. Off where a swipe pages up and
   *  down (`navSwipe.ts`); the row keeps its height either way. */
  arrows?: boolean;
  onPrevious: () => void;
  onNext: () => void;
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
 *  three can never drift. */
export const HEADING_HEIGHT = "4.25rem";

/** The air the heading leaves under itself, before the first thing the view
 *  prints.
 *
 *  The band is a solid edge, so whatever follows it sits *on* that edge
 *  unless something holds it off — and the two strip views follow it with a
 *  row whose date starts at the very top of its box, so the first day of the
 *  week read as printed into the masthead rather than under it. The month
 *  grid gets away with less only because its weekday row brings its own
 *  leading; it is the same gap either way, for the reason `layout.ts` gives
 *  for keeping the shared measurements in one place.
 *
 *  It carries the room factor (`roomScale.ts`) like every other measured
 *  length here: the rows below it are set larger on a bigger screen, and a
 *  gap left at the phone's 12 px between them would read as the same crowding
 *  one size up. `--cal-room` is mapped down per scope by the `.cal-scope-*`
 *  class the view carries, which is above the heading in all three. */
export const HEADING_GAP = "calc(0.75rem * var(--cal-room, 1))";

/** How much the heading occupies at the top of a scroller that pins it — the
 *  band itself plus the air under it. The day list keeps this much of its
 *  scrollport clear (`scroll-padding-top`), so a row it scrolls to lands with
 *  the same gap below the band that an unscrolled one has, rather than flush
 *  against it. */
export const HEADING_CLEARANCE = `calc(${HEADING_HEIGHT} + ${HEADING_GAP})`;

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
  arrows = true,
  onPrevious,
  onNext,
}: Props) {
  const t = useT();
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
      className={`flex min-h-9 shrink-0 items-center gap-1 py-4 ${
        banded ? "text-white" : ""
      } ${bled ? "-mx-3 px-5 sm:mx-0 sm:px-2" : banded ? "px-2" : ""} ${className}`}
      // The background is inline so it wins over whatever the caller's
      // `className` carries — the day list pins its heading with an opaque
      // `bg-page-bg` so the rows pass under it, and the band has to be what
      // shows. The gap is inline because it is a `calc()` on the room factor
      // rather than a spacing step.
      style={{
        marginBottom: HEADING_GAP,
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

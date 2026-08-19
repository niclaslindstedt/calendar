// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The heading every view shares: ‹ MONTH 2026 ›. The period arrows live here
// rather than in the top menu — on a portrait phone the menu has no room for
// them beside the view switcher, and the arrows read better flanking the
// thing they move. All three views render this, so the navigation sits in the
// same place whichever one is open.

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
  /** Typography for the title, so the month view can keep its larger,
   *  letter-spaced wall-calendar serif while the other views stay compact. */
  titleClass: string;
  /** Typography for `meta`, matched to the title's size. */
  metaClass: string;
  /** Extra classes on the heading row — how the day list pins it to the top
   *  of its own scroller. */
  className?: string;
  /** The colour the heading is banded with (Settings → Calendar → Heading),
   *  or `null` for the plain heading the app shipped with. A band bleeds to
   *  the screen's edges and sets its text in white, the way a printed almanac
   *  prints its masthead. */
  accent?: string | null;
  onPrevious: () => void;
  onNext: () => void;
};

const ARROW_BASE =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] transition-colors focus-visible:ring-2 focus-visible:outline-none";

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
  titleClass,
  metaClass,
  className = "",
  accent = null,
  onPrevious,
  onNext,
}: Props) {
  const t = useT();
  // The band is exactly as wide as the calendar under it. It bled to the
  // screen's edges once, on the theory that printed furniture reaches the
  // paper's edge — but the rows below it do not, and a band a gutter wider
  // than its own calendar reads as a misalignment rather than as a masthead.
  const banded = accent !== null;
  const arrow = `${ARROW_BASE} ${banded ? ARROW_ON_BAND : ARROW_INK}`;
  return (
    <div
      className={`flex shrink-0 items-center gap-1 py-4 ${
        banded ? "px-2 text-white" : ""
      } ${className}`}
      // Inline, so it wins over whatever background the caller's `className`
      // carries — the day list pins its heading with an opaque `bg-page-bg`
      // so the rows pass under it, and the band has to be what shows.
      style={banded ? { background: accent } : undefined}
    >
      <button
        type="button"
        aria-label={t("topbar.previous")}
        onClick={onPrevious}
        className={arrow}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      <h2 className={`min-w-0 flex-1 text-center ${titleClass}`}>
        {title}
        {meta && (
          <span
            className={`ml-3 ${banded ? "text-white/80" : "text-muted"} ${metaClass}`}
          >
            {meta}
          </span>
        )}
      </h2>

      <button
        type="button"
        aria-label={t("topbar.next")}
        onClick={onNext}
        className={arrow}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

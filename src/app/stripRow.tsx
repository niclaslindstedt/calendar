// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The strip row's two margins and the writing surface they leave, shared by
// the week planner and the day list.
//
// Both views print the same day: the date set big at the head of a lane on the
// left with the weekday beside it and the day's names under that, and the
// almanac's own marginalia — the week number where a week opens, the holiday's
// name along the bottom — in a rail on the right. What differs is the *row*:
// the week planner gives a day a seventh of the screen and the day list gives
// it a line of a month-long scroll. So the row itself stays each view's own
// (its height, its borders, how it memoizes) and only the margins and the
// writing surface live here, which is what keeps the two from drifting apart a
// caption at a time.
//
// How much room the note gets out of that is the reader's, and it is the one
// question with two whole layouts behind it (`stripNoteFlow`, Settings →
// Calendar → View):
//
//   * **Column** (the default). The margins are columns of the row's full
//     height and the note is the width between them — a strip whose two edges
//     are the almanac's, straight down the page, and a note that never prints
//     under the date or the week number. It is what both views drew before
//     the other arrangement existed, and it is the default because a note
//     that takes the whole row is a change to what a calendar looks like, not
//     only to how much fits in it.
//   * **Flowing.** The margins become **floats** — only as tall as what they
//     print — so what you write runs beside them while they last and takes the
//     row's full width underneath, the same arrangement the month cell gives
//     its day number (`monthCell.tsx`). Half again the room, at the price of
//     a right edge that moves down the strip.
//
// Two things follow the arrangement rather than being decided once. A *piece*
// is printed per day only where the note flows (`piecesPrinted`): an absent
// float costs nothing, so the six days a week that open no week get their
// first lines back — but an absent *column* would move the note's edge on
// every row, so a reserved margin in column mode is drawn whether or not this
// day has anything to put in it. And the note's own wrapping differs, because
// a line shortened by a float is not a line at all in a column (`DayEntry`'s
// `flow`).
//
// Which margin each piece is printed in — and at which end of it — is the
// reader's call too (`stripLayout.ts`). The defaults are the arrangement
// above, so a calendar nobody has rearranged is the one both views have always
// drawn.

import type { CSSProperties, ReactNode } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { useT } from "./i18n/index.ts";
import { weekdayName, type Holiday, type LocalePack } from "./locale/index.ts";
import { NameDayNames } from "./NameDayNames.tsx";
import { MarkedDate } from "./PastMark.tsx";
import type { PastMarkStyle } from "./pastDays.ts";
import {
  inMargin,
  piecesInMargin,
  piecesPrinted,
  type StripLayout,
  type StripPiece,
} from "./stripLayout.ts";
import { dayOfYear, weekNumberLabel, type WeekFormat } from "./weekPlanner.ts";

/** The row's own edges, shared for the same reason its margins are.
 *
 *  On a phone a row runs the full width of the screen: its rule, its
 *  week-change rule and today's tint are the calendar's own furniture, and
 *  furniture that stops 12 px short of the paper on both sides reads as a
 *  column floating on the page rather than as a printed strip — the same
 *  reason the heading band bleeds (`PeriodHeading`). So the view's own gutter
 *  is cancelled here and put back as padding, and the padding put back is
 *  *less* than the pair it replaces: what the row spends at the two ends is
 *  the date at one and the week number at the other, and both of them would
 *  rather have the 8 px than the margin would.
 *
 *  Past `sm` the calendar is a centred column on a wide page and the rules
 *  belong to the column, so the row goes back to the view's own padding. */
export const STRIP_ROW_EDGE = "-mx-3 px-3 sm:mx-0 sm:px-2";

/** The row itself: a column of the body and, under it, whatever the rail's
 *  bottom end prints along the row's edge. Both views (and the settings
 *  sample) put this on their own row element, which is the one that carries
 *  the height, the rules and the gestures. */
export const STRIP_ROW_FRAME = "flex flex-col";

/** The air a row keeps at its two ends, shared for the same reason its edges
 *  are: the day list and the week planner print the same row, and the sample
 *  in Settings → Calendar → View prints it a third time.
 *
 *  Uneven, because the two ends are not the same distance. A row's rule is
 *  drawn on *its* top edge, and what sits immediately under that rule is the
 *  date — set at 20 px in the list and up to 3 rem in the planner, and trimmed
 *  to its own capitals (`text-box-trim`), so there is no leading at all
 *  between the line and the numeral and the 4 px this used to spend at both
 *  ends read as a number crowded against a rule. 6 px is two pixels of relief
 *  rather than a new rhythm: enough that the rule stops touching the date,
 *  short of the air that would cost a ninety-row scroll a whole day. The
 *  bottom keeps the 4 px, and not out of thrift — a fixed list row is taller
 *  than its own contents, so the air under the last name is that 4 px plus
 *  whatever the row has left over, and the planner prints its holiday along
 *  the bottom edge where the same 4 px is the gap the caption already had.
 *
 *  Both carry the room factor, like every other measured length here: the row
 *  they space is set larger on a bigger screen (`roomScale.ts`) and its height
 *  grows with it, so a gap held at the phone's 6 px would be the same crowding
 *  one size up. */
export const STRIP_ROW_PAD =
  "pt-[calc(0.375rem*var(--cal-room,1))] pb-[calc(0.25rem*var(--cal-room,1))]";

/** The week rule's thickness — the heavier line `cal-strip-break` draws across
 *  the strip where one week ends and the next begins.
 *
 *  A TypeScript handle on a length the stylesheet owns, because one thing has
 *  to do arithmetic on it: the day list opens on today's week and takes that
 *  row's rule up *behind* the pinned heading, which is this much further than
 *  the band's own edge (`LIST_HOME_TUCK`). `tests/layout_test.ts` holds the
 *  two to the same number. */
export const WEEK_RULE_WIDTH = "1.5px";

/** Everything a row prints, and the arrangement it prints it in. The views
 *  hand this straight down from what they already resolved per day. */
export type StripDay = {
  layout: StripLayout;
  dayKey: DayKey;
  /** The day of the month, as printed. */
  day: number;
  pack: LocalePack;
  weekday: number;
  /** The day's names, already resolved (empty when the pack prints none). */
  names: readonly string[];
  /** The day's holiday, or null. */
  holiday: Holiday | null;
  /** The week this day opens, or `null` on a day that opens none (and on a
   *  country that prints no week numbers). */
  weekNumber: number | null;
  weekFormat: WeekFormat;
  red: boolean;
  /** The stroke over the date, for the `date` scope of the passed-day mark. */
  markDate: PastMarkStyle;
  /** What the date is set at — the view's own base, which the day-number
   *  scale then multiplies. The week planner makes this a setting; the day
   *  list, whose row is a line rather than a band, keeps its own. */
  dateBase: string;
  /** The heading band's colour, which the week number is printed in — `null`
   *  for the page's own ink. */
  ink: string | null;
  /** Whether the lane prints the day's ordinal in its year (1–366). Both
   *  strip views read the one setting — it is the same gloss on the same
   *  row. */
  showDayOfYear?: boolean;
  onOpenNames: (name: string) => void;
  onOpenHolidays: () => void;
  /** Tapping the week number opens the week list on this week — the same
   *  "the thing you are asking about is the way in" as the two above. */
  onOpenWeeks: (day: DayKey) => void;
};

/** A row's contents: the two margins, the note between (or around) them, and
 *  the band along the bottom edge that the rail's lower end prints in.
 *
 *  `lane` and `rail` are the period's answer to whether each margin is worth
 *  drawing at all (`marginReserved`) — decided once for a whole week or month,
 *  because a margin that came and went would move the note's edge on every
 *  row.
 *
 *  `flow` is the arrangement (see the file header), and inside a reserved
 *  margin it decides one more thing: whether the *pieces* are per day. Flowing,
 *  the rail's top end is drawn only on the days that print something there — a
 *  week number where a week opens — and the other six days get their first
 *  lines back, because an absent float costs nothing. In a column it is drawn
 *  whenever the margin is reserved, empty or not: a column that came and went
 *  is exactly the moving edge `marginReserved` exists to prevent, one piece
 *  further down. */
export function StripBody({
  day,
  lane,
  rail,
  flow,
  children,
}: {
  day: StripDay;
  lane: boolean;
  rail: boolean;
  /** Whether the note flows under the margins, or keeps the column between
   *  them (`stripNoteFlow`). */
  flow: boolean;
  children: ReactNode;
}) {
  const head = rail ? printedIn(day, "rail-top") : [];
  const tail = rail ? printedIn(day, "rail-bottom") : [];

  return (
    <>
      {/* The body. Flowing, it is a `flow-root` so the margins are *inside*
          it — a block that lets its floats hang out of the bottom would let
          the lane print over the row below it on a row that grows with its
          text. In a column it is simply the flex row the two arrangements
          replaced each other from. */}
      <div
        className={`cal-strip-body min-h-0 min-w-0 flex-1 ${
          flow ? "cal-strip-body-flow" : "cal-strip-body-column"
        }`}
      >
        {lane && <StripLane day={day} />}
        {(flow ? head.length > 0 : rail) && (
          <StripRail day={day} pieces={head} steady={!flow} />
        )}
        <StripNote>{children}</StripNote>
      </div>
      {tail.length > 0 && <StripTail day={day} pieces={tail} />}
    </>
  );
}

/** The lane on the left: whichever pieces are parked in it, with the date in a
 *  column of its own at the head of the row.
 *
 *  The lane is a *width*, not a shrink-wrap: ragged left edges on the writing
 *  area would read as a column per row rather than as one board. `--cal-lane`
 *  is the room the stack beside the date gets, and 88 px is what the longest
 *  run of names needs to hold two lines; a lane printing no names has nothing
 *  that wide to set, so it gets the measured floor and nothing more and the
 *  note gets the difference back. The date's own column and the year-day
 *  number's are added to those in `src/styles.css`, each scaled by its own
 *  size setting rather than by the names' — and each zeroed here when the
 *  piece it pays for is printed in the other margin instead.
 *
 *  Its *height* is only what it prints, because it is floated: the note runs
 *  beside the two or three lines the lane sets and then takes the width back
 *  underneath them. */
function StripLane({ day: d }: { day: StripDay }) {
  const dateHere = inMargin(d.layout, "lane", "day");
  const namesHere =
    inMargin(d.layout, "lane", "nameDays") && d.names.length > 0;
  const stack = laneStack(d.layout);
  const showDayOfYear = d.showDayOfYear ?? false;

  return (
    <div
      style={
        {
          // Both are lengths the stylesheet multiplies, so a margin that does
          // not print the piece has to zero the term rather than drop it.
          "--cal-date": dateHere ? d.dateBase : "0rem",
          "--cal-lane-floor": dateHere ? "4.25rem" : "0rem",
        } as CSSProperties
      }
      className={`cal-strip-lane flex items-start gap-1.5 leading-tight ${
        // The wide pair once the lane carries a caption to set; the measured
        // weekday floor otherwise.
        namesHere || inMargin(d.layout, "lane", "holidays")
          ? "[--cal-lane:5.5rem] sm:[--cal-lane:7rem]"
          : "[--cal-lane:4.25rem] sm:[--cal-lane:5.5rem]"
      } ${showDayOfYear ? "[--cal-lane-extra:1.375rem]" : ""}`}
    >
      {/* The date sits in a column wide enough for the widest day the face
          has to set, and is right-aligned inside it. The width is a column
          rather than a shrink-wrap because the weekday and the day's names
          line up beside it down a whole month: left-aligned digits pulled
          every single-digit row's weekday half a number to the left, which
          reads as a ragged edge rather than as a narrow date. So a
          single-digit row simply carries more air after its number than a
          two-digit one does — that is the column being kept, not padding
          being spent.

          How wide that is comes from the face (`DATE_COLUMN_EM` in
          `fonts.ts`, billed to the lane as `--cal-date-col`) and is floored
          at the two digits the *resolved* face actually measures — see
          `.cal-strip-date`. It carries the date's own face and size for two
          reasons: `ch` is only the digit's width if the box is set in the type
          it is holding, and the cap-trim that lines the number up with the
          weekday beside it measures the same box. */}
      {dateHere && (
        <div className="cal-strip-date cal-font-day cal-size-day shrink-0 text-right leading-none [--cal-base:var(--cal-date,1.5rem)]">
          <DateNumber day={d} />
        </div>
      )}
      <div className="cal-strip-names flex min-w-0 flex-1 flex-col">
        {/* The weekday travels with the date: "Mon" on its own is not a piece
            a calendar prints. */}
        {dateHere && <Weekday day={d} />}
        {stack.map((piece) => (
          <div key={piece} className="mt-0.5 min-w-0">
            {piecePart(piece, d)}
          </div>
        ))}
      </div>
      {/* The day's ordinal in the year, printed the way the strip calendar
          does: small, grey, hard against the lane's right edge, where it is
          available to be counted from and invisible until it is wanted. It
          stays in the lane whatever the arrangement — it is a gloss on the
          date rather than a piece of the almanac — and is sized off the week
          number's scale, the two being the same kind of marginal number. */}
      {showDayOfYear && (
        <span className="cal-font-week cal-size-week text-muted shrink-0 pt-1 leading-none [--cal-base:9px]">
          {dayOfYear(d.dayKey) || ""}
        </span>
      )}
    </div>
  );
}

/** The rail on the right: whichever pieces are parked at its top end, floated
 *  so the note runs beside them and then under them.
 *
 *  Everything here is the almanac talking rather than the day, which is why
 *  the rail sits outside the writing area instead of floating over it. It is a
 *  width rather than a shrink-wrap for the reason the lane is one — "Vecka 34"
 *  and "w 34" are not the same length, and a right edge that moved with the
 *  wording would read as a different column per row. */
function StripRail({
  day: d,
  pieces,
  steady,
}: {
  day: StripDay;
  /** The pieces to print, already filtered to the ones this day has. */
  pieces: StripPiece[];
  /** Whether the width is the *period's* question rather than this day's —
   *  which it is wherever the rail is a column, because a column whose width
   *  followed what one day happened to print would move the note's right edge
   *  from row to row. Flowing, the rail is only as wide as what it holds, so
   *  the day's own pieces answer. */
  steady: boolean;
}) {
  const dateHere = steady
    ? inMargin(d.layout, "rail", "day")
    : pieces.includes("day");
  // A rail holding a caption needs more than the two digits of a week number.
  const wide = steady
    ? inMargin(d.layout, "rail", "nameDays") || dateHere
    : pieces.includes("nameDays") || dateHere;

  return (
    <div
      // The size the view sets the date at follows the date into whichever
      // margin it is printed in; the lane publishes the same property.
      style={
        dateHere ? ({ "--cal-date": d.dateBase } as CSSProperties) : undefined
      }
      className={`cal-strip-rail flex flex-col items-end text-right ${
        // The room factor multiplies it in `src/styles.css` — these are the
        // widths a phone's week number and holiday need, and a screen that
        // prints them larger needs the margin larger or "Vecka 34" comes back
        // on two lines.
        wide
          ? "[--cal-rail:6rem] sm:[--cal-rail:8rem]"
          : "[--cal-rail:4rem] sm:[--cal-rail:6rem]"
      }`}
    >
      {pieces.map((piece) => (
        <div key={piece} className="min-w-0">
          {piecePart(piece, d)}
        </div>
      ))}
    </div>
  );
}

/** The rail's bottom end, printed along the row's bottom edge — which is where
 *  a printed almanac sets a holiday's name.
 *
 *  A band rather than the foot of a column, in *both* arrangements: flowing,
 *  the rail above is only as tall as the week number it holds, so there is no
 *  column left to push anything to the bottom of — and having it be the same
 *  band in a column keeps the two arrangements one layout with a float
 *  switched on rather than two to maintain. It takes the row's width and stays
 *  right-aligned, so the holiday is in the corner it has always been printed
 *  in, and it is only drawn on the days that have something to print there —
 *  an ordinary day keeps the line for the note. */
function StripTail({
  day: d,
  pieces,
}: {
  day: StripDay;
  pieces: StripPiece[];
}) {
  const dateHere = pieces.includes("day");
  return (
    <div
      style={
        dateHere ? ({ "--cal-date": d.dateBase } as CSSProperties) : undefined
      }
      className="cal-strip-tail flex shrink-0 flex-wrap items-end justify-end gap-x-2 text-right"
    >
      {pieces.map((piece) => (
        <div key={piece} className="min-w-0">
          {piecePart(piece, d)}
        </div>
      ))}
    </div>
  );
}

/** A day's writing surface. Just the box — the entry itself stays the view's,
 *  because what it is measured against (a band the view fixed, or a line that
 *  grows) is the difference between the two.
 *
 *  In a column it is the flex item between the two margins. Flowing, it is the
 *  row's *full* width and the margins beside it are floats, so it is the
 *  *lines* that make room for them rather than the box — which is why it must
 *  not become a formatting context of its own there (no `overflow`, no flex):
 *  a box that did would be pushed clear of the floats whole, back to the third
 *  of the row that arrangement exists to give up. */
function StripNote({ children }: { children: ReactNode }) {
  return <div className="cal-strip-note">{children}</div>;
}

/** The pieces one slot prints *on this day* — the arrangement's answer
 *  (`piecesPrinted`) asked of what this day has. */
function printedIn(
  d: StripDay,
  slot: "rail-top" | "rail-bottom",
): StripPiece[] {
  return piecesPrinted(d.layout, slot, {
    day: true,
    nameDays: d.names.length > 0,
    holidays: d.holiday !== null,
    week: d.weekNumber !== null,
  });
}

/** The pieces the lane stacks beside the date, top end before bottom end. The
 *  date is not among them: it is the column they are set beside. */
function laneStack(layout: StripLayout): StripPiece[] {
  return piecesInMargin(layout, "lane").filter((piece) => piece !== "day");
}

/** One piece, as the margins print it. The date is the one that differs by
 *  margin — in the lane it is a column with the weekday beside it, in the rail
 *  it is a two-line block — so it is assembled here rather than passed in. */
function piecePart(piece: StripPiece, d: StripDay): ReactNode {
  switch (piece) {
    case "day":
      // In the rail there is no column to line a month of weekdays up
      // against — the rail is already a width — so the date simply carries
      // its own type and stacks with its weekday.
      return (
        <div className="cal-font-day cal-size-day flex flex-col items-end leading-none [--cal-base:var(--cal-date,1.5rem)]">
          <DateNumber day={d} />
          <Weekday day={d} />
        </div>
      );
    case "nameDays":
      return d.names.length > 0 ? <Names day={d} /> : null;
    case "holidays":
      return d.holiday ? <HolidayName day={d} holiday={d.holiday} /> : null;
    case "week":
      return d.weekNumber !== null ? <WeekMark day={d} /> : null;
  }
}

/** Just the digits and the stroke that may cross them. The type is set on the
 *  box around it — in the lane that box is the measured column
 *  (`.cal-strip-date`), and both `ch` and the cap-trim need the type to be on
 *  the box they measure. */
function DateNumber({ day: d }: { day: StripDay }) {
  return (
    <MarkedDate style={d.markDate}>
      <span className={d.red ? "cal-red" : "text-fg"}>{d.day}</span>
    </MarkedDate>
  );
}

function Weekday({ day: d }: { day: StripDay }) {
  return (
    <span
      className={`cal-strip-weekday cal-serif leading-none ${
        d.red ? "cal-red" : "text-muted"
      }`}
    >
      {weekdayName(d.pack, d.weekday)}
    </span>
  );
}

function Names({ day: d }: { day: StripDay }) {
  return (
    <span className="cal-font-nameday cal-size-nameday text-muted block [--cal-base:10px]">
      {/* Every name is also the way into the name-day search. */}
      <NameDayNames names={d.names} pack={d.pack} onOpen={d.onOpenNames} />
    </span>
  );
}

/** Also the way into the holidays screen — see the same tap target in the
 *  month view. */
function HolidayName({ day: d, holiday }: { day: StripDay; holiday: Holiday }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        d.onOpenHolidays();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        d.onOpenHolidays();
      }}
      className={`cal-font-holiday cal-size-holiday cal-strip-holiday block cursor-pointer leading-tight [--cal-base:11px] focus-visible:outline-2 ${
        holiday.red ? "cal-red" : "text-muted"
      }`}
    >
      {holiday.name}
    </span>
  );
}

/** Also the way into the week list, the way a holiday's name is the way into
 *  the holidays screen. */
function WeekMark({ day: d }: { day: StripDay }) {
  const t = useT();
  const n = d.weekNumber ?? 0;
  const open = () => d.onOpenWeeks(d.dayKey);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        open();
      }}
      className={`cal-font-week cal-size-week block cursor-pointer leading-none italic [--cal-base:0.875rem] focus-visible:outline-2 ${
        d.ink ? "" : "text-fg"
      }`}
      style={d.ink ? { color: d.ink } : undefined}
      // Spelled out for a screen reader whatever the margin prints — "34" on
      // its own is a number, not a week — and saying what pressing it does,
      // since it is a button rather than a caption.
      aria-label={t("weeks.open", { n })}
    >
      {weekNumberLabel(d.weekFormat, n, {
        long: t("topbar.week", { n }),
        mark: t("topbar.weekMark", { n }),
      })}
    </span>
  );
}

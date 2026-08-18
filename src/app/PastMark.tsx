// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The pencil stroke over a day that has passed. Two pieces: the overlay
// itself, and the little box the `date` scope draws it in.
//
// The stroke is an SVG rather than a pair of borders or a gradient because a
// box's diagonal is not a CSS length: the mark has to run corner to corner in
// a month cell (tall), a week-planner row (wide) and around a two-digit date
// (nearly square), all from the same declaration. A `0 0 100 100` viewBox
// with `preserveAspectRatio="none"` stretches to whatever box it is dropped
// into, and `vector-effect="non-scaling-stroke"` keeps the line the same
// weight while it does — otherwise the stretch that fits the box would also
// smear the stroke.
//
// The geometry comes from `pastDays.ts`, which is also what the tests read.

import type { ReactNode } from "react";

import { markLines, type PastMarkStyle } from "./pastDays.ts";

/** The stroke, drawn over the nearest positioned ancestor — so whatever
 *  carries it must be `relative`. Decorative: the day's date is still there
 *  to read, and a screen reader gains nothing from "line, line". */
export function PastMark({
  style,
  strokeWidth = 1.25,
  className = "",
}: {
  style: PastMarkStyle;
  /** The pen's weight, in CSS pixels (the stroke does not scale). */
  strokeWidth?: number;
  className?: string;
}) {
  const lines = markLines(style);
  if (lines.length === 0) return null;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`cal-past-mark pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {lines.map((line) => (
        <line
          key={`${line.x1},${line.y1},${line.x2},${line.y2}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/** The `date` scope's box: the date with the stroke over it and nothing
 *  else. Inline-block so it shrink-wraps the digits — a cross over the day
 *  number's whole lane would be the cell's mark drawn small, not a date
 *  crossed out. The wrapper is rendered whether or not the day is marked, so
 *  turning the setting on doesn't shift a single digit. */
export function MarkedDate({
  style,
  children,
}: {
  /** The stroke to draw, or `"none"` for an unmarked day. */
  style: PastMarkStyle;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-block">
      {children}
      {/* The box the stroke is drawn in overhangs the digits sideways, and
          is what makes a crossed-out date look crossed out: the stroke
          stretches with its box, so over a single digit — a tall, narrow box
          — an unhelped cross comes out as a steep hourglass rather than an ✕.
          The overhang is in `em`, so it follows the date's own size, and it
          is also simply what a pen does: a mark drawn over a number runs past
          it. Vertically the em box is already taller than the digits, so only
          the sides need it. */}
      <span className="pointer-events-none absolute -inset-x-[0.3em] inset-y-0">
        {/* A date is a small box, so its stroke is drawn a touch heavier than
            the one that crosses a whole cell — a hairline over two digits
            reads as an artefact rather than a mark. */}
        <PastMark style={style} strokeWidth={1.5} />
      </span>
    </span>
  );
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab's remaining questions, once "how is a day printed" has been
// answered per view next door (`ViewStyleSection`): whether the days that have
// gone are crossed off, how tall a row is in the two views that can grow one,
// what the week planner prints in its margin, and what colour the heading is
// banded with.
//
// What these have in common is that none of them is a typographic choice about
// a piece of a day — they are the calendar's own behaviour — which is why they
// did not follow the cell's arrangement, faces and sizes into the View
// section.
//
// How you move between periods is not among them any more. It used to be the
// first question here, and the answer is now the app's rather than the
// reader's: a swipe up or down turns the period, a swipe left or right turns
// the view (`SwipeDeck`). Two axes, both spoken for, and nothing left to
// choose between.
//
// Part of the previewed look — the edits stream to the calendar behind the
// dialog and are only written on Save.

import {
  Field,
  Section,
  SegmentedControl,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";

import {
  HEADER_COLORS,
  HEADER_COLOR_HEX,
  type HeaderColor,
} from "../headerColor.ts";
import { useT, type MessageKey } from "../i18n/index.ts";
import {
  PAST_MARK_SCOPES,
  PAST_MARK_STYLES,
  type PastMarkScope,
  type PastMarkStyle,
} from "../pastDays.ts";
import {
  headerColorFor,
  pastMarkOf,
  weekDateSizeFor,
  weekFormatFor,
  weekRowsOf,
  type ListRowMode,
  type LookSettings,
} from "../useAppSettings.ts";
import {
  WEEK_DATE_SIZES,
  WEEK_FORMATS,
  weekNumberLabel,
  type WeekDateSize,
  type WeekFormat,
  type WeekRowMode,
} from "../weekPlanner.ts";

type UpdateLook = <K extends keyof LookSettings>(
  key: K,
  value: LookSettings[K],
) => void;

const HEADER_COLOR_LABELS: Record<HeaderColor, MessageKey> = {
  none: "settings.headerColorNone",
  red: "settings.headerColorRed",
  blue: "settings.headerColorBlue",
  green: "settings.headerColorGreen",
  plum: "settings.headerColorPlum",
  ochre: "settings.headerColorOchre",
};

/** The four steps the week strip's date is set at. The three the rest of the
 *  app uses, plus the wall-planner one this view alone has the height for. */
const WEEK_DATE_LABELS: Record<WeekDateSize, MessageKey> = {
  small: "settings.textSizeSmall",
  medium: "settings.textSizeMedium",
  large: "settings.textSizeLarge",
  huge: "settings.textSizeHuge",
};

const PAST_MARK_LABELS: Record<PastMarkStyle, MessageKey> = {
  none: "settings.pastMarkNone",
  cross: "settings.pastMarkCross",
  slash: "settings.pastMarkSlash",
};

const PAST_SCOPE_LABELS: Record<PastMarkScope, MessageKey> = {
  cell: "settings.pastMarkScopeCell",
  date: "settings.pastMarkScopeDate",
};

/** The week the format buttons are labelled with — two digits, so the widest
 *  of the three labels is the widest it will ever be. */
const SAMPLE_WEEK = 34;

export function CalendarSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();
  // Snapped back onto the known values on the way in — the stroke is drawn
  // from it, and a hand-edited setting must not reach a `style` attribute.
  const pastMark = pastMarkOf(look);

  return (
    <>
      {/* Crossing off what has gone. Off by default: a calendar you have
        written on is a preference, not an improvement. */}
      <Section title={t("settings.pastDays")}>
        <p className="text-muted text-xs">{t("settings.pastDaysHint")}</p>

        <Field label={t("settings.pastMark")}>
          <SegmentedControl<PastMarkStyle>
            value={pastMark.style}
            onChange={(next) => onUpdate("pastMark", next)}
            ariaLabel={t("settings.pastMark")}
            options={PAST_MARK_STYLES.map((style) => ({
              value: style,
              label: t(PAST_MARK_LABELS[style]),
            }))}
          />
        </Field>

        {/* Only once there is a mark to place: with the stroke off, "whole
          day or the date" is a question about nothing. */}
        {pastMark.style !== "none" && (
          <Field label={t("settings.pastMarkScope")}>
            <SegmentedControl<PastMarkScope>
              value={pastMark.scope}
              onChange={(next) => onUpdate("pastMarkScope", next)}
              ariaLabel={t("settings.pastMarkScope")}
              options={PAST_MARK_SCOPES.map((scope) => ({
                value: scope,
                label: t(PAST_SCOPE_LABELS[scope]),
              }))}
            />
          </Field>
        )}
      </Section>

      {/* The two views whose rows can grow, kept on the Calendar tab beside
        the month cell rather than on a tab of their own. Two controls rather
        than one: a day-list row is one line of a ninety-row scroll, a week
        row is a seventh of the screen, and someone can reasonably want the
        one to grow and not the other. */}
      <Section title={t("settings.dayListRows")}>
        <Field label={t("settings.rows")}>
          <SegmentedControl<ListRowMode>
            value={look.listRows}
            onChange={(next) => onUpdate("listRows", next)}
            ariaLabel={t("settings.dayListRows")}
            options={[
              { value: "fixed", label: t("settings.rowsFixed") },
              { value: "dynamic", label: t("settings.rowsDynamic") },
            ]}
          />
          <p className="text-muted text-xs">{t("settings.dayListRowsHint")}</p>
        </Field>
      </Section>

      {/* The week strip. */}
      <Section title={t("settings.weekPlanner")}>
        <p className="text-muted text-xs">{t("settings.weekPlannerHint")}</p>

        <ToggleRow
          label={t("settings.weekDayOfYear")}
          hint={t("settings.weekDayOfYearHint")}
          checked={look.weekDayOfYear}
          onChange={(next) => onUpdate("weekDayOfYear", next)}
        />

        {/* The date's size, in the strip's own steps rather than on the shared
          ladder: a week row is four times a month cell's height, so it can
          carry a wall-planner date that would not fit anywhere else. */}
        <Field label={t("settings.weekDateSize")}>
          <SegmentedControl<WeekDateSize>
            value={weekDateSizeFor(look)}
            onChange={(next) => onUpdate("weekDateSize", next)}
            ariaLabel={t("settings.weekDateSize")}
            options={WEEK_DATE_SIZES.map((size) => ({
              value: size,
              label: t(WEEK_DATE_LABELS[size]),
            }))}
          />
        </Field>

        {/* The three ways of printing a week number, each option labelled with
          what it actually prints — the question is what you want to read in
          the margin, so the answer is shown rather than described. */}
        <Field label={t("settings.weekFormat")}>
          <SegmentedControl<WeekFormat>
            value={weekFormatFor(look)}
            onChange={(next) => onUpdate("weekFormat", next)}
            ariaLabel={t("settings.weekFormat")}
            options={WEEK_FORMATS.map((format) => ({
              value: format,
              label: weekNumberLabel(format, SAMPLE_WEEK, {
                long: t("topbar.week", { n: SAMPLE_WEEK }),
                mark: t("topbar.weekMark", { n: SAMPLE_WEEK }),
              }),
            }))}
          />
          <p className="text-muted text-xs">{t("settings.weekFormatHint")}</p>
        </Field>

        <Field label={t("settings.rows")}>
          <SegmentedControl<WeekRowMode>
            value={weekRowsOf(look)}
            onChange={(next) => onUpdate("weekRows", next)}
            ariaLabel={t("settings.weekRows")}
            options={[
              { value: "fixed", label: t("settings.rowsFixed") },
              { value: "dynamic", label: t("settings.rowsDynamic") },
            ]}
          />
          <p className="text-muted text-xs">{t("settings.weekRowsHint")}</p>
        </Field>
      </Section>

      {/* The masthead. It bands every view's heading, not only the week
        planner's, so it sits in a section of its own — but it is the week
        planner that spends it twice, printing its week numbers in the same
        ink. */}
      <Section title={t("settings.heading")}>
        <p className="text-muted text-xs">{t("settings.headingHint")}</p>

        <Field label={t("settings.headerColor")}>
          <div
            role="radiogroup"
            aria-label={t("settings.headerColor")}
            className="flex flex-wrap gap-2"
          >
            {HEADER_COLORS.map((color) => {
              const active = headerColorFor(look) === color;
              const hex = color === "none" ? null : HEADER_COLOR_HEX[color];
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t(HEADER_COLOR_LABELS[color])}
                  onClick={() => onUpdate("headerColor", color)}
                  className={`h-9 w-9 cursor-pointer rounded border-2 transition-colors focus-visible:outline-2 ${
                    active ? "border-fg" : "border-line hover:border-accent"
                  }`}
                  // The swatch *is* the colour, so it is painted rather than
                  // labelled; "off" is the page's own ground with a slash
                  // through it, the way a colour picker draws "no colour".
                  style={
                    hex
                      ? { background: hex }
                      : {
                          background:
                            "linear-gradient(135deg, var(--page-bg) 0 45%, var(--line) 45% 55%, var(--page-bg) 55% 100%)",
                        }
                  }
                />
              );
            })}
          </div>
        </Field>
      </Section>
    </>
  );
}

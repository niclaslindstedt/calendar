// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Calendar tab's country-specific section: which of the country's holiday
// eves you actually work.
//
// It is the one settings group whose *contents* change with the country
// rather than just its values — Sweden brings seven eves, the UK brings none
// and the section disappears entirely. That is deliberate: an eve is not a
// fact about the calendar, it is a fact about the collective agreement where
// you work, and a country without that tradition has nothing to ask about.
//
// The shipped answers are what most of the country's agreements say
// (`Eve.collective`), so a reader who never opens this gets the common case.
// Choosing the default again clears the override rather than pinning it, so
// "unset" keeps meaning "whatever the agreements say" — the same rule the
// week-number and name-day toggles follow with their `null`.

import {
  Button,
  Field,
  Section,
  SegmentedControl,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type MessageKey } from "../i18n/index.ts";
import {
  EVE_STATUSES,
  eveStatus,
  getLocale,
  hasEveOverrides,
  monthName,
  type Eve,
  type EveStatus,
  type LocalePack,
} from "../locale/index.ts";
import { eveChoices, type LookSettings } from "../useAppSettings.ts";

type UpdateLook = <K extends keyof LookSettings>(
  key: K,
  value: LookSettings[K],
) => void;

const STATUS_LABELS: Record<EveStatus, MessageKey> = {
  off: "settings.eveOff",
  half: "settings.eveHalf",
  work: "settings.eveWork",
};

/** "24 dec" — the eve's date this year, printed beside its name.
 *
 *  Worth the room: four of the seven Swedish eves hang off a movable holiday,
 *  and "Allhelgonaafton" alone does not tell anyone which Friday it is. The
 *  year is the current one rather than the one on display behind the dialog,
 *  because this is an example of where the day falls, not a date you act on. */
function dateLabel(pack: LocalePack, eve: Eve, year: number): string {
  const at = eve.date(year);
  return `${at.day} ${monthName(pack, at.month, "short")}`;
}

export function EvesSection({
  look,
  onUpdate,
}: {
  look: LookSettings;
  onUpdate: UpdateLook;
}) {
  const t = useT();
  const pack = getLocale(look.localeId);
  const choices = eveChoices(look);
  const year = new Date().getFullYear();

  // A country with no eve tradition gets no section at all, rather than an
  // empty box explaining that there is nothing here.
  if (pack.eves.length === 0) return null;

  const choose = (eve: Eve, status: EveStatus) => {
    const next: Record<string, EveStatus> = { ...choices };
    // Back to the collective answer means "no answer of my own" — so a later
    // build that corrects a default reaches this reader too.
    if (status === eve.collective) delete next[eve.id];
    else next[eve.id] = status;
    onUpdate("eveDays", next);
  };

  const overridden = hasEveOverrides(pack.eves, choices);

  return (
    <Section title={t("settings.eves")}>
      <p className="text-muted text-xs">{t("settings.evesHint")}</p>

      {pack.eves.map((eve) => (
        <Field
          key={eve.id}
          label={`${eve.name} · ${dateLabel(pack, eve, year)}`}
        >
          <SegmentedControl<EveStatus>
            value={eveStatus(eve, choices)}
            onChange={(next) => choose(eve, next)}
            ariaLabel={eve.name}
            fullWidth
            options={EVE_STATUSES.map((status) => ({
              value: status,
              label: t(STATUS_LABELS[status]),
            }))}
          />
        </Field>
      ))}

      {/* Only offered once there is something to undo: on a fresh install the
          section already *is* the agreements, and a live "reset" button that
          does nothing reads as a setting you have somehow got wrong. */}
      {overridden ? (
        <Button
          variant="secondary"
          onClick={() => onUpdate("eveDays", {})}
          className="mt-3 w-full py-2"
        >
          {t("settings.evesReset")}
        </Button>
      ) : (
        <p className="text-muted mt-3 text-xs">{t("settings.evesFollowing")}</p>
      )}
    </Section>
  );
}

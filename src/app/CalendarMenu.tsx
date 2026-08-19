// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The calendar switcher in the top menu. The sibling `contacts` app puts this
// in its sidebar; a wall calendar has no sidebar — the whole screen is the
// month — so it lives where the "Today" button used to, as a 36 px button
// carrying the active calendar's glyph in its colour. Which calendar you are
// writing in is a thing you must be able to see without opening anything, and
// the glyph is the only always-visible carrier of it.
//
// Tapping it drops a list of the calendars plus a way into the framework's
// management dialog; the dialog itself is `NamespacesModal`, opened by
// `App.tsx` (a dialog over the whole app doesn't belong inside a menu that
// closes when you pick from it).

import { useRef, useState } from "react";

import {
  CalendarIcon,
  CheckIcon,
  CogIcon,
  FloatingPanel,
} from "@niclaslindstedt/oss-framework/components";
import { Glyph } from "@niclaslindstedt/oss-framework/glyphs";

import { TopBarIconButton } from "./TopBarButton.tsx";
import { useT } from "./i18n/index.ts";
import type { Calendar } from "./useCalendars.ts";

/** A calendar's mark: the glyph it chose, tinted with the colour it chose. A
 *  calendar that chose neither falls back to the app's own mark rather than
 *  the glyph catalogue's default folder — this is a calendar, and an
 *  un-badged one is just "the calendar". */
function CalendarGlyph({
  calendar,
  className,
}: {
  calendar: Calendar;
  className?: string;
}) {
  return (
    <Glyph
      name={calendar.glyph}
      className={className}
      style={calendar.color ? { color: calendar.color } : undefined}
      fallback={<CalendarIcon className={className} />}
    />
  );
}

type Props = {
  calendars: Calendar[];
  activeSlug: string;
  onSwitch: (slug: string) => void;
  /** Open the management dialog (create / rename / restyle / delete). */
  onManage: () => void;
};

export function CalendarMenu({
  calendars,
  activeSlug,
  onSwitch,
  onManage,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = calendars.find((c) => c.slug === activeSlug) ?? calendars[0]!;

  const pick = (slug: string) => {
    setOpen(false);
    if (slug !== activeSlug) onSwitch(slug);
  };

  return (
    <>
      <TopBarIconButton
        label={t("calendars.switcher", { name: active.name })}
        buttonRef={triggerRef}
        expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <CalendarGlyph calendar={active} className="h-[18px] w-[18px]" />
      </TopBarIconButton>

      <FloatingPanel
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        // Anchored under the button on the left, and allowed to grow with the
        // longest name — a calendar called "Sommarstugan" must not wrap in a
        // 393 px portrait window.
        placement={{
          width: { kind: "grow", minPx: 176 },
          anchor: "left",
          coordinateSpace: "viewport",
        }}
        className="py-1"
      >
        <div role="menu" aria-label={t("calendars.menu")}>
          {calendars.map((calendar) => {
            const current = calendar.slug === activeSlug;
            return (
              <button
                key={calendar.slug}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => pick(calendar.slug)}
                className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-fg hover:bg-surface-3"
              >
                <CalendarGlyph
                  calendar={calendar}
                  className="h-4 w-4 shrink-0"
                />
                <span className="flex-1 truncate">{calendar.name}</span>
                {current && (
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                )}
              </button>
            );
          })}

          <div className="my-1 border-t border-line" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-muted hover:bg-surface-3 hover:text-fg"
          >
            <CogIcon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{t("calendars.manage")}</span>
          </button>
        </div>
      </FloatingPanel>
    </>
  );
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The namespace switcher in the top menu. The sibling `contacts` app puts
// this in its sidebar; a wall calendar has no sidebar — the whole screen is
// the month — so it lives where the "Today" button used to, as a 36 px button
// carrying the active namespace's glyph in its colour. Which calendar you are
// writing in is a thing you must be able to see without opening anything,
// and the glyph is the only always-visible carrier of it.
//
// Tapping it drops a list of the namespaces plus a way into the framework's
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
import type { Namespace } from "@niclaslindstedt/oss-framework/namespaces";

import { TopBarIconButton } from "./TopBarButton.tsx";
import { useT } from "./i18n/index.ts";

/** A namespace's mark: the glyph it chose, tinted with the colour it chose.
 *  A namespace that chose neither falls back to the app's own mark rather
 *  than the glyph catalogue's default folder — this is a calendar, and an
 *  un-badged namespace is just "the calendar". */
function NamespaceGlyph({
  namespace,
  className,
}: {
  namespace: Namespace;
  className?: string;
}) {
  return (
    <Glyph
      name={namespace.glyph}
      className={className}
      style={namespace.color ? { color: namespace.color } : undefined}
      fallback={<CalendarIcon className={className} />}
    />
  );
}

type Props = {
  namespaces: Namespace[];
  activeSlug: string;
  onSwitch: (slug: string) => void;
  /** Open the management dialog (create / rename / restyle / delete). */
  onManage: () => void;
};

export function NamespaceMenu({
  namespaces,
  activeSlug,
  onSwitch,
  onManage,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active =
    namespaces.find((n) => n.slug === activeSlug) ?? namespaces[0]!;

  const pick = (slug: string) => {
    setOpen(false);
    if (slug !== activeSlug) onSwitch(slug);
  };

  return (
    <>
      <TopBarIconButton
        label={t("namespaces.switcher", { name: active.name })}
        buttonRef={triggerRef}
        expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <NamespaceGlyph namespace={active} className="h-[18px] w-[18px]" />
      </TopBarIconButton>

      <FloatingPanel
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        // Anchored under the button on the left, and allowed to grow with the
        // longest name — a namespace called "Sommarstugan" must not wrap in a
        // 393 px portrait window.
        placement={{
          width: { kind: "grow", minPx: 176 },
          anchor: "left",
          coordinateSpace: "viewport",
        }}
        className="py-1"
      >
        <div role="menu" aria-label={t("namespaces.menu")}>
          {namespaces.map((namespace) => {
            const current = namespace.slug === activeSlug;
            return (
              <button
                key={namespace.slug}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => pick(namespace.slug)}
                className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-fg hover:bg-surface-3"
              >
                <NamespaceGlyph
                  namespace={namespace}
                  className="h-4 w-4 shrink-0"
                />
                <span className="flex-1 truncate">{namespace.name}</span>
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
            <span className="flex-1 truncate">{t("namespaces.manage")}</span>
          </button>
        </div>
      </FloatingPanel>
    </>
  );
}

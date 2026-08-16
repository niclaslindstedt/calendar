// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Settings dialog's navigation chrome, kept apart from the dialog body:
// the header (a burger menu on mobile, the cog + title on desktop, and the
// close button) and the desktop tab rail. Ported from the sibling `notes`
// app so both dialogs navigate identically.

import { useRef, useState, type ComponentType } from "react";

import {
  CloseIcon,
  CogIcon,
  MenuIcon,
} from "@niclaslindstedt/oss-framework/components";

import { useT, type MessageKey } from "../i18n/index.ts";

type IconComponent = ComponentType<{ className?: string }>;

export type TabDef<Id extends string> = {
  id: Id;
  labelKey: MessageKey;
  Icon: IconComponent;
};

// Header. On mobile the burger + active-tab label form one toggle that opens
// the section menu; on desktop the sidebar owns selection and the header
// shows the static "Settings" title (the burger is hidden at `sm:` and up).
// The h2 stays mounted (sr-only on mobile) so `aria-labelledby` resolves.
export function SettingsHeader<Id extends string>({
  tabs,
  activeTab,
  onSelectTab,
  onClose,
}: {
  tabs: readonly TabDef<Id>[];
  activeTab: Id;
  onSelectTab: (id: Id) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeDef = tabs.find((tab) => tab.id === activeTab);
  const ActiveIcon = activeDef?.Icon ?? CogIcon;
  const activeLabel = activeDef ? t(activeDef.labelKey) : t("settings.title");

  return (
    <header className="relative flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t("settings.chooseSection")}
            className={`-ml-1 inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm font-bold tracking-wide text-fg-bright ${
              menuOpen
                ? "border-accent bg-accent/15"
                : "border-transparent hover:border-line hover:bg-surface-2"
            }`}
          >
            <MenuIcon className="h-[18px] w-[18px] text-muted" />
            <span className="inline-flex shrink-0 text-accent">
              <ActiveIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">{activeLabel}</span>
          </button>
          {menuOpen && (
            <>
              {/* Transparent catch-all that dismisses the menu on an outside
                  tap. `fixed` escapes the Modal card's `overflow-hidden`. */}
              <button
                type="button"
                aria-label={t("settings.closeSection")}
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="menu"
                className="absolute top-full left-0 z-50 mt-1 flex w-48 flex-col gap-0.5 rounded border border-line bg-surface-3 p-2 shadow-xl"
              >
                {tabs.map((tab) => {
                  const Icon = tab.Icon;
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="menuitem"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => {
                        onSelectTab(tab.id);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface ${
                        isActive ? "font-bold text-accent" : "text-fg"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t(tab.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <h2
          id="settings-title"
          className="sr-only text-sm font-bold tracking-wide text-fg-bright sm:not-sr-only"
        >
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex shrink-0 text-accent">
              <CogIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">{t("settings.title")}</span>
          </span>
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("settings.close")}
        className="-mr-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

// Desktop-only vertical tab rail (hidden below `sm`, where the burger takes
// over). A WAI-ARIA tablist with roving tabindex and arrow-key navigation;
// activation follows focus to match the mouse / touch behaviour.
export function TabSidebar<Id extends string>({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: readonly TabDef<Id>[];
  activeTab: Id;
  onSelect: (id: Id) => void;
}) {
  const t = useT();
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) {
    if (
      e.key !== "ArrowUp" &&
      e.key !== "ArrowDown" &&
      e.key !== "Home" &&
      e.key !== "End"
    )
      return;
    e.preventDefault();
    let next = idx;
    if (e.key === "ArrowUp") next = idx - 1;
    else if (e.key === "ArrowDown") next = idx + 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    const wrapped = (next + tabs.length) % tabs.length;
    const nextDef = tabs[wrapped];
    if (!nextDef) return;
    onSelect(nextDef.id);
    buttonRefs.current[nextDef.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label={t("settings.sections")}
      className="hidden w-40 shrink-0 flex-col gap-0.5 overflow-y-auto overscroll-contain border-r border-line bg-surface-3 p-2 sm:flex"
    >
      {tabs.map((tab, idx) => {
        const Icon = tab.Icon;
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-controls={`settings-tabpanel-${tab.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
              active
                ? "bg-accent/15 font-bold text-accent"
                : "text-fg hover:bg-surface-2"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Settings dialog, opened from the top bar's cogwheel. Modelled on the
// sibling `notes` app's settings modal: a left rail of labelled, icon-marked
// tabs on desktop, collapsed into a burger menu in the header on mobile, and
// a footer pinned below the content — Reset to defaults on the left, Cancel +
// Save on the right.
//
// The look settings the dialog owns (country calendar, the display toggles,
// the entry sizing, and the whole theme appearance) are edited against a
// local `draft` and only committed on Save: while open the draft streams to
// the app through `onPreview`, so the calendar behind the dialog previews
// live; Cancel drops it (the persisted look snaps back) and Save writes it.
// The device-local controls (UI language, developer mode, log capture, demo
// data) and the storage connections apply immediately — they are not part of
// the previewed look.
//
// Developer and Logs are diagnostic tabs gated behind developer mode:
// Developer appears once dev mode is on, and Logs only once log capture is
// turned on from there (turning dev mode off forces capture off, so the Logs
// tab can never outlive its data).

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  CalendarIcon,
  CodeIcon,
  DatabaseIcon,
  Modal,
  PaletteIcon,
  PencilIcon,
  ScrollTextIcon,
  SlidersIcon,
} from "@niclaslindstedt/oss-framework/components";
import type { ThemeAppearance } from "@niclaslindstedt/oss-framework/theme";
import type { PwaUpdateCheckResult } from "@niclaslindstedt/oss-framework/pwa";

import { useT, type TFunction } from "../i18n/index.ts";
import type { SaveState } from "../useCalendarStore.ts";
import type { BackendId } from "../storage/backends.ts";
import {
  DEFAULT_LOOK,
  pickLook,
  updateLook,
  type AppSettings,
  type LookSettings,
} from "../useAppSettings.ts";
import { AppearanceSection } from "./AppearanceSection.tsx";
import { CalendarSection } from "./CalendarSection.tsx";
import { DeveloperSection } from "./DeveloperSection.tsx";
import { EntriesSection } from "./EntriesSection.tsx";
import { GeneralSection } from "./GeneralSection.tsx";
import { LogsSection } from "./LogsSection.tsx";
import { StorageSection, type StorageActions } from "./StorageSection.tsx";
import { TabSidebar, SettingsHeader, type TabDef } from "./tabs.tsx";

export type { StorageActions };

/** The look being previewed while the dialog is open. */
export type SettingsDraft = {
  look: LookSettings;
  appearance: ThemeAppearance;
};

type TabId =
  | "general"
  | "appearance"
  | "calendar"
  | "entries"
  | "storage"
  | "developer"
  | "logs";

const BASE_TABS: readonly TabDef<TabId>[] = [
  { id: "general", labelKey: "settings.tabGeneral", Icon: SlidersIcon },
  { id: "appearance", labelKey: "settings.tabAppearance", Icon: PaletteIcon },
  { id: "calendar", labelKey: "settings.tabCalendar", Icon: CalendarIcon },
  { id: "entries", labelKey: "settings.tabEntries", Icon: PencilIcon },
  { id: "storage", labelKey: "settings.tabStorage", Icon: DatabaseIcon },
];

const DEVELOPER_TAB: TabDef<TabId> = {
  id: "developer",
  labelKey: "settings.tabDeveloper",
  Icon: CodeIcon,
};

const LOGS_TAB: TabDef<TabId> = {
  id: "logs",
  labelKey: "settings.tabLogs",
  Icon: ScrollTextIcon,
};

type Props = {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  commitLook: (look: LookSettings) => void;
  appearance: ThemeAppearance;
  defaultAppearance: ThemeAppearance;
  onAppearanceChange: (next: ThemeAppearance) => void;
  /** Streams the open dialog's draft to the app (null once closed). */
  onPreview: (draft: SettingsDraft | null) => void;
  saveState: SaveState;
  effectiveBackend: BackendId;
  storage: StorageActions;
  updateChecking: boolean;
  updateAvailable: boolean;
  onCheckUpdate: () => Promise<PwaUpdateCheckResult>;
};

export function SettingsModal({
  open,
  onClose,
  settings,
  update,
  commitLook,
  appearance,
  defaultAppearance,
  onAppearanceChange,
  onPreview,
  saveState,
  effectiveBackend,
  storage,
  updateChecking,
  updateAvailable,
  onCheckUpdate,
}: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  // Local draft of the owned look. Snapshots the persisted values and
  // re-syncs while the dialog is closed, so the next open starts clean and a
  // cancelled edit never lingers.
  const [draft, setDraft] = useState<SettingsDraft>(() => ({
    look: pickLook(settings),
    appearance,
  }));

  const tabs = useMemo<readonly TabDef<TabId>[]>(() => {
    const list = [...BASE_TABS];
    if (settings.devMode) list.push(DEVELOPER_TAB);
    if (settings.captureLogs) list.push(LOGS_TAB);
    return list;
  }, [settings.devMode, settings.captureLogs]);

  // Always reopen on the General tab. Resetting while closed keeps the next
  // open clean without a visible flash of the old tab.
  useEffect(() => {
    if (!open) setActiveTab("general");
  }, [open]);

  // If the active tab disappears (dev mode or capture turned off while it's
  // showing), fall back to General so the panel is never empty.
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab("general");
  }, [tabs, activeTab]);

  // Re-sync the draft from the stores while the dialog is closed, so a
  // cancelled edit is dropped and the next open starts from the live look.
  useEffect(() => {
    if (open) return;
    setDraft({ look: pickLook(settings), appearance });
  }, [open, settings, appearance]);

  // Stream the draft out while open so the calendar behind the dialog
  // previews live; clear it on close (that's also how Cancel reverts — the
  // persisted look reasserts and the calendar snaps back).
  useEffect(() => {
    onPreview(open ? draft : null);
  }, [open, draft, onPreview]);
  // Belt-and-braces clear on unmount.
  useEffect(() => () => onPreview(null), [onPreview]);

  const updateDraftLook = useCallback(
    <K extends keyof LookSettings>(key: K, value: LookSettings[K]) =>
      setDraft((prev) => ({
        ...prev,
        look: updateLook(prev.look, key, value),
      })),
    [],
  );

  const updateDraftAppearance = useCallback(
    (next: ThemeAppearance) =>
      setDraft((prev) => ({ ...prev, appearance: next })),
    [],
  );

  const handleSave = useCallback(() => {
    commitLook(draft.look);
    onAppearanceChange(draft.appearance);
    onClose();
  }, [commitLook, draft, onAppearanceChange, onClose]);

  // Reset only the look the dialog owns — the device-local switches and the
  // storage connections are left alone, and nothing is written until Save.
  const handleReset = useCallback(
    () => setDraft({ look: DEFAULT_LOOK, appearance: defaultAppearance }),
    [defaultAppearance],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="settings-title"
      closeLabel={t("settings.close")}
      footer={
        <SettingsFooter
          t={t}
          onReset={handleReset}
          onCancel={onClose}
          onSave={handleSave}
        />
      }
    >
      <SettingsHeader
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onClose={onClose}
      />

      <div className="flex flex-1 overflow-hidden">
        <TabSidebar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />

        <div
          role="tabpanel"
          id={`settings-tabpanel-${activeTab}`}
          aria-labelledby={`settings-tab-${activeTab}`}
          tabIndex={0}
          // `relative` is load-bearing: the visually-hidden inputs inside the
          // toggle rows are absolutely positioned, so they must resolve
          // against this panel rather than the modal card — otherwise
          // focusing one scrolls the card (which never scrolls back) and the
          // dialog goes blank.
          className="relative flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4"
        >
          {/* The Section blocks self-space with `mt-3 first:mt-0`, so the
              wrapper adds no gap of its own. */}
          <div className="mx-auto w-full max-w-2xl">
            {activeTab === "general" && (
              <GeneralSection
                look={draft.look}
                onUpdate={updateDraftLook}
                devMode={settings.devMode}
                onDevModeChange={(next) => update("devMode", next)}
              />
            )}
            {activeTab === "appearance" && (
              <AppearanceSection
                appearance={draft.appearance}
                onChange={updateDraftAppearance}
              />
            )}
            {activeTab === "calendar" && (
              <CalendarSection look={draft.look} onUpdate={updateDraftLook} />
            )}
            {activeTab === "entries" && (
              <EntriesSection look={draft.look} onUpdate={updateDraftLook} />
            )}
            {activeTab === "storage" && (
              <StorageSection
                saveState={saveState}
                effectiveBackend={effectiveBackend}
                storage={storage}
                devMode={settings.devMode}
                demoData={settings.demoData}
              />
            )}
            {activeTab === "developer" && (
              <DeveloperSection
                settings={settings}
                update={update}
                updateChecking={updateChecking}
                updateAvailable={updateAvailable}
                onCheckUpdate={onCheckUpdate}
              />
            )}
            {activeTab === "logs" && <LogsSection />}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Footer pinned below the tab content on every tab: Reset on the left, Cancel
// + Save grouped on the right. The Modal adds the home-indicator inset
// beneath it in the installed PWA, so the row keeps a comfortable thumb reach
// above the screen edge.
function SettingsFooter({
  t,
  onReset,
  onCancel,
  onSave,
}: {
  t: TFunction;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface-3 px-4 py-3">
      <Button variant="secondary" onClick={onReset}>
        {t("settings.resetToDefaults")}
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={onSave}>
          {t("common.save")}
        </Button>
      </div>
    </footer>
  );
}

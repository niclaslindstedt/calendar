// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The tabbed Settings dialog, opened from the top bar's cogwheel: General
// (language, country calendar, display toggles), Appearance (the framework's
// theme picker), Storage (backend picker + connect flows), Developer (dev
// mode, demo data, build info, update check), and Logs (the in-app log).

import { useState } from "react";

import {
  Badge,
  Button,
  Modal,
  Section,
  SegmentedControl,
  SelectPicker,
  ToggleRow,
} from "@niclaslindstedt/oss-framework/components";
import {
  AppearancePicker,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";
import { LogViewer } from "@niclaslindstedt/oss-framework/logging";
import {
  CheckForUpdatesItem,
  type PwaUpdateCheckResult,
} from "@niclaslindstedt/oss-framework/pwa";

import { setLanguage, useLang, useT } from "./i18n/index.ts";
import { LOCALES, getLocale } from "./locale/index.ts";
import { logStore } from "./log.ts";
import type { SaveState } from "./useCalendarStore.ts";
import type { BackendId } from "./storage/backends.ts";
import {
  isDropboxAvailable,
  isDropboxConnected,
  isFolderAvailable,
  isGdriveAvailable,
  isGdriveConnected,
} from "./storage/backends.ts";
import { effectiveToggles, type AppSettings } from "./useAppSettings.ts";

type Tab = "general" | "appearance" | "storage" | "developer" | "logs";

type StorageActions = {
  setActive: (id: BackendId) => void;
  connectFolder: () => void;
  connectDropbox: () => void;
  connectGdrive: () => void;
  disconnect: (id: BackendId) => void;
  folderConnected: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  reset: () => void;
  appearance: ThemeAppearance;
  onAppearanceChange: (next: ThemeAppearance) => void;
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
  reset,
  appearance,
  onAppearanceChange,
  saveState,
  effectiveBackend,
  storage,
  updateChecking,
  updateAvailable,
  onCheckUpdate,
}: Props) {
  const t = useT();
  const lang = useLang();
  const [tab, setTab] = useState<Tab>("general");
  const toggles = effectiveToggles(settings);

  const tabs: { value: Tab; label: string }[] = [
    { value: "general", label: t("settings.tabGeneral") },
    { value: "appearance", label: t("settings.tabAppearance") },
    { value: "storage", label: t("settings.tabStorage") },
  ];
  if (settings.devMode || tab === "developer" || tab === "logs") {
    // Developer stays reachable while you're on it even after flipping the
    // mode off, so the toggle can be flipped back.
  }
  tabs.push({ value: "developer", label: t("settings.tabDeveloper") });
  if (settings.devMode)
    tabs.push({ value: "logs", label: t("settings.tabLogs") });

  const saveLine =
    saveState.kind === "saving"
      ? t("storage.statusSaving")
      : saveState.kind === "loading"
        ? t("storage.statusLoading")
        : saveState.kind === "error"
          ? t("storage.statusError", { error: saveState.message })
          : t("storage.statusSaved");

  // One storage row: label + hint, an Active badge or a Use button, and the
  // backend's connect/disconnect affordance.
  const backendRow = (
    id: BackendId,
    label: string,
    hint: string,
    opts: {
      available: boolean;
      connected: boolean;
      onConnect?: () => void;
      connectLabel?: string;
    },
  ) => {
    if (!opts.available) return null;
    const active = effectiveBackend === id;
    return (
      <div className="flex items-center gap-2 border-b border-line py-2 last:border-b-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm">{label}</div>
          <div className="text-muted text-xs">{hint}</div>
        </div>
        {active ? (
          <Badge tone="accent">{t("storage.active")}</Badge>
        ) : opts.connected ? (
          <Button variant="secondary" onClick={() => storage.setActive(id)}>
            {t("storage.use")}
          </Button>
        ) : null}
        {!opts.connected && opts.onConnect && (
          <Button variant="secondary" onClick={opts.onConnect}>
            {opts.connectLabel ?? t("storage.connect")}
          </Button>
        )}
        {opts.connected && id !== "browser" && id !== "demo" && (
          <Button variant="ghost" onClick={() => storage.disconnect(id)}>
            {t("storage.disconnect")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="settings-title"
      size="lg"
      closeLabel={t("settings.close")}
    >
      <div className="settings-body flex flex-col gap-3 p-3">
        <h2 id="settings-title" className="text-lg font-semibold">
          {t("settings.title")}
        </h2>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={tabs}
          fullWidth
        />

        {tab === "general" && (
          <div className="flex flex-col gap-3">
            <Section title={t("settings.language")}>
              <SelectPicker
                value={lang}
                onChange={(next) => setLanguage(next)}
                ariaLabel={t("settings.language")}
                options={[
                  { value: "en", label: t("settings.languageEnglish") },
                  { value: "sv", label: t("settings.languageSwedish") },
                ]}
              />
            </Section>

            <Section title={t("settings.country")}>
              <div className="text-muted pb-2 text-xs">
                {t("settings.countryHint")}
              </div>
              <SelectPicker
                value={settings.localeId}
                onChange={(next) => update("localeId", next)}
                ariaLabel={t("settings.country")}
                options={LOCALES.map((l) => ({ value: l.id, label: l.label }))}
              />
              <ToggleRow
                label={t("settings.weekNumbers")}
                hint={t("settings.weekNumbersHint")}
                checked={toggles.weekNumbers}
                onChange={(next) => update("weekNumbers", next)}
              />
              {getLocale(settings.localeId).nameDays && (
                <ToggleRow
                  label={t("settings.nameDays")}
                  hint={t("settings.nameDaysHint")}
                  checked={toggles.nameDays}
                  onChange={(next) => update("nameDays", next)}
                />
              )}
            </Section>

            <Section title={t("settings.dayListRows")}>
              <div className="text-muted pb-2 text-xs">
                {t("settings.dayListRowsHint")}
              </div>
              <SegmentedControl
                value={settings.listRows}
                onChange={(next) => update("listRows", next)}
                options={[
                  { value: "fixed", label: t("settings.rowsFixed") },
                  { value: "dynamic", label: t("settings.rowsDynamic") },
                ]}
              />
            </Section>

            <div>
              <Button variant="ghost" onClick={reset}>
                {t("settings.resetToDefaults")}
              </Button>
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <AppearancePicker
            appearance={appearance}
            onChange={onAppearanceChange}
          />
        )}

        {tab === "storage" && (
          <Section title={t("storage.heading")}>
            <div className="text-muted pb-1 text-xs">{t("storage.hint")}</div>
            <div className="text-muted pb-2 text-xs">{saveLine}</div>
            {backendRow(
              "browser",
              t("storage.browser"),
              t("storage.browserHint"),
              {
                available: true,
                connected: true,
              },
            )}
            {backendRow(
              "folder",
              t("storage.folder"),
              t("storage.folderHint"),
              {
                available: isFolderAvailable(),
                connected: storage.folderConnected,
                onConnect: storage.connectFolder,
                connectLabel: t("storage.folderConnect"),
              },
            )}
            {backendRow(
              "dropbox",
              t("storage.dropbox"),
              t("storage.dropboxHint"),
              {
                available: isDropboxAvailable(),
                connected: isDropboxConnected(),
                onConnect: storage.connectDropbox,
              },
            )}
            {backendRow(
              "gdrive",
              t("storage.gdrive"),
              t("storage.gdriveHint"),
              {
                available: isGdriveAvailable(),
                connected: isGdriveConnected(),
                onConnect: storage.connectGdrive,
              },
            )}
            {settings.devMode &&
              backendRow("demo", t("storage.demo"), t("storage.demoHint"), {
                available: true,
                connected: settings.demoData,
              })}
          </Section>
        )}

        {tab === "developer" && (
          <div className="flex flex-col gap-3">
            <Section title={t("settings.tabDeveloper")}>
              <ToggleRow
                label={t("developer.devMode")}
                hint={t("developer.devModeHint")}
                checked={settings.devMode}
                onChange={(next) => update("devMode", next)}
              />
              {settings.devMode && (
                <>
                  <ToggleRow
                    label={t("developer.captureLogs")}
                    hint={t("developer.captureLogsHint")}
                    checked={settings.captureLogs}
                    onChange={(next) => update("captureLogs", next)}
                  />
                  <ToggleRow
                    label={t("developer.demoData")}
                    hint={t("developer.demoDataHint")}
                    checked={settings.demoData}
                    onChange={(next) => update("demoData", next)}
                  />
                </>
              )}
            </Section>

            {settings.devMode && (
              <Section title={t("developer.build")}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted">{t("developer.version")}</span>
                  <span>{__BUILD_LABEL__}</span>
                  <span className="text-muted">{t("developer.commit")}</span>
                  <span>{__BUILD_COMMIT__}</span>
                  <span className="text-muted">
                    {t("developer.buildNumber")}
                  </span>
                  <span>{__BUILD_NUMBER__}</span>
                  {/* Which of the three deploy slots this is. The `/branch/`
                      slot's URL is stable and only the parked build changes,
                      so it also names its source branch. */}
                  <span className="text-muted">{t("developer.slot")}</span>
                  <span>{__BUILD_SLOT__}</span>
                  {__BUILD_SOURCE__ && (
                    <>
                      <span className="text-muted">
                        {t("developer.sourceBranch")}
                      </span>
                      <span>{__BUILD_SOURCE__}</span>
                    </>
                  )}
                </div>
                <div className="pt-2">
                  <CheckForUpdatesItem
                    checking={updateChecking}
                    updateAvailable={updateAvailable}
                    onCheck={onCheckUpdate}
                  />
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === "logs" && settings.devMode && (
          <Section title={t("logs.heading")}>
            <LogViewer store={logStore} maxHeight="50vh" />
          </Section>
        )}
      </div>
    </Modal>
  );
}

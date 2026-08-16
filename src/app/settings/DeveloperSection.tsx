// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Developer tab, shown once developer mode is on. The capture-logs
// toggle persists the in-app log across reloads — and turning it on is what
// reveals the Logs tab; the demo-data toggle swaps storage for an in-memory
// sample calendar. Beneath them sits the build identity of the running slot
// and the manual update check. Every control here is device-local, so it
// applies immediately rather than on Save.

import { Section, ToggleRow } from "@niclaslindstedt/oss-framework/components";
import {
  CheckForUpdatesItem,
  type PwaUpdateCheckResult,
} from "@niclaslindstedt/oss-framework/pwa";

import { useT } from "../i18n/index.ts";
import type { AppSettings } from "../useAppSettings.ts";

export function DeveloperSection({
  settings,
  update,
  updateChecking,
  updateAvailable,
  onCheckUpdate,
}: {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateChecking: boolean;
  updateAvailable: boolean;
  onCheckUpdate: () => Promise<PwaUpdateCheckResult>;
}) {
  const t = useT();

  return (
    <>
      <Section title={t("settings.tabDeveloper")}>
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
      </Section>

      <Section title={t("developer.build")}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted">{t("developer.version")}</span>
          <span>{__BUILD_LABEL__}</span>
          <span className="text-muted">{t("developer.commit")}</span>
          <span>{__BUILD_COMMIT__}</span>
          <span className="text-muted">{t("developer.buildNumber")}</span>
          <span>{__BUILD_NUMBER__}</span>
          {/* Which of the three deploy slots this is. The `/branch/` slot's
              URL is stable and only the parked build changes, so it also
              names its source branch. */}
          <span className="text-muted">{t("developer.slot")}</span>
          <span>{__BUILD_SLOT__}</span>
          {__BUILD_SOURCE__ && (
            <>
              <span className="text-muted">{t("developer.sourceBranch")}</span>
              <span>{__BUILD_SOURCE__}</span>
            </>
          )}
        </div>
        <div>
          <CheckForUpdatesItem
            checking={updateChecking}
            updateAvailable={updateAvailable}
            onCheck={onCheckUpdate}
          />
        </div>
      </Section>
    </>
  );
}

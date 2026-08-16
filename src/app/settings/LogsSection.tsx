// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Logs tab: a live view of the in-app log, shown once log capture is on.
// It's how a storage problem is captured on a phone, where devtools are out
// of reach, and copied into a bug report.

import { Section } from "@niclaslindstedt/oss-framework/components";
import { LogViewer } from "@niclaslindstedt/oss-framework/logging";

import { useT } from "../i18n/index.ts";
import { logStore } from "../log.ts";

export function LogsSection() {
  const t = useT();
  return (
    <Section title={t("logs.heading")}>
      <LogViewer store={logStore} maxHeight="50vh" />
    </Section>
  );
}

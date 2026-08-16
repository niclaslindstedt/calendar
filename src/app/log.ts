// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The single in-app log buffer, on the framework's logging module. The Logs
// settings tab renders it live through the framework's `LogViewer`; storage
// adapters and the sync path write into it through scoped loggers. Starts
// dormant — `App` flips `setEnabled` when developer mode is on, and
// `setCaptureEnabled` mirrors the buffer to localStorage when the user asks.

import { createLogStore } from "@niclaslindstedt/oss-framework/logging";

export const logStore = createLogStore({
  logsKey: "calendar:logs",
  captureKey: "calendar:capture-logs",
  enabled: false,
});

export const log = logStore.createLogger("app");

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { render } from "preact";

// The default UI family (JetBrains Mono) is imported statically so it ships
// in the main bundle and precaches for offline first paint. The other font
// families load on demand when selected (the theme engine calls
// `loadFontFamily`).
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/jetbrains-mono/latin-ext-700.css";

import "./styles.css";
import { App } from "./App.tsx";
import { LanguageRoot } from "./app/i18n/index.ts";
import { applyRoomVars } from "./app/roomScale.ts";
import { applySafeAreaVars } from "./app/safeArea.ts";

// In dev no worker registers (`usePwaUpdate` runs disabled), but a worker
// installed by a previous `vite preview` on this origin would keep serving
// stale bytes — unregister any so the dev server always wins. The production
// registration is owned by the framework's `usePwaUpdate` (workbox-window)
// in `App.tsx`, against the worker `pwa-plugin.ts` emits.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((reg) => void reg.unregister()));
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

// Resolve the device's safe areas before the first render rather than in an
// effect after it: the top menu's leading space and every view's bottom
// gutter are read from these, so measuring them afterwards would paint one
// frame of the fallback geometry and then shift the whole calendar. `App`
// keeps them current when the device rotates or the app moves between a tab
// and the home screen.
applySafeAreaVars();

// …and the room factor, for the same reason: every printed size is multiplied
// by it, so resolving it in an effect would paint one frame of the phone's
// measurements and then restate every font size on the page.
applyRoomVars();

render(
  <LanguageRoot>
    <App />
  </LanguageRoot>,
  root,
);

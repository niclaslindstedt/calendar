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

// The room factor, before the first render rather than in an effect after it:
// every printed size is multiplied by it, so resolving it afterwards would
// paint one frame of the phone's measurements and then restate every font size
// on the page. (The safe areas need no such call — they are the stylesheet's
// own arithmetic now; see `src/app/safeArea.ts`.)
applyRoomVars();

render(
  <LanguageRoot>
    <App />
  </LanguageRoot>,
  root,
);

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { render } from "preact";

// The default UI family (JetBrains Mono) is imported statically so it ships
// in the main bundle and precaches for offline first paint. The other font
// families load on demand when selected (the theme engine calls
// `loadFontFamily`) — but only once their loaders are registered, which is
// what this side-effect import does. The framework keeps the `@fontsource/*`
// specifiers behind their own entry so an app that ships none of them can
// still import a `Button` without its bundler resolving font packages it does
// not have; the price is that an app that *does* want them has to say so, once,
// here. Drop this line and the picker still offers Inter, Source Serif and
// OpenDyslexic — and picking one silently paints the fallback stack.
import "@niclaslindstedt/oss-framework/theme/fontsource";

import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/jetbrains-mono/latin-ext-700.css";

import "./styles.css";

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

// The one route the calendar has besides itself. The build mirrors the shell
// to `privacy/index.html` (the `emit-privacy-alias` plugin in
// `vite.config.ts`), so every deployment slot serves the same SPA at
// `/privacy/` — and a slot nests it one segment deeper
// (`/preview/privacy/`), which is why this matches the suffix rather than the
// whole path.
//
// Both branches are reached through a dynamic `import()`, on purpose: the two
// surfaces are disjoint, and the policy is a crawlable, English-only legal
// page with no business downloading a month grid, the storage backends, and
// the PWA update machinery it never mounts. It also renders no state and
// cannot throw, which is why it is a bare `render` outside `LanguageRoot`.
if (window.location.pathname.replace(/\/$/, "").endsWith("/privacy")) {
  void import("./app/PrivacyPage.tsx").then(({ PrivacyPage }) => {
    render(<PrivacyPage />, root);
  });
} else {
  void Promise.all([
    import("./App.tsx"),
    import("./app/i18n/index.ts"),
    import("./app/roomScale.ts"),
  ]).then(([{ App }, { LanguageRoot }, { applyRoomVars }]) => {
    // The room factor, before the first render rather than in an effect after
    // it: every printed size is multiplied by it, so resolving it afterwards
    // would paint one frame of the phone's measurements and then restate
    // every font size on the page. (The safe areas need no such call — they
    // are the stylesheet's own arithmetic now; see `src/app/safeArea.ts`.)
    applyRoomVars();

    render(
      <LanguageRoot>
        <App />
      </LanguageRoot>,
      root,
    );
  });
}

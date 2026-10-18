// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone app's privacy page is true of the phone app alone: it names no
// website, no hosting and no GitHub, and says the only network traffic is the
// iCloud Drive sync the reader turns on. The website's copy still says where
// it is served from, and the desktop app's is unchanged. The page reads the
// build flags as compile-time globals, so each case stubs them and imports the
// page afresh before rendering it.

import { h, render } from "preact";
import { afterEach, describe, expect, it, vi } from "vitest";

type Build = { native: boolean; shell: boolean };

const PHONE: Build = { native: true, shell: true };
const DESKTOP: Build = { native: false, shell: true };
const WEBSITE: Build = { native: false, shell: false };

/** The page's text as a build with these flags renders it. */
async function privacyText({ native, shell }: Build): Promise<string> {
  vi.resetModules();
  vi.stubGlobal("__NATIVE_BUILD__", native);
  vi.stubGlobal("__SHELL_BUILD__", shell);
  vi.stubGlobal("__APP_NAME__", "Calendar");
  const { PrivacyPage } = await import("../src/app/PrivacyPage.tsx");
  const root = document.createElement("div");
  render(h(PrivacyPage, {}), root);
  const text = root.textContent ?? "";
  render(null, root);
  return text;
}

/** What names another edition of the app, or where its source lives. */
const OTHER_EDITION =
  /website|web site|static site|on the web|web app|github|browser|\bPWA\b|installed app|localStorage/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the phone app's privacy page", () => {
  it("names no website, no hosting and no GitHub", async () => {
    const text = await privacyText(PHONE);
    expect(text).not.toMatch(OTHER_EDITION);
    expect(text).not.toMatch(/niclaslindstedt|Dropbox/);
  });

  it("says the app sends nothing but the sync the reader turns on", async () => {
    const text = await privacyText(PHONE);
    expect(text).toMatch(/comes? inside the download/);
    expect(text).toMatch(/sends nothing when it starts/);
    expect(text).toMatch(/only network traffic is the sync you turn on/);
    expect(text).toMatch(/iCloud Drive, through your own Apple Account/);
  });

  it("still links to the full policy", async () => {
    const text = await privacyText(PHONE);
    expect(text).toContain("apps.agilator.se/calendar/privacy");
  });
});

describe("the other builds' privacy page", () => {
  it("on the website still says where it is served from", async () => {
    const text = await privacyText(WEBSITE);
    expect(text).toContain("calendar.niclaslindstedt.se");
    expect(text).toMatch(/The website is served by GitHub Pages/);
    expect(text).toMatch(/static site/);
  });

  it("in the desktop app still describes the website and the browser", async () => {
    const text = await privacyText(DESKTOP);
    expect(text).toMatch(/served as a static site on the web/);
    expect(text).toMatch(/The website is served by GitHub Pages/);
    expect(text).toMatch(/browser/);
    expect(text).not.toContain("niclaslindstedt");
  });

  it("says no account in no build", async () => {
    for (const build of [PHONE, DESKTOP, WEBSITE]) {
      const text = await privacyText(build);
      expect(text).not.toMatch(/no account/i);
      expect(text).toMatch(/nothing to sign up for/);
    }
  });
});

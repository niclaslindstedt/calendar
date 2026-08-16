// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Deployment slots (OSS_SPEC §11.5). The app is served from three disjoint
// path prefixes on one Pages domain: `/` (the highest released `v*` tag),
// `/preview/` (current `main`), and `/branch/` (a manually parked feature
// branch). Everything that must differ per slot — PWA identity, indexability,
// the build label, which navigations the service worker may claim — is
// derived from the deploy base here, so there is exactly one definition and
// the base path cannot drift from the identity it implies. Mirrors the
// sibling notes app's slot handling.
//
// Imported by the build (`vite.config.ts`, `pwa-plugin.ts`) and by the app,
// so keep it free of browser- and Node-only imports.

/** The three slots of the reference topology. */
export type DeploySlot = "production" | "preview" | "branch";

/** The public origin the production slot is served from (`public/CNAME`). */
export const SITE_ORIGIN = "https://calendar.niclaslindstedt.se";

/** Base path per slot, as passed to Vite's `base`. */
export const SLOT_BASE: Record<DeploySlot, string> = {
  production: "/",
  preview: "/preview/",
  branch: "/branch/",
};

/** The slot a deploy base implies. Anything else — a local build, an ad-hoc
 *  deploy under some other prefix — is production, so a plain
 *  `npm run build` reproduces exactly what `/` serves. */
export function slotForBase(base: string): DeploySlot {
  if (base === SLOT_BASE.preview) return "preview";
  if (base === SLOT_BASE.branch) return "branch";
  return "production";
}

/** Only production is indexed (OSS_SPEC §11.5.1) — the secondary slots must
 *  ship `noindex,nofollow` so a second copy of the app never lands in a
 *  search index and starts competing with the real one. */
export function isIndexable(slot: DeploySlot): boolean {
  return slot === "production";
}

/** The `robots` meta content for a slot. */
export function robotsContent(slot: DeploySlot): string {
  return isIndexable(slot)
    ? "index,follow,max-image-preview:large"
    : "noindex,nofollow";
}

/** Normalise a git ref into something that can sit in a build label: drop the
 *  `refs/heads/` prefix, fold anything non-alphanumeric to `-`, and clamp the
 *  length so the label stays glanceable in the Developer tab. */
export function shortRef(ref: string | undefined | null): string {
  if (!ref) return "";
  return ref
    .replace(/^refs\/(heads|tags)\//, "")
    .replace(/\W+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 24)
    .replace(/-+$/, "");
}

/** The slot suffix of the build label (OSS_SPEC §11.5.4): `pre` for staging,
 *  `br[-<source-branch>]` for the branch slot, nothing for production. The
 *  branch slot's URL is stable and only the parked build changes, so the
 *  source branch has to travel inside the build itself. */
export function slotSuffix(
  slot: DeploySlot,
  sourceRef?: string | null,
): string {
  if (slot === "preview") return "pre";
  if (slot === "branch") {
    const ref = shortRef(sourceRef);
    return ref ? `br-${ref}` : "br";
  }
  return "";
}

const APP_NAME = "Calendar — a wall calendar that doesn't nag";

/** Installed-app titles per slot (OSS_SPEC §11.4.8). The three slots share
 *  one origin and one icon set; without a slot in the name, three installs
 *  are indistinguishable on the home screen. */
export function slotTitles(slot: DeploySlot): {
  name: string;
  shortName: string;
  appleTitle: string;
} {
  switch (slot) {
    case "preview":
      return {
        name: `${APP_NAME} (preview)`,
        shortName: "Calendar pre",
        appleTitle: "Calendar pre",
      };
    case "branch":
      return {
        name: `${APP_NAME} (branch)`,
        shortName: "Calendar br",
        appleTitle: "Calendar br",
      };
    default:
      return { name: APP_NAME, shortName: "Calendar", appleTitle: "Calendar" };
  }
}

/** Path prefixes whose navigations this slot's service worker must NOT
 *  claim. The slots share an origin, so the production worker — scoped at
 *  `/` — would otherwise answer `/preview/` and `/branch/` navigations with
 *  the production app shell, and a PWA installed from `/preview/` would
 *  silently run production. A non-root slot is naturally confined by its own
 *  base check, so only production needs a denylist. */
export function navigationDenyPrefixes(slot: DeploySlot): string[] {
  return slot === "production" ? [SLOT_BASE.preview, SLOT_BASE.branch] : [];
}

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Where the reader's chosen theme lives, and what an untouched install reads
// like — extracted from `App.tsx` because it now has a second reader.
//
// That second reader is the privacy policy (`PrivacyPage.tsx`), which mounts
// on its own, outside the app shell. Without this it inherited the light
// `data-theme` seeded in `index.html` and stayed light on a device set to
// dark — a white page thrown at somebody reading a legal document at night.
// Nothing else about the shell is worth pulling in there, but the theme is.

import {
  DEFAULT_THEME_APPEARANCE,
  FAMILY_DEFAULT_THEME,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";

/** The `localStorage` key the appearance is persisted under. */
export const APPEARANCE_KEY = "calendar:appearance";

/** The default look is the PRINTED one: paper is light, so the calendar opens
 *  light whatever the device is set to. "Follow device" is one tap away in
 *  Settings → Appearance (with the dark palettes behind it), persisted per
 *  device. */
export const DEFAULT_APPEARANCE: ThemeAppearance = {
  ...DEFAULT_THEME_APPEARANCE,
  theme: FAMILY_DEFAULT_THEME.light,
};

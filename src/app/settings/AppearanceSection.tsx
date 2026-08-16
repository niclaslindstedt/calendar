// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The Appearance tab: the framework's theme picker (mode, variant, font,
// text size, and the custom palette), rendered against the dialog's draft so
// the calendar behind it previews live and only Save persists the choice.

import {
  AppearancePicker,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";

export function AppearanceSection({
  appearance,
  onChange,
}: {
  appearance: ThemeAppearance;
  onChange: (next: ThemeAppearance) => void;
}) {
  return <AppearancePicker appearance={appearance} onChange={onChange} />;
}

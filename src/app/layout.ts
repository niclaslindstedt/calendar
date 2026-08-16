// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The handful of layout measurements the views share. They live here rather
// than as literals in three view files because portrait mobile is the primary
// target (see AGENTS.md) and these are exactly the numbers that go wrong when
// only one of the three views is checked.

/** The gap under a view's last row. Fifteen pixels of breathing room on a
 *  phone with no home indicator, and the indicator's own inset when there is
 *  one — otherwise the bottom week row sits under the swipe bar. Matches the
 *  sibling `notes` app, which likewise floors its bottom gutter rather than
 *  relying on the safe-area inset alone. */
export const CONTENT_BOTTOM_PAD = "max(15px, env(safe-area-inset-bottom))";

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE WIDGET'S COLOURS — the app's, not a second palette.
//
// The reader picks a theme in the app, and a widget that ignored it would be
// the one surface on the device that does not follow. So the injected script
// reads the resolved CSS custom properties off `<html>` and they ride along in
// the snapshot; this file is only the parse from an authored CSS colour string
// to a SwiftUI `Color`.
//
// Only hex is handled (`#rgb`, `#rrggbb`, `#rrggbbaa`), because that is what
// the framework's palettes are authored in. Anything else — a named colour, an
// `oklch()` — falls back rather than failing, and the widget stays readable.

import SwiftUI
// For `Color(.systemBackground)` — the dynamic system colour the palette falls
// back to when a snapshot carries something that is not a hex string.
import UIKit

extension Color {
  /// Parse an authored CSS hex colour, falling back when it is not hex.
  init(css: String, fallback: Color) {
    var hex = css.trimmingCharacters(in: .whitespacesAndNewlines)
    guard hex.hasPrefix("#") else {
      self = fallback
      return
    }
    hex.removeFirst()

    // `#rgb` → `#rrggbb`, so one parse handles both.
    if hex.count == 3 {
      hex = hex.map { "\($0)\($0)" }.joined()
    }
    guard hex.count == 6 || hex.count == 8, let value = UInt64(hex, radix: 16) else {
      self = fallback
      return
    }

    let hasAlpha = hex.count == 8
    let red = Double((value >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
    let green = Double((value >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
    let blue = Double((value >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
    let alpha = hasAlpha ? Double(value & 0xFF) / 255 : 1

    self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
  }
}

/// The snapshot's palette, resolved to SwiftUI colours once per render.
struct Palette {
  let background: Color
  let foreground: Color
  let muted: Color
  let accent: Color

  init(_ theme: WidgetTheme, calendarColor: String?) {
    background = Color(css: theme.background, fallback: Color(.systemBackground))
    foreground = Color(css: theme.foreground, fallback: .primary)
    muted = Color(css: theme.muted, fallback: .secondary)
    // The calendar's own accent wins where it has one: two calendars on one
    // home screen should be told apart at a glance, and their colour is the
    // thing the reader chose for exactly that.
    let themeAccent = Color(css: theme.accent, fallback: .accentColor)
    accent = calendarColor.map { Color(css: $0, fallback: themeAccent) } ?? themeAccent
  }
}

/// `containerBackground` is iOS 17+, and is *required* there — a widget that
/// paints its own background edge to edge is rejected by the system on the
/// Lock Screen and in StandBy. Below 17 the background has to be painted the
/// old way, so both paths exist.
extension View {
  @ViewBuilder
  func widgetBackground(_ color: Color) -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(color, for: .widget)
    } else {
      background(color)
    }
  }
}

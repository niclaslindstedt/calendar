// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE SNAPSHOT, as the widget extension reads it.
//
// The app derives this in TypeScript (native/src/snapshot.ts) and writes the
// JSON into the App Group; the extension decodes it here. The two shapes have
// to agree, and `version` is what makes a disagreement visible: a snapshot
// carrying a version this build does not know is refused outright, so a widget
// left over from an older install shows its "open the app" placeholder rather
// than a half-decoded calendar.

import Foundation
import SwiftUI

/// The App Group the app publishes into. See native/modules/widget-bridge.
let APP_GROUP = "group.se.niclaslindstedt.calendar"

/// The key the snapshot JSON sits under.
let SNAPSHOT_KEY = "snapshot"

/// The format this build understands. Mirrors `SNAPSHOT_VERSION`.
let SUPPORTED_VERSION = 1

struct WidgetDay: Codable, Identifiable {
  /// `YYYY-MM-DD` — the app's day key, and the widget's identity for a row.
  let date: String
  let text: String

  var id: String { date }
}

struct WidgetCalendar: Codable {
  let name: String
  let color: String?
}

struct WidgetTheme: Codable {
  let background: String
  let foreground: String
  let muted: String
  let accent: String
}

/// How the reader's country pack cuts a week up: where a week starts, and
/// which of its days are not worked. Both come from `src/app/locale/*.ts` by
/// way of the snapshot — the widgets lay a week out with them, and the work
/// week is the week minus `restDays`.
struct WidgetWeek: Codable {
  let startsOn: Int
  let restDays: [Int]

  /// What a snapshot with no week rules falls back to: a Monday-start week
  /// with the weekend off, which is what both shipped packs say.
  static let fallback = WidgetWeek(startsOn: 1, restDays: [0, 6])
}

struct CalendarSnapshot: Codable {
  let version: Int
  let updatedAt: String
  let calendar: WidgetCalendar
  let locale: String
  /// Optional so a snapshot written by an older build still decodes rather
  /// than dropping the widget to its placeholder; read it through `weekRules`.
  let week: WidgetWeek?
  let theme: WidgetTheme
  let days: [WidgetDay]

  var weekRules: WidgetWeek { week ?? .fallback }

  /// What a widget shows before the app has ever run — and what it falls back
  /// to when the container holds something this build cannot read.
  static let placeholder = CalendarSnapshot(
    version: SUPPORTED_VERSION,
    updatedAt: "",
    calendar: WidgetCalendar(name: "Calendar", color: nil),
    locale: "en-GB",
    week: .fallback,
    theme: WidgetTheme(
      background: "#f6f8fa", foreground: "#1f2328",
      muted: "#57606a", accent: "#0969da"
    ),
    days: []
  )

  /// Read the published snapshot, or the placeholder when there is none.
  ///
  /// Every failure lands on the placeholder on purpose: a widget has no way to
  /// report an error and no user-visible recovery, so "looks empty, opens the
  /// app on tap" is the only useful answer to a missing group, a corrupt blob
  /// or a future version.
  static func load() -> CalendarSnapshot {
    guard
      let defaults = UserDefaults(suiteName: APP_GROUP),
      let json = defaults.string(forKey: SNAPSHOT_KEY),
      let data = json.data(using: .utf8),
      let decoded = try? JSONDecoder().decode(CalendarSnapshot.self, from: data),
      decoded.version == SUPPORTED_VERSION
    else {
      return placeholder
    }
    return decoded
  }

  /// The note for a given day, or nil.
  func note(on key: String) -> String? {
    days.first(where: { $0.date == key })?.text
  }

}

// MARK: - day keys

/// `YYYY-MM-DD` for a date in the device's current calendar, which is the same
/// reading of "today" the app made when it derived the snapshot.
func dayKey(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: date)
}

/// Parse a `YYYY-MM-DD` back into a `Date` at local midnight, for formatting.
func dateFromKey(_ key: String) -> Date? {
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.date(from: key)
}

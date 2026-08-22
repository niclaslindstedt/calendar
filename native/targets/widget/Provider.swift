// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE TIMELINE — when a widget re-reads the container, and what it shows in
// between.
//
// Two things change what a calendar widget should say: the notes (the app
// publishes those and calls `reloadAllTimelines`, so the extension is woken
// with no schedule involved) and the DATE. The date is the one the system has
// to be told about in advance, because nothing wakes the app at midnight. So
// every timeline carries an entry for today plus one for each of the next few
// midnights, and asks to be rebuilt after that.
//
// The snapshot is re-read for each entry rather than captured once: the entry
// is built now but rendered later, and the app may well have published
// something newer in between.

import WidgetKit
import SwiftUI

struct CalendarEntry: TimelineEntry {
  let date: Date
  let snapshot: CalendarSnapshot

  /// The day this entry renders as "today" — the key the views look up.
  var todayKey: String { dayKey(date) }
}

/// How many midnights ahead a timeline reaches before the system rebuilds it.
/// A week keeps the widget correct through an airplane-mode holiday without
/// asking the system for a refresh budget it will not grant.
private let TIMELINE_DAYS = 7

struct CalendarProvider: TimelineProvider {
  func placeholder(in context: Context) -> CalendarEntry {
    CalendarEntry(date: Date(), snapshot: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (CalendarEntry) -> Void) {
    completion(CalendarEntry(date: Date(), snapshot: .load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CalendarEntry>) -> Void) {
    let snapshot = CalendarSnapshot.load()
    let now = Date()
    let calendar = Calendar.current

    var entries = [CalendarEntry(date: now, snapshot: snapshot)]
    for offset in 1...TIMELINE_DAYS {
      guard
        let day = calendar.date(byAdding: .day, value: offset, to: now),
        let midnight = calendar.dateInterval(of: .day, for: day)?.start
      else { continue }
      entries.append(CalendarEntry(date: midnight, snapshot: snapshot))
    }

    // `.atEnd` rather than a fixed date: the last entry IS the last midnight
    // we planned for, so that is exactly when a new timeline is wanted.
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - shared formatting

/// The snapshot names the country pack the reader chose; dates are formatted
/// in it rather than in the device locale, so a Swedish calendar reads Swedish
/// on an English phone — the same answer the app itself gives.
func localeFor(_ snapshot: CalendarSnapshot) -> Locale {
  Locale(identifier: snapshot.locale)
}

/// "Monday 3 March" — the upcoming list's row heading.
func longDayLabel(_ key: String, _ snapshot: CalendarSnapshot) -> String {
  guard let date = dateFromKey(key) else { return key }
  let formatter = DateFormatter()
  formatter.locale = localeFor(snapshot)
  formatter.setLocalizedDateFormatFromTemplate("EEEEdMMMM")
  return formatter.string(from: date)
}

/// "Mon" — the weekday alone, for the compact rows.
func shortWeekdayLabel(_ key: String, _ snapshot: CalendarSnapshot) -> String {
  guard let date = dateFromKey(key) else { return "" }
  let formatter = DateFormatter()
  formatter.locale = localeFor(snapshot)
  formatter.setLocalizedDateFormatFromTemplate("EEE")
  return formatter.string(from: date)
}

/// "March" — the month, for the today widget's caption.
func monthLabel(_ key: String, _ snapshot: CalendarSnapshot) -> String {
  guard let date = dateFromKey(key) else { return "" }
  let formatter = DateFormatter()
  formatter.locale = localeFor(snapshot)
  formatter.setLocalizedDateFormatFromTemplate("MMMM")
  return formatter.string(from: date)
}

/// The day of the month as digits — the big number on the today widget.
func dayNumber(_ key: String) -> String {
  guard let date = dateFromKey(key) else { return "" }
  return String(Calendar.current.component(.day, from: date))
}

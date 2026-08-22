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

// MARK: - spans

/// WHAT EVERY WIDGET IS: a span of days, printed in order, each one whether or
/// not it carries a note.
///
/// That is the whole difference between them — Today is a span of one, the
/// week widgets are a span of seven (less the days the country does not work).
/// Keeping it one idea is what lets four widgets share one row renderer, and
/// what keeps "which days does this widget show" answerable in one place.
///
/// Empty days are printed too, on purpose: this is a wall calendar, and a
/// wall calendar shows you the days, not just the ones you have written on.
enum WidgetSpan {
  /// Today alone.
  case today
  /// Today and the two days after it. Today is included deliberately — a
  /// widget sitting beside the Today one is still the wrong place to hide
  /// what is on today.
  case nextThree
  /// The whole week today falls in, from the pack's first day of the week.
  case week
  /// That same week, minus the days the country does not work.
  case workWeek

  /// The day keys this span covers, in order, relative to `today`.
  func keys(from today: Date, week rules: WidgetWeek) -> [String] {
    switch self {
    case .today:
      return [dayKey(today)]
    case .nextThree:
      return (0..<3).compactMap { shiftKey(today, by: $0) }
    case .week, .workWeek:
      guard let start = startOfWeek(today, startsOn: rules.startsOn) else {
        return [dayKey(today)]
      }
      let calendar = Calendar.current
      return (0..<7).compactMap { offset -> String? in
        guard let day = calendar.date(byAdding: .day, value: offset, to: start)
        else { return nil }
        if self == .workWeek {
          // `Calendar.weekday` is 1-based from Sunday; the pack numbers days
          // the way JavaScript's `Date.getDay()` does, 0-based from Sunday.
          let weekday = calendar.component(.weekday, from: day) - 1
          if rules.restDays.contains(weekday) { return nil }
        }
        return dayKey(day)
      }
    }
  }
}

/// The first day of the week `date` falls in, for a pack that starts its week
/// on `startsOn` (`Date.getDay()` numbering, 1 = Monday).
///
/// Deliberately NOT `Calendar.dateInterval(of: .weekOfYear:)` — that uses the
/// device locale's first weekday, which is the phone's answer rather than the
/// calendar pack's. A reader who set the app to a Monday-start country on a
/// US phone would get a Sunday-start widget.
func startOfWeek(_ date: Date, startsOn: Int) -> Date? {
  let calendar = Calendar.current
  let midnight = calendar.startOfDay(for: date)
  let weekday = calendar.component(.weekday, from: midnight) - 1 // 0 = Sunday
  let back = ((weekday - startsOn) % 7 + 7) % 7
  return calendar.date(byAdding: .day, value: -back, to: midnight)
}

/// `dayKey` for a date `offset` days after `from`.
func shiftKey(_ from: Date, by offset: Int) -> String? {
  let calendar = Calendar.current
  guard
    let day = calendar.date(
      byAdding: .day, value: offset, to: calendar.startOfDay(for: from))
  else { return nil }
  return dayKey(day)
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

// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE ANDROID HOME SCREEN WIDGETS.
//
// Four of them — Today, Next 3 days, This week, Work week — which are one
// widget with four `Span`s (see below). They share this file, one snapshot
// reader and two layouts; only the span differs, which is what keeps four
// entries in the launcher's picker from being four things to maintain.
//
// Plain `AppWidgetProvider` over `RemoteViews`, and deliberately not Glance:
// Glance would pull Compose, its compiler plugin and a Kotlin version pin into
// a wrapper whose entire job is to host a WebView. These widgets print a
// heading and a handful of rows — RemoteViews does that with no dependency.
//
// RemoteViews cannot loop, so the list layout ships a FIXED set of rows and
// this class fills the ones its span covers and hides the rest. `MAX_ROWS` is
// that number and it has to match `calendar_widget_days.xml`.
//
// The snapshot arrives through the shared `SharedPreferences` file the
// widget-bridge module writes (see native/modules/widget-bridge). Both live in
// the same app and the same process, so there is no App Group equivalent to
// negotiate here — unlike iOS, where the extension is its own app.
//
// Copied into the generated Android project by `plugins/with-widgets.js`;
// `android/` is prebuild output, so this directory is the source of truth.

package se.niclaslindstedt.calendar.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
// `R` belongs to the APP's package: this file is copied into the app module
// by the config plugin, so its own package is a sub-package and the generated
// resource class has to be imported by name.
import se.niclaslindstedt.calendar.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Mirrors the bridge module's constants. */
private const val PREFS = "calendar_widget"
private const val SNAPSHOT_KEY = "snapshot"

/** The snapshot format this build understands (`SNAPSHOT_VERSION`). */
private const val SUPPORTED_VERSION = 1

/** How many rows calendar_widget_days.xml carries. A whole week is the most
 *  any span asks for. */
private const val MAX_ROWS = 7

/** The broadcasts that mean "today has moved". Mirrored in the manifest
 *  intent-filter that `plugins/with-widgets.js` writes. */
private val DATE_ACTIONS = setOf(
  Intent.ACTION_DATE_CHANGED,
  Intent.ACTION_TIME_CHANGED,
  Intent.ACTION_TIMEZONE_CHANGED
)

/**
 * WHAT EVERY WIDGET IS: a span of days, printed in order, each one whether or
 * not it carries a note. Mirrors `WidgetSpan` in the iOS target — the two
 * platforms answer "which days does this widget show" the same way or the
 * same widget means two different things on two phones.
 *
 * Empty days are printed too, on purpose: this is a wall calendar, and a wall
 * calendar shows you the days, not just the ones you have written on.
 */
enum class Span {
  TODAY,
  NEXT_THREE,
  WEEK,
  WORK_WEEK;

  /** The day keys this span covers, in order, relative to `today`. */
  fun keys(today: Calendar, week: WeekRules): List<String> = when (this) {
    TODAY -> listOf(dayKey(today.time))
    NEXT_THREE -> (0 until 3).map { dayKey(shift(today, it)) }
    WEEK, WORK_WEEK -> {
      val start = startOfWeek(today, week.startsOn)
      (0 until 7)
        .map { shift(start, it) }
        .filter { this == WEEK || !week.restDays.contains(weekdayOf(it)) }
        .map { dayKey(it) }
    }
  }
}

// --- the providers -----------------------------------------------------------

/**
 * The shared behaviour. Each concrete widget below is this class plus a span
 * and a layout; the launcher addresses them by class name, which is why they
 * have to be four real classes rather than one parameterised registration.
 */
abstract class CalendarWidgetProvider : AppWidgetProvider() {
  protected abstract val span: Span

  /** The heading printed above the rows. */
  protected abstract val titleRes: Int

  /**
   * Re-render on a date change as well as on the launcher's own update.
   *
   * `AppWidgetProvider.onReceive` only dispatches the APPWIDGET_* actions to
   * `onUpdate` — anything else it silently drops. So the DATE_CHANGED /
   * TIME_SET / TIMEZONE_CHANGED filter declared in the manifest would do
   * nothing at all without this: a widget's content is relative to "today",
   * and midnight is the one thing that changes it with no app involved.
   *
   * Best-effort rather than a guarantee: whether those implicit broadcasts
   * reach a background app varies by OS version and vendor. The guarantee is
   * the app itself, which republishes and reloads when it returns to the
   * foreground on a new day (see native/App.tsx).
   */
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action !in DATE_ACTIONS) return
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
    if (ids.isNotEmpty()) onUpdate(context, manager, ids)
  }

  override fun onUpdate(
    context: Context,
    manager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val snapshot = readSnapshot(context)
    for (id in appWidgetIds) {
      manager.updateAppWidget(id, render(context, snapshot))
    }
  }

  private fun render(context: Context, snapshot: Snapshot): RemoteViews {
    val today = Calendar.getInstance()
    val todayKey = dayKey(today.time)
    val keys = span.keys(today, snapshot.week)

    return if (span == Span.TODAY) {
      renderToday(context, snapshot, todayKey)
    } else {
      renderList(context, snapshot, keys, todayKey)
    }.also {
      // Both layouts root on `calendar_widget_click`, so the background and
      // the tap target are one code path rather than two.
      it.setInt(R.id.calendar_widget_click, "setBackgroundColor", snapshot.background)
      attachLaunchIntent(context, it)
    }
  }

  private fun renderToday(
    context: Context,
    snapshot: Snapshot,
    todayKey: String
  ): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.calendar_widget_today)
    views.setTextViewText(R.id.calendar_today_date, dayNumber(todayKey))
    views.setTextColor(R.id.calendar_today_date, snapshot.accent)
    views.setTextViewText(
      R.id.calendar_today_weekday,
      weekdayLabel(todayKey, snapshot.locale)
    )
    views.setTextColor(R.id.calendar_today_weekday, snapshot.muted)
    views.setTextViewText(R.id.calendar_today_month, monthLabel(todayKey, snapshot.locale))
    views.setTextColor(R.id.calendar_today_month, snapshot.foreground)

    val note = snapshot.note(todayKey)
    views.setTextViewText(R.id.calendar_today_note, note ?: "")
    views.setTextColor(R.id.calendar_today_note, snapshot.foreground)
    views.setViewVisibility(
      R.id.calendar_today_note,
      if (note == null) View.GONE else View.VISIBLE
    )

    views.setTextViewText(R.id.calendar_today_calendar, snapshot.calendarName)
    views.setTextColor(R.id.calendar_today_calendar, snapshot.muted)
    return views
  }

  private fun renderList(
    context: Context,
    snapshot: Snapshot,
    keys: List<String>,
    todayKey: String
  ): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.calendar_widget_days)

    views.setTextViewText(R.id.calendar_widget_title, context.getString(titleRes))
    views.setTextColor(R.id.calendar_widget_title, snapshot.accent)
    views.setTextViewText(R.id.calendar_widget_calendar, snapshot.calendarName)
    views.setTextColor(R.id.calendar_widget_calendar, snapshot.muted)

    for (index in 0 until MAX_ROWS) {
      val ids = ROW_IDS[index]
      val key = keys.getOrNull(index)
      if (key == null) {
        views.setViewVisibility(ids.container, View.GONE)
        continue
      }
      val isToday = key == todayKey
      val isRest = snapshot.week.restDays.contains(weekdayOf(key))

      views.setViewVisibility(ids.container, View.VISIBLE)
      views.setTextViewText(ids.weekday, weekdayLabel(key, snapshot.locale))
      // The pack's rest days are printed the way the app prints them: a
      // Sunday is not a Monday, and a week that does not say so reads wrong.
      views.setTextColor(ids.weekday, if (isRest) snapshot.accent else snapshot.muted)
      views.setTextViewText(ids.date, dayNumber(key))
      views.setTextColor(ids.date, if (isToday) snapshot.accent else snapshot.foreground)
      views.setTextViewText(ids.note, snapshot.note(key) ?: "")
      views.setTextColor(ids.note, snapshot.foreground)
      // Today's row is the one you look for, so it gets a tint behind it as
      // well as the accent on its number — the colour alone is easy to miss.
      views.setInt(
        ids.container,
        "setBackgroundColor",
        if (isToday) tint(snapshot.accent) else Color.TRANSPARENT
      )
    }
    return views
  }

  /** Tapping anywhere opens the app. */
  private fun attachLaunchIntent(context: Context, views: RemoteViews) {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: return
    launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    // `FLAG_IMMUTABLE` is required from Android 12; the intent carries no
    // extras for the app to read, so there is nothing to make mutable for.
    val pending = PendingIntent.getActivity(
      context, 0, launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.calendar_widget_click, pending)
  }
}

class TodayWidgetProvider : CalendarWidgetProvider() {
  override val span = Span.TODAY
  override val titleRes = R.string.calendar_widget_today
}

class NextThreeWidgetProvider : CalendarWidgetProvider() {
  override val span = Span.NEXT_THREE
  override val titleRes = R.string.calendar_widget_next_three
}

class ThisWeekWidgetProvider : CalendarWidgetProvider() {
  override val span = Span.WEEK
  override val titleRes = R.string.calendar_widget_this_week
}

class WorkWeekWidgetProvider : CalendarWidgetProvider() {
  override val span = Span.WORK_WEEK
  override val titleRes = R.string.calendar_widget_work_week
}

// --- the snapshot ------------------------------------------------------------

private data class Day(val date: String, val text: String)

/** How the reader's country pack cuts a week up. Mirrors `WidgetWeek`. */
data class WeekRules(val startsOn: Int, val restDays: List<Int>)

private data class Snapshot(
  val calendarName: String,
  val locale: String,
  val week: WeekRules,
  val background: Int,
  val foreground: Int,
  val muted: Int,
  val accent: Int,
  val days: List<Day>
) {
  fun note(key: String): String? = days.firstOrNull { it.date == key }?.text
}

/** What the widgets show before the app has ever published anything: a
 *  Monday-start week with the weekend off, which is what both shipped packs
 *  say, and no notes. */
private val PLACEHOLDER = Snapshot(
  calendarName = "Calendar",
  locale = "en-GB",
  week = WeekRules(1, listOf(0, 6)),
  background = Color.parseColor("#f6f8fa"),
  foreground = Color.parseColor("#1f2328"),
  muted = Color.parseColor("#57606a"),
  accent = Color.parseColor("#0969da"),
  days = emptyList()
)

/**
 * Read the published snapshot, falling back to the placeholder.
 *
 * Every failure — no file, unreadable JSON, a version this build does not know
 * — lands on the placeholder. A widget cannot report an error and the user
 * cannot act on one, so "shows the days with nothing on them, opens the app on
 * tap" is the only useful answer.
 */
private fun readSnapshot(context: Context): Snapshot {
  val json = context
    .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    .getString(SNAPSHOT_KEY, null) ?: return PLACEHOLDER

  return try {
    val root = JSONObject(json)
    if (root.optInt("version") != SUPPORTED_VERSION) return PLACEHOLDER

    val calendar = root.optJSONObject("calendar")
    val theme = root.optJSONObject("theme")
    val accent = calendar?.optString("color")?.takeIf { it.isNotBlank() }
      ?: theme?.optString("accent")

    val days = mutableListOf<Day>()
    root.optJSONArray("days")?.let { array ->
      for (i in 0 until array.length()) {
        val entry = array.optJSONObject(i) ?: continue
        val date = entry.optString("date")
        val text = entry.optString("text")
        if (date.isNotBlank() && text.isNotBlank()) days.add(Day(date, text))
      }
    }

    Snapshot(
      calendarName = calendar?.optString("name")?.takeIf { it.isNotBlank() }
        ?: PLACEHOLDER.calendarName,
      locale = root.optString("locale").takeIf { it.isNotBlank() }
        ?: PLACEHOLDER.locale,
      week = parseWeek(root.optJSONObject("week")),
      background = parseColour(theme?.optString("background"), PLACEHOLDER.background),
      foreground = parseColour(theme?.optString("foreground"), PLACEHOLDER.foreground),
      muted = parseColour(theme?.optString("muted"), PLACEHOLDER.muted),
      accent = parseColour(accent, PLACEHOLDER.accent),
      days = days
    )
  } catch (error: Exception) {
    PLACEHOLDER
  }
}

/** The week rules, or the placeholder's — a snapshot written by an older build
 *  carries none, and a widget that refused it would show nothing at all. */
private fun parseWeek(json: JSONObject?): WeekRules {
  if (json == null) return PLACEHOLDER.week
  val rest = mutableListOf<Int>()
  json.optJSONArray("restDays")?.let { array ->
    for (i in 0 until array.length()) rest.add(array.optInt(i))
  }
  return WeekRules(
    startsOn = json.optInt("startsOn", PLACEHOLDER.week.startsOn),
    restDays = if (rest.isEmpty()) PLACEHOLDER.week.restDays else rest
  )
}

/**
 * An authored CSS colour, as an Android colour int.
 *
 * Only hex is understood, which is what the framework's palettes are written
 * in; `#rgb` is expanded first because `Color.parseColor` does not take it.
 * Anything else falls back rather than throwing — a widget with an unparseable
 * accent should still be readable.
 */
private fun parseColour(css: String?, fallback: Int): Int {
  val value = css?.trim().orEmpty()
  if (!value.startsWith("#")) return fallback
  val hex = value.substring(1)
  val expanded = if (hex.length == 3) hex.map { "$it$it" }.joinToString("") else hex
  if (expanded.length != 6 && expanded.length != 8) return fallback
  return try {
    Color.parseColor("#$expanded")
  } catch (error: IllegalArgumentException) {
    fallback
  }
}

/** The accent at the strength today's row is tinted with (matching the iOS
 *  side's 12% opacity). */
private fun tint(accent: Int): Int = Color.argb(
  31, Color.red(accent), Color.green(accent), Color.blue(accent)
)

// --- dates -------------------------------------------------------------------

/** `YYYY-MM-DD` in the device's timezone — the same reading of a day the app
 *  made when it derived the snapshot. */
private fun dayKey(date: Date): String =
  SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)

/** A calendar `offset` days after `from`, at that day's start. */
private fun shift(from: Calendar, offset: Int): Calendar =
  (from.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, offset) }

/**
 * The first day of the week `date` falls in, for a pack that starts its week
 * on `startsOn` (`Date.getDay()` numbering, 1 = Monday).
 *
 * Deliberately NOT `Calendar.firstDayOfWeek` — that is the device locale's
 * answer rather than the calendar pack's, so a reader who set the app to a
 * Monday-start country on a US phone would get a Sunday-start widget.
 */
private fun startOfWeek(date: Calendar, startsOn: Int): Calendar {
  val weekday = (date.get(Calendar.DAY_OF_WEEK) - 1) // 0 = Sunday
  val back = ((weekday - startsOn) % 7 + 7) % 7
  return shift(date, -back)
}

/** The weekday of a calendar day, `Date.getDay()` numbering (0 = Sunday). */
private fun weekdayOf(date: Calendar): Int = date.get(Calendar.DAY_OF_WEEK) - 1

/** The same, for a `YYYY-MM-DD` key. Falls back to Monday on an unparseable
 *  key, which only shows up as a rest day printed in the wrong colour. */
private fun weekdayOf(key: String): Int {
  val date = parseKey(key) ?: return 1
  val calendar = Calendar.getInstance().apply { time = date }
  return calendar.get(Calendar.DAY_OF_WEEK) - 1
}

/** The day of the month, as digits. */
private fun dayNumber(key: String): String =
  key.substringAfterLast('-').trimStart('0')

/** "MON" — the weekday, in the country pack the reader chose rather than the
 *  device locale, which is the answer the app itself gives. */
private fun weekdayLabel(key: String, locale: String): String {
  val date = parseKey(key) ?: return ""
  return SimpleDateFormat("EEE", Locale.forLanguageTag(locale))
    .format(date)
    .uppercase()
}

/** "March" — the month, for the Today widget's caption. */
private fun monthLabel(key: String, locale: String): String {
  val date = parseKey(key) ?: return ""
  return SimpleDateFormat("LLLL", Locale.forLanguageTag(locale)).format(date)
}

private fun parseKey(key: String): Date? = try {
  SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(key)
} catch (error: Exception) {
  null
}

// --- layout ids --------------------------------------------------------------

private data class RowIds(val container: Int, val weekday: Int, val date: Int, val note: Int)

/** The fixed rows in calendar_widget_days.xml, in order. */
private val ROW_IDS = arrayOf(
  RowIds(R.id.calendar_widget_row_0, R.id.calendar_widget_weekday_0, R.id.calendar_widget_date_0, R.id.calendar_widget_note_0),
  RowIds(R.id.calendar_widget_row_1, R.id.calendar_widget_weekday_1, R.id.calendar_widget_date_1, R.id.calendar_widget_note_1),
  RowIds(R.id.calendar_widget_row_2, R.id.calendar_widget_weekday_2, R.id.calendar_widget_date_2, R.id.calendar_widget_note_2),
  RowIds(R.id.calendar_widget_row_3, R.id.calendar_widget_weekday_3, R.id.calendar_widget_date_3, R.id.calendar_widget_note_3),
  RowIds(R.id.calendar_widget_row_4, R.id.calendar_widget_weekday_4, R.id.calendar_widget_date_4, R.id.calendar_widget_note_4),
  RowIds(R.id.calendar_widget_row_5, R.id.calendar_widget_weekday_5, R.id.calendar_widget_date_5, R.id.calendar_widget_note_5),
  RowIds(R.id.calendar_widget_row_6, R.id.calendar_widget_weekday_6, R.id.calendar_widget_date_6, R.id.calendar_widget_note_6)
)

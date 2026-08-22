// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE ANDROID HOME SCREEN WIDGET.
//
// A plain `AppWidgetProvider` over `RemoteViews`, and deliberately not Glance:
// Glance would pull Compose, its compiler plugin and a Kotlin version pin into
// a wrapper whose entire job is to host a WebView. The widget prints a heading
// and a handful of rows — RemoteViews does that with no dependency at all.
//
// RemoteViews cannot loop, so the layout ships a FIXED set of rows and this
// class fills the ones it has notes for and hides the rest. `MAX_ROWS` is that
// number, and it has to match `calendar_widget.xml`.
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
import java.util.Locale

/** Mirrors the bridge module's constants. */
private const val PREFS = "calendar_widget"
private const val SNAPSHOT_KEY = "snapshot"

/** The snapshot format this build understands (`SNAPSHOT_VERSION`). */
private const val SUPPORTED_VERSION = 1

/** How many note rows the layout carries. Must match calendar_widget.xml. */
private const val MAX_ROWS = 5

/** The broadcasts that mean "today has moved". Mirrored in the manifest
 *  intent-filter that `plugins/with-widgets.js` writes. */
private val DATE_ACTIONS = setOf(
  Intent.ACTION_DATE_CHANGED,
  Intent.ACTION_TIME_CHANGED,
  Intent.ACTION_TIMEZONE_CHANGED
)

class CalendarWidgetProvider : AppWidgetProvider() {

  /**
   * Re-render on a date change as well as on the launcher's own update.
   *
   * `AppWidgetProvider.onReceive` only dispatches the APPWIDGET_* actions to
   * `onUpdate` — anything else it silently drops. So the DATE_CHANGED /
   * TIME_SET / TIMEZONE_CHANGED filter declared in the manifest would do
   * nothing at all without this: the widget's content is relative to "today",
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
    val ids = manager.getAppWidgetIds(
      ComponentName(context.packageName, CalendarWidgetProvider::class.java.name)
    )
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
    val views = RemoteViews(context.packageName, R.layout.calendar_widget)

    views.setInt(R.id.calendar_widget_root, "setBackgroundColor", snapshot.background)
    views.setTextViewText(R.id.calendar_widget_title, snapshot.calendarName)
    views.setTextColor(R.id.calendar_widget_title, snapshot.accent)

    val today = dayKey()
    val rows = snapshot.days.filter { it.date >= today }.take(MAX_ROWS)

    views.setViewVisibility(
      R.id.calendar_widget_empty,
      if (rows.isEmpty()) View.VISIBLE else View.GONE
    )
    views.setTextColor(R.id.calendar_widget_empty, snapshot.muted)

    for (index in 0 until MAX_ROWS) {
      val ids = ROW_IDS[index]
      val row = rows.getOrNull(index)
      if (row == null) {
        views.setViewVisibility(ids.container, View.GONE)
        continue
      }
      views.setViewVisibility(ids.container, View.VISIBLE)
      views.setTextViewText(ids.date, dayNumber(row.date))
      views.setTextViewText(ids.weekday, weekdayLabel(row.date, snapshot.locale))
      views.setTextViewText(ids.note, row.text)
      views.setTextColor(
        ids.date,
        if (row.date == today) snapshot.accent else snapshot.foreground
      )
      views.setTextColor(ids.weekday, snapshot.muted)
      views.setTextColor(ids.note, snapshot.foreground)
    }

    // Tapping anywhere opens the app. `FLAG_IMMUTABLE` is required from
    // Android 12; the intent carries no extras for the app to read, so there
    // is nothing to make mutable for.
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    if (launch != null) {
      launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      val pending = PendingIntent.getActivity(
        context, 0, launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.calendar_widget_root, pending)
    }

    return views
  }
}

// --- the snapshot ------------------------------------------------------------

private data class Day(val date: String, val text: String)

private data class Snapshot(
  val calendarName: String,
  val locale: String,
  val background: Int,
  val foreground: Int,
  val muted: Int,
  val accent: Int,
  val days: List<Day>
)

/** What the widget shows before the app has ever published anything. */
private val PLACEHOLDER = Snapshot(
  calendarName = "Calendar",
  locale = "en-GB",
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
 * cannot act on one, so "looks empty, opens the app on tap" is the only useful
 * answer.
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
    val array = root.optJSONArray("days")
    if (array != null) {
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

// --- dates -------------------------------------------------------------------

/** `YYYY-MM-DD` for today, in the device's timezone — the same reading of
 *  "today" the app made when it derived the snapshot. */
private fun dayKey(): String =
  SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

/** The day of the month, as digits. */
private fun dayNumber(key: String): String = key.substringAfterLast('-').trimStart('0')

/** "Mon" — the weekday, in the country pack the reader chose rather than the
 *  device locale, which is the answer the app itself gives. */
private fun weekdayLabel(key: String, locale: String): String {
  val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
  val date = try {
    parser.parse(key)
  } catch (error: Exception) {
    null
  } ?: return ""
  return SimpleDateFormat("EEE", Locale.forLanguageTag(locale)).format(date).uppercase()
}

// --- layout ids --------------------------------------------------------------

private data class RowIds(val container: Int, val date: Int, val weekday: Int, val note: Int)

/** The fixed rows in calendar_widget.xml, in order. */
private val ROW_IDS = arrayOf(
  RowIds(R.id.calendar_widget_row_0, R.id.calendar_widget_date_0, R.id.calendar_widget_weekday_0, R.id.calendar_widget_note_0),
  RowIds(R.id.calendar_widget_row_1, R.id.calendar_widget_date_1, R.id.calendar_widget_weekday_1, R.id.calendar_widget_note_1),
  RowIds(R.id.calendar_widget_row_2, R.id.calendar_widget_date_2, R.id.calendar_widget_weekday_2, R.id.calendar_widget_note_2),
  RowIds(R.id.calendar_widget_row_3, R.id.calendar_widget_date_3, R.id.calendar_widget_weekday_3, R.id.calendar_widget_note_3),
  RowIds(R.id.calendar_widget_row_4, R.id.calendar_widget_date_4, R.id.calendar_widget_weekday_4, R.id.calendar_widget_note_4)
)

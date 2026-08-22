// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE WIDGET SNAPSHOT — the one piece of data that crosses out of the WebView.
//
// The wrapper adds exactly one thing to the web app: Home Screen widgets. A
// widget runs in its own process (an App Extension on iOS, a broadcast
// receiver on Android) and cannot reach the WebView's `localStorage`, so the
// notes it prints have to be copied into a container both sides can read. This
// module is the *derivation* of what gets copied: raw `localStorage` in, a
// small, bounded, already-windowed snapshot out.
//
// It is deliberately PURE — no react-native, no expo, no DOM. Two reasons:
//
//  1. It is the only place that knows the web app's storage layout, so it is
//     the only place that can silently rot when the app changes where a
//     document lives. That makes it the part worth pinning in a test, and the
//     root suite does exactly that (`tests/native_snapshot_test.ts`) without a
//     device or a simulator in sight.
//  2. Nothing in `src/` is imported. The wrapper stays a wrapper: it reads the
//     shipped web build's storage the way a second reader would, rather than
//     compiling half the app twice. The keys below are the contract, and they
//     are mirrored — with the same names — in `src/app/storage/paths.ts`,
//     `src/app/storage/registryKeys.ts` and `src/app/useAppSettings.ts`.
//
// WHAT IS *NOT* IN THE SNAPSHOT, on purpose: name days and holidays. Those
// come from the country packs in `src/app/locale/`, which compute moving
// feasts per year — reproducing them in Swift and Kotlin would be a second
// implementation of the app's domain, which is the opposite of thin. A widget
// prints the date (formatted by the OS, in the device's locale) and the
// user's own note for it. Everything else is a tap away in the app.

/** The snapshot format version. Bump when the shape changes incompatibly; the
 *  widgets refuse a version they don't know rather than mis-rendering it. */
export const SNAPSHOT_VERSION = 1;

/** How far back the snapshot reaches. Yesterday is included so a widget read
 *  just after midnight — or on a device whose timezone has drifted a few
 *  hours from the one the snapshot was written in — still finds "today". */
export const WINDOW_DAYS_BACK = 1;

/** How far forward the snapshot reaches. Sixty days covers the upcoming
 *  widget's list many times over while keeping the payload small; a note
 *  further out than that is not "upcoming" by any useful reading. */
export const WINDOW_DAYS_AHEAD = 60;

/** Hard ceiling on how many days ride along, whatever the window implies. The
 *  shared container is not a database — iOS App Group defaults are read
 *  synchronously by the widget process on every timeline refresh. */
export const MAX_DAYS = 120;

/** Longest note a widget will ever be handed. A day's note is meant to be
 *  read at a glance; anything past this is clipped here rather than shipped
 *  and then thrown away by a `lineLimit`. */
export const MAX_NOTE_CHARS = 280;

/** A day with a note, as the widget receives it. */
export type WidgetDay = {
  /** `YYYY-MM-DD`, the app's `DayKey`. */
  date: string;
  /** The note, trimmed and clipped to `MAX_NOTE_CHARS`. Never empty. */
  text: string;
};

/** What the widgets read out of the shared container. */
export type WidgetSnapshot = {
  version: number;
  /** When this was derived, ISO-8601. The widget shows nothing from it; it is
   *  there so a stale container is recognisable in a bug report. */
  updatedAt: string;
  /** The calendar the app currently has open — widgets follow the app rather
   *  than pinning a calendar of their own, which is what keeps this thin. */
  calendar: { name: string; color: string | null };
  /** BCP-47 tag the widget formats dates with (the app's country pack). */
  locale: string;
  /** The resolved page colours, so a widget matches the app's theme instead
   *  of guessing. Authored CSS colours as the page computed them. */
  theme: WidgetTheme;
  /** Days carrying a note, ascending, windowed and capped. */
  days: WidgetDay[];
};

export type WidgetTheme = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
};

/** What the injected script posts out of the page: the `calendar:` /
 *  `oss:cache:` slice of `localStorage`, plus the colours only a live
 *  stylesheet can answer. */
export type PageReport = {
  storage: Record<string, string>;
  theme: Partial<WidgetTheme>;
};

// --- storage keys (mirrors of the web app's, see the header) -----------------

/** The reserved slug the app's first calendar occupies; it keeps the
 *  un-suffixed storage names a single-calendar app wrote under. */
export const DEFAULT_CALENDAR_SLUG = "default";

const CALENDAR_LIST_KEY = "calendar:calendars";
const CALENDAR_ACTIVE_KEY = "calendar:calendar:active";
const BACKEND_KEY = "calendar:backend";
const SETTINGS_KEY = "calendar:settings";

const isDefaultSlug = (slug: string) =>
  slug === DEFAULT_CALENDAR_SLUG || slug === "";

/** The `localStorage` key the *browser* backend stores a calendar under. */
export function documentKey(slug: string): string {
  return isDefaultSlug(slug)
    ? "calendar:document"
    : `calendar:document:${slug}`;
}

/** The scope a calendar's offline mirror is cached under. */
export function cacheScope(slug: string): string {
  return isDefaultSlug(slug) ? "calendar" : `calendar:${slug}`;
}

/** The framework's offline-cache key for a backend + scope. */
export function localCacheKey(backend: string, scope: string): string {
  return `oss:cache:${backend}:${scope}`;
}

/** The theme the snapshot falls back on when the page reported nothing — the
 *  app's light "paper" default, matching `themeColor.ts`'s own fallback. */
export const FALLBACK_THEME: WidgetTheme = {
  background: "#f6f8fa",
  foreground: "#1f2328",
  muted: "#57606a",
  accent: "#0969da",
};

/** The locale the snapshot falls back on, matching the app's own fallback. */
export const FALLBACK_LOCALE = "en-GB";

// --- derivation --------------------------------------------------------------

function parseJson(raw: string | undefined): unknown {
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * The calendar the app has open: its display name and accent colour.
 *
 * The registry is a plain JSON array of `{ slug, name, glyph?, color? }` (the
 * framework's namespace serial format) and the active pointer is a bare slug.
 * A pointer at a calendar the registry no longer lists falls back to the
 * default one, exactly as the app does.
 */
export function activeCalendar(storage: Record<string, string>): {
  slug: string;
  name: string;
  color: string | null;
} {
  const list = parseJson(storage[CALENDAR_LIST_KEY]);
  const entries = Array.isArray(list) ? list : [];
  const pointer = storage[CALENDAR_ACTIVE_KEY] ?? DEFAULT_CALENDAR_SLUG;

  const found = entries.find(
    (entry): entry is { slug: string; name?: unknown; color?: unknown } =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as { slug?: unknown }).slug === pointer,
  );

  const slug = found ? pointer : DEFAULT_CALENDAR_SLUG;
  const name =
    found && typeof found.name === "string" && found.name.trim() !== ""
      ? found.name.trim()
      : "Calendar";
  const color =
    found && typeof found.color === "string" && found.color.trim() !== ""
      ? found.color.trim()
      : null;

  return { slug, name, color };
}

/**
 * The active calendar's notes.
 *
 * Which key holds them depends on the backend the reader picked. The browser
 * backend writes the document JSON straight into `localStorage`; Dropbox and
 * Drive keep the authoritative copy in the cloud and mirror it into the
 * framework's offline cache, which wraps the same JSON in `{ "text": … }`.
 * Reading the mirror rather than the backend is what lets the widget stay
 * honest offline — and what keeps this module free of any network.
 *
 * The "local folder" backend has no mirror, so it is not covered — and does
 * not need to be: it is built on the File System Access API, which no WebView
 * on either platform implements, so the app inside the wrapper never offers
 * it. The `?? direct` fallback below is what any such backend lands on.
 */
export function readEntries(
  storage: Record<string, string>,
  backend: string,
  slug: string,
): Record<string, string> {
  const direct = parseJson(storage[documentKey(slug)]);
  const cached = parseJson(storage[localCacheKey(backend, cacheScope(slug))]);

  // `demo` is the developer-mode adapter — in-memory, nothing in localStorage
  // — so it lands on the same fallback.
  const doc =
    backend === "browser" || backend === ""
      ? direct
      : (pickCachedText(cached) ?? direct);

  const entries = (doc as { entries?: unknown } | null)?.entries;
  if (typeof entries !== "object" || entries === null) return {};

  const out: Record<string, string> = {};
  for (const [day, note] of Object.entries(
    entries as Record<string, unknown>,
  )) {
    if (typeof note === "string" && note.trim() !== "") out[day] = note;
  }
  return out;
}

function pickCachedText(cached: unknown): unknown {
  const text = (cached as { text?: unknown } | null)?.text;
  return typeof text === "string" ? parseJson(text) : null;
}

/** The country pack the app is set to, as a BCP-47 tag. */
export function readLocale(storage: Record<string, string>): string {
  const settings = parseJson(storage[SETTINGS_KEY]);
  const id = (settings as { localeId?: unknown } | null)?.localeId;
  return typeof id === "string" && id.trim() !== ""
    ? id.trim()
    : FALLBACK_LOCALE;
}

/** `YYYY-MM-DD` for a date, in the *device's* local time — the same reading of
 *  "today" the app makes, and the one the widget will make when it renders. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `dayKey` for `offset` days either side of `from`. */
export function shiftDay(from: Date, offset: number): string {
  const shifted = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  shifted.setDate(shifted.getDate() + offset);
  return dayKey(shifted);
}

function theme(reported: Partial<WidgetTheme>): WidgetTheme {
  const pick = (value: string | undefined, fallback: string) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  return {
    background: pick(reported.background, FALLBACK_THEME.background),
    foreground: pick(reported.foreground, FALLBACK_THEME.foreground),
    muted: pick(reported.muted, FALLBACK_THEME.muted),
    accent: pick(reported.accent, FALLBACK_THEME.accent),
  };
}

/**
 * Derive the snapshot the widgets read from what the page reported.
 *
 * `now` is injected rather than read from the clock so the test can pin a day
 * and so the caller can re-derive against a date boundary it has just crossed.
 */
export function buildSnapshot(report: PageReport, now: Date): WidgetSnapshot {
  const storage = report.storage ?? {};
  const backend = storage[BACKEND_KEY] ?? "browser";
  const calendar = activeCalendar(storage);
  const entries = readEntries(storage, backend, calendar.slug);

  const first = shiftDay(now, -WINDOW_DAYS_BACK);
  const last = shiftDay(now, WINDOW_DAYS_AHEAD);

  const days: WidgetDay[] = Object.entries(entries)
    // The window is a string comparison, which `YYYY-MM-DD` makes a date
    // comparison — the one property of the app's day key worth relying on.
    .filter(([day]) => day >= first && day <= last)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MAX_DAYS)
    .map(([date, text]) => ({
      date,
      text: text.trim().slice(0, MAX_NOTE_CHARS),
    }));

  return {
    version: SNAPSHOT_VERSION,
    updatedAt: now.toISOString(),
    calendar: { name: calendar.name, color: calendar.color },
    locale: readLocale(storage),
    theme: theme(report.theme ?? {}),
    days,
  };
}

/**
 * A cheap identity for a snapshot, used to skip a write when nothing the
 * widgets can see has changed. `updatedAt` is excluded on purpose: it moves on
 * every report, and writing the container wakes both widget processes.
 */
export function snapshotSignature(snapshot: WidgetSnapshot): string {
  const rest = { ...snapshot, updatedAt: "" };
  return JSON.stringify(rest);
}

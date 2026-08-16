// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The month-image seam. A "month image pack" is a year's worth of artwork —
// released separately (2026, 2027, …) — where each month has a large image
// (the month view hangs it above the grid, wall-calendar style) and a small
// one (the day list's slimmer header band).
//
// No packs ship yet, so `monthImageUrl` returns null and the views render
// their plain title band. When packs land, register them in `IMAGE_PACKS`
// keyed by year; the views need no changes.

export type MonthImageVariant = "large" | "small";

/** Per-year artwork: month (1–12) → image URL, per variant. */
export type MonthImagePack = Readonly<
  Record<MonthImageVariant, ReadonlyArray<string | null>>
>;

const IMAGE_PACKS: Readonly<Record<number, MonthImagePack>> = {};

/** The artwork URL for a month, or null when no pack covers that year. */
export function monthImageUrl(
  year: number,
  month: number,
  variant: MonthImageVariant,
): string | null {
  const pack = IMAGE_PACKS[year];
  if (!pack) return null;
  return pack[variant][month - 1] ?? null;
}

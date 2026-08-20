// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The room factor as a value a view can render with.
//
// Everything the stylesheet prints reads `--cal-room` off `<html>`
// (`roomScale.ts` publishes it, `src/styles.css` multiplies it in), so almost
// nothing needs this. The exception is the day's own note: its size is a px
// number JS picks before layout (`entryFont.ts`) and then measures against the
// box the view actually left (`entryFit.ts`), so the band has to be a number
// here rather than a length there.

import { useEffect, useState } from "react";

import { currentRoom } from "./roomScale.ts";
import type { StyleScope } from "./viewStyle.ts";

/** The room factor `scope` is printed at, kept current as the window changes.
 *
 *  The value is rounded to two decimals at the source, so a drag across a
 *  desktop window's width settles on a handful of distinct numbers rather
 *  than one per pixel — which is what lets the views memoize their entry band
 *  on it. */
export function useRoom(scope: StyleScope): number {
  const [room, setRoom] = useState(() => currentRoom(scope));

  useEffect(() => {
    const measure = () => setRoom(currentRoom(scope));
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [scope]);

  return room;
}

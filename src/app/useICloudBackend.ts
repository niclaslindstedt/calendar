// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The iCloud backend's own small state, kept out of `useCalendarStore` so the
// store only ever sees "the container is usable now" or "it is not".
//
// Two things need tracking that none of the other backends need:
//
//   • WHETHER A HOST IS THERE AT ALL. It arrives from outside the bundle (see
//     `storage/icloudHost.ts`) and can install itself either side of the app's
//     first render, so it is state, not a constant.
//   • WHETHER THE CONTAINER IS USABLE. Unlike an OAuth token, which is either
//     in hand or not, an iCloud container is present in the build and still
//     unreachable when the device is not signed in to iCloud — and the reader
//     can fix that from iOS Settings without the app ever being restarted. So
//     the status is probed on mount and re-probed on demand, and `signed-out`
//     is a state Settings → Storage explains and offers to re-check rather
//     than a dead end.
//
// Nothing here reads or writes a file. The adapter is built in
// `storage/backends.ts`; this module only decides whether it may be.

import { useCallback, useEffect, useState } from "react";

import {
  probeICloudStatus,
  useICloudHost,
  type ICloudHost,
  type ICloudStatus,
} from "./storage/icloudHost.ts";
import { logStore } from "./log.ts";

const log = logStore.createLogger("icloud");

export type ICloudBackend = {
  /** The installed host, or null where none is offered (every browser). */
  host: ICloudHost | null;
  /** Whether the container is usable. `unavailable` until the first probe has
   *  answered, so a backend that turns out not to exist is never briefly
   *  offered and then withdrawn. */
  status: ICloudStatus;
  /** Re-ask the host. The reader may have signed in to iCloud since the last
   *  answer — which is exactly what the Storage row's Connect is for. */
  refresh: () => Promise<ICloudStatus>;
};

export function useICloudBackend(): ICloudBackend {
  const host = useICloudHost();
  const [status, setStatus] = useState<ICloudStatus>("unavailable");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const answer = await probeICloudStatus(host);
      if (cancelled) return;
      setStatus(answer);
      if (host) log.info(`status: ${answer}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [host]);

  const refresh = useCallback(async () => {
    const answer = await probeICloudStatus(host);
    setStatus(answer);
    log.info(`status: re-probed — ${answer}`);
    return answer;
  }, [host]);

  return { host, status, refresh };
}

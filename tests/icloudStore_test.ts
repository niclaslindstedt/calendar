// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The file store the iCloud backend is built from
// (`src/app/storage/icloudStore.ts`), and the adapter over it.
//
// The store is thin, and that is exactly why it is worth pinning: every byte
// of every calendar goes through it, on a transport nobody can exercise
// without a signed device. What is checked here is what the framework's
// adapter relies on — a missing file reads as nothing, text crosses
// unchanged, a listing keeps its revisions — and that each calendar lands in
// the file `paths.ts` names for it.

import { describe, expect, it } from "vitest";

import {
  createICloudAdapter,
  icloudFileStore,
} from "../src/app/storage/icloudStore.ts";
import type { ICloudHost } from "../src/app/storage/icloudHost.ts";
import { documentFileName } from "../src/app/storage/paths.ts";

/** An in-memory host: the container as a map of path to text. Each write
 *  bumps a counter so a file's revision changes when its bytes do. */
function fakeHost(seed: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(seed));
  const revs = new Map<string, number>();
  const host: ICloudHost = {
    version: 1,
    status: async () => "ready",
    async list() {
      return [...files.keys()].map((path) => ({
        path,
        rev: `${revs.get(path) ?? 0}`,
      }));
    },
    read: async (path) => files.get(path) ?? null,
    async write(path, text) {
      files.set(path, text);
      revs.set(path, (revs.get(path) ?? 0) + 1);
    },
    async remove(path) {
      files.delete(path);
    },
  };
  return { host, files };
}

describe("the document store", () => {
  it("lists what the host holds, with revisions", async () => {
    const { host } = fakeHost({ "calendar.json": "{}" });
    await expect(icloudFileStore(host).list()).resolves.toEqual([
      { path: "calendar.json", rev: "0" },
    ]);
  });

  it("reads a missing file as nothing, not as an error", async () => {
    // This is what a first launch sees, and the framework's adapter reads it
    // as "no document stored yet" — an error here would be a failed load.
    const { host } = fakeHost();
    await expect(icloudFileStore(host).read("calendar.json")).resolves.toBe(
      null,
    );
  });

  it("writes text through unchanged", async () => {
    const { host } = fakeHost();
    const store = icloudFileStore(host);
    // Non-ASCII and quotes on purpose: a note is arbitrary user text.
    const text = '{"entries":{"2026-09-23":"Åsa\'s \\"fika\\" 15:00"}}';
    await store.write("calendar.json", text);
    await expect(store.read("calendar.json")).resolves.toBe(text);
  });

  it("drops a malformed listing row rather than the whole listing", async () => {
    const { host } = fakeHost();
    const broken: ICloudHost = {
      ...host,
      list: async () =>
        [{ path: "calendar.json", rev: "1" }, { path: "" }] as never,
    };
    await expect(icloudFileStore(broken).list()).resolves.toEqual([
      { path: "calendar.json", rev: "1" },
    ]);
  });

  it("removes a file", async () => {
    const { host, files } = fakeHost({ "calendar.json": "{}" });
    await icloudFileStore(host).remove("calendar.json");
    expect(files.size).toBe(0);
  });
});

describe("the adapter", () => {
  it("files each calendar under the name a picked folder would use", async () => {
    // One file per calendar in the container's root, the same names as the
    // local folder backend — so a reader who copies the Files-app folder into
    // a picked folder has the same calendars there.
    const { host, files } = fakeHost();
    await createICloudAdapter(host, documentFileName("default")).save("{}");
    await createICloudAdapter(host, documentFileName("work")).save('{"w":1}');
    expect([...files.keys()].sort()).toEqual([
      "calendar.json",
      "calendar.work.json",
    ]);
  });

  it("reads back what it saved", async () => {
    const { host } = fakeHost();
    const adapter = createICloudAdapter(host, "calendar.json");
    await expect(adapter.load()).resolves.toBeNull();
    await adapter.save('{"version":1,"entries":{}}');
    const loaded = await adapter.load();
    expect(loaded?.text).toBe('{"version":1,"entries":{}}');
  });
});

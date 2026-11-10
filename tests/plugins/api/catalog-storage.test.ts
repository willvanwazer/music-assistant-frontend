import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDbCatalogStorage } from "@/plugins/api/catalog-storage";
import { CatalogCache } from "@/plugins/api/catalog-cache";

const command = "music/albums/album_tracks";
const args = {
  item_id: "album",
  provider_instance_id_or_domain: "spotify--one",
};
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const save = () => vi.advanceTimersByTimeAsync(300);

describe("persistent catalog cache", () => {
  it("restores after a new app instance without fetching and refreshes stale data in the background", async () => {
    const first = new CatalogCache(
      undefined,
      undefined,
      new IndexedDbCatalogStorage(),
    );
    first.setScope("server/user/en");
    await first.read(command, args, async () => ["saved"]);
    await save();
    // Wait for the write transaction, then discard the entire in-memory cache.
    expect(
      await new IndexedDbCatalogStorage().load("server/user/en"),
    ).toHaveLength(1);
    first.detach();
    const restarted = new CatalogCache(
      undefined,
      undefined,
      new IndexedDbCatalogStorage(),
    );
    restarted.setScope("server/user/en");
    const load = vi.fn(async () => ["fresh"]);
    expect(await restarted.read(command, args, load)).toEqual(["saved"]);
    expect(load).not.toHaveBeenCalled();
    vi.advanceTimersByTime(8 * 60 * 60_000);
    expect(await restarted.read(command, args, load)).toEqual(["saved"]);
    expect(load).toHaveBeenCalledExactlyOnceWith(true);
    await save();
    expect(await restarted.read(command, args, load)).toEqual(["fresh"]);
    restarted.detach();
  });

  it("isolates account scopes, keeps one bounded snapshot, and clears persisted data", async () => {
    const disk = new IndexedDbCatalogStorage();
    const entry = { json: '{"value":["old"]}', storedAt: Date.now() };
    await disk.save("account1", [["key", entry]]);
    expect(await disk.load("account2")).toEqual([]);
    await disk.save("account2", [["other", entry]]);
    expect(await disk.load("account1")).toEqual([]);
    await disk.clear("account1");
    expect(await disk.load("account2")).toHaveLength(1);
    await disk.clear("account2");
    expect(await disk.load("account2")).toEqual([]);

    const cache = new CatalogCache(2, undefined, disk);
    cache.setScope("account2");
    for (const id of ["a", "b", "c"])
      await cache.read(command, { ...args, item_id: id }, async () => [id]);
    await save();
    expect(await disk.load("account2")).toHaveLength(2);
    cache.clear();
    expect(await disk.load("account2")).toEqual([]);
  });

  it("ignores expired, corrupt and non-catalog entries on disk", async () => {
    const disk = new IndexedDbCatalogStorage();
    await disk.save("user", [
      [
        JSON.stringify([command, []]),
        {
          json: '{"value":["expired"]}',
          storedAt: Date.now() - 25 * 60 * 60_000,
        },
      ],
      [
        JSON.stringify(["players/all", []]),
        { json: '{"value":["private"]}', storedAt: Date.now() },
      ],
      ["broken", { json: "broken", storedAt: Date.now() }],
    ]);
    const cache = new CatalogCache(undefined, undefined, disk);
    cache.setScope("user");
    const load = vi.fn(async () => ["fresh"]);
    expect(await cache.read(command, undefined, load)).toEqual(["fresh"]);
    expect(await cache.read("players/all", undefined, load)).toEqual(["fresh"]);
    expect(load).toHaveBeenCalledTimes(2);
    cache.detach();
  });

  it("falls back to memory when browser storage is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const cache = new CatalogCache(
      undefined,
      undefined,
      new IndexedDbCatalogStorage(),
    );
    cache.setScope("user");
    const load = vi.fn(async () => ["fresh"]);
    expect(await cache.read(command, args, load)).toEqual(["fresh"]);
    await save();
    expect(await cache.read(command, args, load)).toEqual(["fresh"]);
    expect(load).toHaveBeenCalledTimes(1);
    cache.clear();
  });

  it("does not resurrect disk data or start an old account request after clear or scope change", async () => {
    let resolve!: (entries: []) => void;
    const storage = {
      load: vi.fn(() => new Promise<[]>((done) => (resolve = done))),
      save: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined),
    };
    const cache = new CatalogCache(undefined, undefined, storage);
    cache.setScope("old");
    const load = vi.fn(async () => ["fresh"]);
    const pending = cache.read(command, args, load);
    const rejection = expect(pending).rejects.toThrow("scope changed");
    cache.detach();
    resolve([]);
    await rejection;
    expect(load).not.toHaveBeenCalled();
  });
});

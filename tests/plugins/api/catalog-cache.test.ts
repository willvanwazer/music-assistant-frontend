import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogCache, invalidatesCatalog } from "@/plugins/api/catalog-cache";

const command = "music/albums/album_tracks";
const args = {
  item_id: "album",
  provider_instance_id_or_domain: "spotify--one",
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
afterEach(() => vi.useRealTimers());

describe("catalog cache", () => {
  it("shares a cold request, clones results and reuses a fresh response", async () => {
    const cache = new CatalogCache();
    const response = deferred<{ name: string }[]>();
    const load = vi.fn(() => response.promise);
    const first = cache.read(command, args, load);
    const second = cache.read(command, { ...args, force_refresh: false }, load);
    expect(load).toHaveBeenCalledTimes(1);
    response.resolve([{ name: "Original" }]);
    const a = await first;
    a[0].name = "Changed";
    expect(await second).toEqual([{ name: "Original" }]);
    expect(await cache.read(command, args, load)).toEqual([
      { name: "Original" },
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves stale results immediately and refreshes once in the background", async () => {
    vi.useFakeTimers();
    const cache = new CatalogCache();
    await cache.read(command, args, async () => ["old"]);
    vi.advanceTimersByTime(6 * 60_000);
    const response = deferred<string[]>();
    const load = vi.fn(() => response.promise);
    expect(await cache.read(command, args, load)).toEqual(["old"]);
    expect(await cache.read(command, args, load)).toEqual(["old"]);
    expect(load).toHaveBeenCalledExactlyOnceWith(true);
    response.resolve(["new"]);
    await response.promise;
    expect(await cache.read(command, args, load)).toEqual(["new"]);
  });

  it("retains stale data on refresh failure and retries cold failures", async () => {
    vi.useFakeTimers();
    const cache = new CatalogCache();
    await cache.read(command, args, async () => []);
    vi.advanceTimersByTime(6 * 60_000);
    const fail = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await cache.read(command, args, fail)).toEqual([]);
    await Promise.resolve();
    expect(await cache.read(command, args, fail)).toEqual([]);
    cache.clear();
    await expect(cache.read(command, args, fail)).rejects.toThrow("offline");
    await expect(cache.read(command, args, fail)).rejects.toThrow("offline");
  });

  it("does not reuse another provider or parameter combination", async () => {
    const cache = new CatalogCache();
    const load = vi.fn(async () => []);
    await cache.read(command, args, load);
    await cache.read(
      command,
      { ...args, provider_instance_id_or_domain: "spotify--two" },
      load,
    );
    await cache.read(command, { ...args, in_library_only: true }, load);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("a force refresh wins over an older in-flight result", async () => {
    const cache = new CatalogCache();
    const old = deferred<string[]>();
    const first = cache.read(command, args, () => old.promise);
    expect(
      await cache.read(command, { ...args, force_refresh: true }, async () => [
        "new",
      ]),
    ).toEqual(["new"]);
    old.resolve(["old"]);
    await first;
    expect(await cache.read(command, args, async () => ["wrong"])).toEqual([
      "new",
    ]);
  });

  it("clearing for a new account prevents late results from repopulating the cache", async () => {
    const cache = new CatalogCache();
    const old = deferred<string[]>();
    const first = cache.read(command, args, () => old.promise);
    cache.clear();
    old.resolve(["other account"]);
    await first;
    expect(
      await cache.read(command, args, async () => ["current account"]),
    ).toEqual(["current account"]);
  });

  it("bounds entries and stops serving data past the stale window", async () => {
    vi.useFakeTimers();
    const cache = new CatalogCache(1);
    const load = vi.fn(async () => []);
    await cache.read(command, args, load);
    await cache.read(command, { ...args, item_id: "second" }, load);
    await cache.read(command, args, load);
    expect(load).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(25 * 60 * 60_000);
    await cache.read(command, args, load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("does not retain oversized responses, playback reads or recommendations", async () => {
    const cache = new CatalogCache(10, 100);
    const load = vi.fn(async () => ["x".repeat(100)]);
    for (const read of [
      command,
      "players/all",
      "music/recommendations/items",
    ]) {
      await cache.read(read, args, load);
      await cache.read(read, args, load);
    }
    expect(load).toHaveBeenCalledTimes(6);
  });

  it.each([
    "auth",
    "auth/logout",
    "auth/user/update",
    "music/playlists/add_playlist_tracks",
    "music/favorites/remove_item",
    "music/refresh_item",
  ])("invalidates on %s", (mutation) => {
    expect(invalidatesCatalog(mutation)).toBe(true);
  });
  it.each([
    command,
    "music/get_library_item",
    "music/playlists/library_items",
    "player_queues/play_media",
  ])("does not invalidate on %s", (read) => {
    expect(invalidatesCatalog(read)).toBe(false);
  });
});

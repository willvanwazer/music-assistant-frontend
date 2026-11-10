import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeCatalogWarmer } from "@/helpers/homeCatalogWarmer";
import { CatalogCache } from "@/plugins/api/catalog-cache";
import {
  MediaType,
  type Album,
  type ItemMapping,
  type Playlist,
} from "@/plugins/api/interfaces";

const mapping = (
  id: string,
  media_type = MediaType.ALBUM,
  provider = "spotify--one",
) =>
  ({
    item_id: id,
    provider,
    media_type,
    uri: `${provider}://${media_type}/${id}`,
    available: true,
  }) as ItemMapping;
const details = (item: ItemMapping, spotify = true) =>
  ({
    ...item,
    provider_mappings: [
      {
        provider_instance: spotify ? "spotify--one" : "local",
        available: true,
      },
    ],
  }) as unknown as Album | Playlist;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
let warmer: HomeCatalogWarmer;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  warmer?.stop();
  vi.useRealTimers();
});
const tick = () => vi.advanceTimersByTimeAsync(1000);

describe("home catalog warming", () => {
  it("warms every home card even when the selection exceeds one hundred items", async () => {
    const items = Array.from({ length: 120 }, (_, i) => mapping(String(i)));
    const request = vi.fn(async (command, args) =>
      command.endsWith("get_album") ? details(mapping(args.item_id)) : [],
    );
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: () => true,
      isIdle: () => true,
    });
    warmer.update(items, "user");
    await vi.advanceTimersByTimeAsync(240_000);
    expect(request).toHaveBeenCalledTimes(240);
    expect(request).toHaveBeenLastCalledWith("music/albums/album_tracks", {
      item_id: "119",
      provider_instance_id_or_domain: "spotify--one",
      in_library_only: false,
    });
  });

  it("warms later cards before refreshing completed cards after a slow response", async () => {
    const slow = deferred<Album | Playlist>();
    const request = vi
      .fn()
      .mockResolvedValueOnce(details(mapping("a")))
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValue(details(mapping("c")));
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: () => true,
      isIdle: () => true,
    });
    warmer.update([mapping("a"), mapping("b"), mapping("c")], "user");
    await vi.advanceTimersByTimeAsync(310_000);
    expect(request).toHaveBeenCalledTimes(3);
    slow.resolve(details(mapping("b")));
    await vi.advanceTimersByTimeAsync(2000);
    expect(request.mock.calls.slice(3).map(([, args]) => args.item_id)).toEqual(
      ["b", "c"],
    );
  });

  it("preloads artist panels for direct cards and artists attached to home tracks", async () => {
    const artist = mapping("artist", MediaType.ARTIST);
    const track = { ...mapping("track", MediaType.TRACK), artists: [artist] };
    const request = vi.fn().mockResolvedValue(details(artist));
    const artistRequests = vi.fn(() => [
      { command: "music/artists/top_tracks", args: { item_id: "artist" } },
      {
        command: "music/artists/similar_artists",
        args: { item_id: "artist", limit: 25 },
      },
    ]);
    warmer = new HomeCatalogWarmer({
      request,
      artistRequests,
      isSpotify: () => true,
      isIdle: () => true,
    });
    warmer.update([track, artist], "user");
    await vi.advanceTimersByTimeAsync(5000);
    expect(request.mock.calls.map(([command]) => command)).toEqual([
      "music/artists/get_artist",
      "music/artists/top_tracks",
      "music/artists/similar_artists",
    ]);
    expect(artistRequests).toHaveBeenCalledTimes(1);
  });

  it("warms the exact album and playlist cache entries used on the first detail visit", async () => {
    const cache = new CatalogCache();
    const album = mapping("a");
    const playlist = mapping("p", MediaType.PLAYLIST);
    const backend = vi.fn(
      async (command: string, _args: Record<string, unknown>) =>
        command.endsWith("get_album")
          ? details(album)
          : command.endsWith("get_playlist")
            ? details(playlist)
            : [{ item_id: "track" }],
    );
    const request = <T>(command: string, args: Record<string, unknown>) =>
      cache.read(command, args, () => backend(command, args) as Promise<T>);
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: (id) => id === "spotify--one",
      isIdle: () => true,
    });
    warmer.update([album, playlist, album], "account1");
    await vi.advanceTimersByTimeAsync(4000);
    expect(backend).toHaveBeenCalledTimes(4);
    expect(backend).toHaveBeenCalledWith("music/albums/album_tracks", {
      item_id: "a",
      provider_instance_id_or_domain: "spotify--one",
      in_library_only: false,
    });
    expect(backend).toHaveBeenCalledWith("music/playlists/playlist_tracks", {
      item_id: "p",
      provider_instance_id_or_domain: "spotify--one",
      force_refresh: false,
    });
    await request("music/albums/get_album", {
      item_id: "a",
      provider_instance_id_or_domain: "spotify--one",
    });
    expect(
      await request("music/albums/album_tracks", {
        item_id: "a",
        provider_instance_id_or_domain: "spotify--one",
        in_library_only: false,
      }),
    ).toEqual([{ item_id: "track" }]);
    await request("music/playlists/playlist_tracks", {
      item_id: "p",
      provider_instance_id_or_domain: "spotify--one",
      force_refresh: false,
    });
    expect(backend).toHaveBeenCalledTimes(4);
  });

  it("resolves slim library items and skips local-only, spoken-word and dynamic content", async () => {
    const library = mapping("a", MediaType.ALBUM, "library");
    const local = mapping("b", MediaType.ALBUM, "library");
    const dynamic = mapping("d", MediaType.PLAYLIST);
    const request = vi
      .fn()
      .mockResolvedValueOnce(details(library))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(details(local, false))
      .mockResolvedValueOnce({ ...details(dynamic), is_dynamic: true });
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: (id) => id === "spotify--one",
      isIdle: () => true,
    });
    warmer.update(
      [
        library,
        local,
        dynamic,
        mapping("book", MediaType.AUDIOBOOK),
        mapping("episode", MediaType.PODCAST_EPISODE),
        mapping("track", MediaType.TRACK),
        mapping("local", MediaType.ALBUM, "local"),
      ],
      "user",
    );
    await vi.advanceTimersByTimeAsync(8000);
    expect(request).toHaveBeenCalledTimes(4);
    expect(request.mock.calls.filter(([c]) => c.endsWith("_tracks"))).toEqual([
      [
        "music/albums/album_tracks",
        {
          item_id: "a",
          provider_instance_id_or_domain: "library",
          in_library_only: false,
        },
      ],
    ]);
  });

  it("waits for idle time and keeps only one speculative request in flight", async () => {
    let idle = false;
    const response = deferred<Album | Playlist>();
    const request = vi.fn(() => response.promise);
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: () => true,
      isIdle: () => idle,
    });
    warmer.update([mapping("a"), mapping("b")], "user");
    await vi.advanceTimersByTimeAsync(3000);
    expect(request).not.toHaveBeenCalled();
    idle = true;
    await vi.advanceTimersByTimeAsync(5000);
    expect(request).toHaveBeenCalledTimes(1);
    idle = false;
    response.resolve(details(mapping("a")));
    await tick();
    expect(request).toHaveBeenCalledTimes(1);
    idle = true;
    await tick();
    expect(request.mock.calls).toHaveLength(2);
  });

  it("does not start track reads after a card is removed or Home is unmounted", async () => {
    const response = deferred<Album | Playlist>();
    const request = vi.fn(() => response.promise);
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: () => true,
      isIdle: () => true,
    });
    warmer.update([mapping("a")], "user");
    await tick();
    warmer.update([], "user");
    response.resolve(details(mapping("a")));
    await vi.advanceTimersByTimeAsync(3000);
    expect(request).toHaveBeenCalledTimes(1);
    warmer.update([mapping("b")], "user");
    warmer.stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("drops an old account's in-flight continuation when the scope changes", async () => {
    const response = deferred<Album | Playlist>();
    const request = vi
      .fn()
      .mockReturnValueOnce(response.promise)
      .mockResolvedValue(details(mapping("a")));
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: () => true,
      isIdle: () => true,
    });
    warmer.update([mapping("a")], "old account");
    await tick();
    warmer.update([mapping("a")], "new account");
    response.resolve(details(mapping("a")));
    await tick();
    expect(request.mock.calls.map(([command]) => command)).toEqual([
      "music/albums/get_album",
      "music/albums/get_album",
    ]);
  });

  it("backs off failures, continues other cards, and revisits completed items later", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValue(details(mapping("b")));
    warmer = new HomeCatalogWarmer({
      request,
      isSpotify: () => true,
      isIdle: () => true,
    });
    warmer.update([mapping("a"), mapping("b")], "user");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(request).toHaveBeenCalledTimes(3);
    warmer.update([mapping("a"), mapping("b"), mapping("b")], "user");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(
      request.mock.calls.filter(([, args]) => args.item_id === "a").length,
    ).toBeGreaterThan(1);
  });
});

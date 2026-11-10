const MINUTE = 60_000;
const MAX_STALE = 60 * MINUTE;

// Only catalog reads belong here. Playback, progress, library queries and
// recommendations must continue to reflect current server state.
const CATALOG_READS = new Map<string, number>([
  ["music/browse", MINUTE],
  ["music/albums/get_album", 5 * MINUTE],
  ["music/albums/album_tracks", 5 * MINUTE],
  ["music/albums/album_versions", 5 * MINUTE],
  ["music/artists/get_artist", 5 * MINUTE],
  ["music/artists/artist_albums", 5 * MINUTE],
  ["music/artists/artist_tracks", 5 * MINUTE],
  ["music/artists/top_albums", 5 * MINUTE],
  ["music/artists/top_tracks", 5 * MINUTE],
  ["music/artists/similar_artists", 5 * MINUTE],
  ["music/playlists/get_playlist", MINUTE],
  ["music/playlists/playlist_tracks", MINUTE],
  ["music/tracks/get_track", 5 * MINUTE],
]);

interface Entry {
  json: string;
  storedAt: number;
}

export function invalidatesCatalog(command: string): boolean {
  return (
    [
      "auth",
      "auth/login",
      "auth/logout",
      "auth/user/update",
      "translations/set_locale",
    ].includes(command) ||
    /^music\/(?:.*\/)?(?:add|remove|update|delete|create|import|refresh|mark|sync|set)(?:_|$)/.test(
      command,
    )
  );
}

/** A bounded, connection-local read-through cache with background revalidation. */
export class CatalogCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<string>>();
  private generation = 0;
  private size = 0;

  constructor(
    private maxEntries = 100,
    private maxSize = 8 * 1024 * 1024,
  ) {}

  clear(): void {
    this.generation++;
    this.entries.clear();
    this.pending.clear();
    this.size = 0;
  }

  read<Result>(
    command: string,
    args: Record<string, unknown> | undefined,
    load: (background: boolean) => Promise<Result>,
  ): Promise<Result> {
    const maxAge = CATALOG_READS.get(command);
    if (maxAge === undefined) return load(false);
    const refresh = args?.force_refresh === true || args?.refresh === true;
    // A forced read must neither join an older request nor let that request
    // repopulate the cache after the fresh result arrives.
    if (refresh) this.clear();
    const key = JSON.stringify([
      command,
      Object.entries(args || {})
        .filter(
          ([key, value]) =>
            value !== undefined && key !== "force_refresh" && key !== "refresh",
        )
        .sort(([a], [b]) => a.localeCompare(b)),
    ]);
    const cached = this.entries.get(key);
    const age = cached ? Date.now() - cached.storedAt : Infinity;
    if (cached && age < MAX_STALE) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      if (age >= maxAge)
        void this.fetch(key, load, true).catch(() => undefined);
      return Promise.resolve(JSON.parse(cached.json).value as Result);
    }
    return this.fetch(key, load, false).then(
      (json) => JSON.parse(json).value as Result,
    );
  }

  private fetch<Result>(
    key: string,
    load: (background: boolean) => Promise<Result>,
    background: boolean,
  ): Promise<string> {
    const pending = this.pending.get(key);
    if (pending) return pending;
    const generation = this.generation;
    const request = load(background)
      .then((result) => {
        const json = JSON.stringify({ value: result });
        // Do not retain null lookups or unbounded discographies. UTF-16 length is
        // a conservative bound for the retained string's memory footprint.
        if (
          result != null &&
          json.length * 2 <= this.maxSize / 2 &&
          generation === this.generation
        ) {
          this.remove(key);
          this.entries.set(key, { json, storedAt: Date.now() });
          this.size += json.length * 2;
          while (
            this.entries.size > this.maxEntries ||
            this.size > this.maxSize
          ) {
            this.remove(this.entries.keys().next().value!);
          }
        }
        return json;
      })
      .finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      });
    this.pending.set(key, request);
    return request;
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.size -= entry.json.length * 2;
    this.entries.delete(key);
  }
}

import type { CatalogEntry, CatalogStorage } from "./catalog-storage";

const MINUTE = 60_000;
const MAX_STALE = 24 * 60 * MINUTE;

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

/** Bounded read-through cache with optional disk persistence and background revalidation. */
export class CatalogCache {
  private entries = new Map<string, CatalogEntry>();
  private pending = new Map<string, Promise<string>>();
  private generation = 0;
  private size = 0;
  private scope?: string;
  private restoring?: Promise<void>;
  private saveTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private maxEntries = 300,
    private maxSize = 32 * 1024 * 1024,
    private storage?: CatalogStorage,
  ) {}

  setScope(scope: string | undefined): void {
    if (this.scope === scope) return;
    this.detach();
    this.scope = scope;
    if (!scope || !this.storage) return;
    const generation = this.generation;
    this.restoring = this.storage
      .load(scope)
      .then((entries) => {
        if (generation !== this.generation) return;
        for (const [key, entry] of entries) {
          try {
            const [command] = JSON.parse(key);
            if (
              !CATALOG_READS.has(command) ||
              typeof entry.json !== "string" ||
              !Number.isFinite(entry.storedAt) ||
              entry.storedAt > Date.now() ||
              Date.now() - entry.storedAt >= MAX_STALE ||
              JSON.parse(entry.json).value == null
            )
              continue;
            this.retain(key, entry);
          } catch {
            /* Ignore corrupt or incompatible cache entries. */
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (generation === this.generation) this.restoring = undefined;
      });
  }

  /** Drop connection state without deleting the last saved snapshot. */
  detach(): void {
    this.reset();
    this.scope = undefined;
  }

  clear(): void {
    this.reset();
    if (this.scope) void this.storage?.clear(this.scope).catch(() => undefined);
  }

  private reset(): void {
    this.generation++;
    this.entries.clear();
    this.pending.clear();
    this.size = 0;
    this.restoring = undefined;
    clearTimeout(this.saveTimer);
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
    if (this.restoring) {
      const generation = this.generation;
      return this.restoring.then(() => {
        if (generation !== this.generation)
          throw new Error("Catalog cache scope changed");
        return this.read(command, args, load);
      });
    }
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
          this.retain(key, { json, storedAt: Date.now() });
          this.scheduleSave();
        }
        return json;
      })
      .finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      });
    this.pending.set(key, request);
    return request;
  }

  private retain(key: string, entry: CatalogEntry): void {
    if (entry.json.length * 2 > this.maxSize / 2) return;
    this.remove(key);
    this.entries.set(key, entry);
    this.size += entry.json.length * 2;
    while (this.entries.size > this.maxEntries || this.size > this.maxSize)
      this.remove(this.entries.keys().next().value!);
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer);
    if (!this.scope || !this.storage) return;
    this.saveTimer = setTimeout(() => {
      void this.storage!.save(this.scope!, [...this.entries]).catch(
        () => undefined,
      );
    }, 250);
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.size -= entry.json.length * 2;
    this.entries.delete(key);
  }
}

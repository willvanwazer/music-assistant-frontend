import {
  MediaType,
  ArtistType,
  type Album,
  type Artist,
  type MediaItemTypeOrItemMapping,
  type Playlist,
} from "@/plugins/api/interfaces";

type HomeItem = MediaItemTypeOrItemMapping;
type Details = Album | Playlist | Artist;
export interface CatalogWarmRequest {
  command: string;
  args: Record<string, unknown>;
}
interface Job {
  item: HomeItem;
  phase: "details" | "tracks" | "done";
  retryAt: number;
  requests?: CatalogWarmRequest[];
}
interface Dependencies {
  request(command: string, args: Record<string, unknown>): Promise<unknown>;
  isSpotify(provider: string): boolean;
  isIdle(): boolean;
  artistRequests?(artist: Artist): CatalogWarmRequest[];
}

const REVISIT_MS = 5 * 60_000;
const MAX_ITEMS = 100;

/** Warm the detail-page cache for the current home selection, one request at a time. */
export class HomeCatalogWarmer {
  private jobs = new Map<string, Job>();
  private timer?: ReturnType<typeof setTimeout>;
  private busy = false;
  private stopped = false;
  private scope = "";

  constructor(private deps: Dependencies) {}

  update(items: readonly HomeItem[], scope: string): void {
    if (this.stopped) return;
    if (scope !== this.scope) this.jobs.clear();
    this.scope = scope;
    const next = new Map<string, Job>();
    const artists = items.flatMap((item) =>
      "artists" in item ? item.artists : [],
    );
    for (const item of [...items, ...artists]) {
      if (!this.isCandidate(item)) continue;
      const key = `${item.media_type}:${item.provider}:${item.item_id}`;
      if (!next.has(key)) {
        next.set(
          key,
          this.jobs.get(key) ?? { item, phase: "details", retryAt: 0 },
        );
      }
      if (next.size >= MAX_ITEMS) break;
    }
    this.jobs = next;
    this.schedule(1000);
  }

  stop(): void {
    this.stopped = true;
    this.jobs.clear();
    clearTimeout(this.timer);
  }

  private isCandidate(item: HomeItem): boolean {
    if (
      item.media_type !== MediaType.ALBUM &&
      item.media_type !== MediaType.PLAYLIST &&
      item.media_type !== MediaType.ARTIST
    )
      return false;
    if ("available" in item && !item.available) return false;
    if (
      "artist_type" in item &&
      [ArtistType.AUTHOR, ArtistType.NARRATOR].includes(item.artist_type)
    )
      return false;
    if (this.hasSpotify(item)) return true;
    if (item.media_type === MediaType.ARTIST && item.provider === "library")
      return true;
    // Slim library mappings need a local detail lookup to identify their sources.
    return item.provider === "library" && !("provider_mappings" in item);
  }

  private hasSpotify(item: HomeItem): boolean {
    return (
      this.deps.isSpotify(item.provider) ||
      ("provider_mappings" in item &&
        item.provider_mappings.some(
          (mapping) =>
            mapping.available && this.deps.isSpotify(mapping.provider_instance),
        ))
    );
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer);
    if (this.stopped || this.busy || !this.jobs.size) return;
    this.timer = setTimeout(() => void this.run(), delay);
  }

  private async run(): Promise<void> {
    if (this.stopped || this.busy) return;
    if (!this.deps.isIdle()) {
      this.schedule(1000);
      return;
    }
    const entry = [...this.jobs.entries()].find(
      ([, job]) => job.retryAt <= Date.now(),
    );
    if (!entry) {
      this.schedule(60_000);
      return;
    }
    const [key, job] = entry;
    if (job.phase === "done") job.phase = "details";
    const album = job.item.media_type === MediaType.ALBUM;
    const artist = job.item.media_type === MediaType.ARTIST;
    const args = {
      item_id: job.item.item_id,
      provider_instance_id_or_domain: job.item.provider,
    };
    this.busy = true;
    try {
      if (job.phase === "details") {
        const details = (await this.deps.request(
          artist
            ? "music/artists/get_artist"
            : album
              ? "music/albums/get_album"
              : "music/playlists/get_playlist",
          args,
        )) as Details;
        if (this.jobs.get(key) !== job) return;
        // A library mapping can resolve to a local-only or a dynamic playlist.
        // Only ordinary Spotify catalog items should cause speculative track reads.
        job.requests =
          artist && details
            ? (this.deps.artistRequests?.(details as Artist) ?? [])
            : details &&
                this.hasSpotify(details) &&
                !("is_dynamic" in details && details.is_dynamic)
              ? [
                  {
                    command: album
                      ? "music/albums/album_tracks"
                      : "music/playlists/playlist_tracks",
                    args: {
                      ...args,
                      ...(album
                        ? { in_library_only: false }
                        : { force_refresh: false }),
                    },
                  },
                ]
              : [];
        job.phase = job.requests.length ? "tracks" : "done";
      } else {
        const request = job.requests![0];
        await this.deps.request(request.command, request.args);
        job.requests!.shift();
        job.phase = job.requests!.length ? "tracks" : "done";
      }
      if (job.phase === "done") job.retryAt = Date.now() + REVISIT_MS;
    } catch {
      // Optional warming must not toast, spin on a failure, or stop the other cards.
      job.phase = "details";
      job.retryAt = Date.now() + REVISIT_MS;
    } finally {
      this.busy = false;
      this.schedule(1000);
    }
  }
}

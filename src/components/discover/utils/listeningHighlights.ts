import {
  MediaType,
  type MediaItemType,
  type MediaItemTypeOrItemMapping,
  type PodcastEpisode,
} from "@/plugins/api/interfaces";

export function podcastEpisodes(items: MediaItemType[]): PodcastEpisode[] {
  const seen = new Set<string>();
  return items.filter((item): item is PodcastEpisode => {
    if (item.media_type !== MediaType.PODCAST_EPISODE) return false;
    if ((item as PodcastEpisode).fully_played || seen.has(item.uri))
      return false;
    seen.add(item.uri);
    return true;
  });
}

/** Blend source recency ranks so neither local nor Spotify history buries the other. */
export function recentContainers(
  sources: MediaItemTypeOrItemMapping[][],
  limit = 20,
): MediaItemTypeOrItemMapping[] {
  const containers = sources.map((items) =>
    items.filter(
      (item) =>
        item.media_type === MediaType.ALBUM ||
        item.media_type === MediaType.PLAYLIST,
    ),
  );
  const seen = new Set<string>();
  const result: MediaItemTypeOrItemMapping[] = [];
  const longest = Math.max(0, ...containers.map((items) => items.length));
  for (let i = 0; i < longest; i++) {
    for (const items of containers) {
      const item = items[i];
      if (!item) continue;
      const keys = [item.uri];
      if ("provider_mappings" in item) {
        keys.push(
          ...item.provider_mappings.map(
            (mapping) =>
              `${mapping.provider_instance}://${item.media_type}/${mapping.item_id}`,
          ),
        );
      }
      const duplicate = keys.some((key) => seen.has(key));
      keys.forEach((key) => seen.add(key));
      if (duplicate) continue;
      result.push(item);
      if (result.length >= limit) return result;
    }
  }
  return result;
}

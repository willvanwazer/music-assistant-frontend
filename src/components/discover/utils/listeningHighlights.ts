import {
  MediaType,
  type MediaItemType,
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

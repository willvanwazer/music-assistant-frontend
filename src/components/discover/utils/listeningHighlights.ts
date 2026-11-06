import {
  MediaType,
  type ItemMapping,
  type MediaItemType,
  type Podcast,
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

export function activePodcastShows(
  episodes: PodcastEpisode[],
): Array<Podcast | ItemMapping> {
  const shows = new Map<string, Podcast | ItemMapping>();
  for (const episode of episodes) {
    const podcast = episode.podcast;
    if (!podcast || shows.has(podcast.uri)) continue;
    const image =
      "metadata" in podcast ? podcast.metadata?.images?.[0] : podcast.image;
    shows.set(podcast.uri, {
      ...podcast,
      image: image ?? episode.metadata?.images?.[0],
    });
  }
  return [...shows.values()];
}

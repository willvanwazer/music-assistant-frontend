import { describe, expect, it } from "vitest";
import {
  MediaType,
  type MediaItemType,
  type PodcastEpisode,
} from "@/plugins/api/interfaces";
import { activePodcastShows, podcastEpisodes } from "./listeningHighlights";

const episode = (id: string, show: string, fully_played = false) =>
  ({
    uri: `pocketcasts://podcast_episode/${id}`,
    name: id,
    media_type: MediaType.PODCAST_EPISODE,
    fully_played,
    podcast: {
      uri: `pocketcasts://podcast/${show}`,
      name: show,
      image: null,
      media_type: MediaType.PODCAST,
    },
    metadata: {
      images: [{ path: `${show}.jpg`, provider: "pocketcasts", type: "thumb" }],
    },
  }) as PodcastEpisode;

describe("podcast listening shelves", () => {
  it("preserves Up Next order, ignoring navigation folders, duplicates and completed episodes", () => {
    const first = episode("first", "show");
    const second = episode("second", "show");
    const folder = {
      media_type: MediaType.FOLDER,
      name: "..",
    } as MediaItemType;
    expect(
      podcastEpisodes([
        folder,
        first,
        second,
        first,
        episode("done", "show", true),
      ]),
    ).toEqual([first, second]);
  });
  it("shows each active podcast once with artwork from its in-progress episode", () => {
    const shows = activePodcastShows([
      episode("first", "A"),
      episode("second", "A"),
      episode("third", "B"),
    ]);
    expect(shows.map((show) => show.name)).toEqual(["A", "B"]);
    expect("image" in shows[0] && shows[0].image?.path).toBe("A.jpg");
  });
});

import { describe, expect, it } from "vitest";
import { recentContainers } from "@/components/discover/utils/listeningHighlights";
import {
  MediaType,
  type MediaItemTypeOrItemMapping,
  type ItemMapping,
} from "@/plugins/api/interfaces";

const album = (id: string, provider = "library") =>
  ({
    item_id: id,
    provider,
    uri: `${provider}://album/${id}`,
    name: id,
    media_type: MediaType.ALBUM,
  }) as ItemMapping;

describe("combined recent listening", () => {
  it("keeps both sources visible while deduplicating exact provider identities", () => {
    const local = {
      ...album("1"),
      provider_mappings: [{ provider_instance: "spotify--1", item_id: "a" }],
    } as MediaItemTypeOrItemMapping;
    const result = recentContainers(
      [
        [local, album("2"), album("3")],
        [album("a", "spotify--1"), album("b", "spotify--1")],
      ],
      3,
    );
    expect(result.map((item) => item.uri)).toEqual([
      "library://album/1",
      "library://album/2",
      "spotify--1://album/b",
    ]);
  });
  it("does not collapse different albums merely because their names match", () => {
    expect(
      recentContainers([[album("1")], [album("1", "spotify--1")]]),
    ).toHaveLength(2);
  });
  it("excludes tracks, artists and spoken word before applying the shelf limit", () => {
    const excluded = [
      MediaType.TRACK,
      MediaType.ARTIST,
      MediaType.AUDIOBOOK,
      MediaType.PODCAST_EPISODE,
    ].map((media_type) => ({ ...album(media_type), media_type }));
    expect(recentContainers([[...excluded, album("music")]], 1)).toEqual([
      album("music"),
    ]);
  });
});

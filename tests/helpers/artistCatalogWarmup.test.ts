import { describe, expect, it } from "vitest";
import { artistCatalogRequests } from "@/helpers/artistCatalogWarmup";
import {
  MediaType,
  ProviderFeature as Feature,
  type Artist,
  type ProviderInstance,
} from "@/plugins/api/interfaces";

const artist = {
  item_id: "library-id",
  provider: "library",
  media_type: MediaType.ARTIST,
  provider_mappings: [
    {
      item_id: "spotify-id",
      provider_instance: "spotify--one",
      available: true,
    },
  ],
} as Artist;
const providers = {
  "spotify--one": {
    instance_id: "spotify--one",
    domain: "spotify",
    available: true,
    supported_features: [Feature.ARTIST_ALBUMS, Feature.ARTIST_TOPTRACKS],
  },
  "lastfm--one": {
    instance_id: "lastfm--one",
    domain: "lastfm_recommendations",
    available: true,
    supported_features: [Feature.ARTIST_TOPTRACKS, Feature.SIMILAR_ARTISTS],
  },
} as unknown as Record<string, ProviderInstance>;

describe("artist catalog preloading", () => {
  it("uses exact Spotify discography and library Last.fm panel parameters", () => {
    const requests = artistCatalogRequests(artist, providers);
    expect(requests[0]).toMatchObject({
      command: "music/artists/top_tracks",
      args: { provider_filter: "lastfm--one" },
    });
    expect(requests).toContainEqual({
      command: "music/artists/artist_albums",
      args: {
        item_id: "spotify-id",
        provider_instance_id_or_domain: "spotify--one",
      },
    });
    expect(requests).toContainEqual({
      command: "music/artists/top_tracks",
      args: {
        item_id: "library-id",
        provider_instance_id_or_domain: "library",
        provider_filter: "lastfm--one",
      },
    });
    expect(requests).toContainEqual({
      command: "music/artists/similar_artists",
      args: {
        item_id: "library-id",
        provider_instance_id_or_domain: "library",
        provider_filter: "lastfm--one",
        limit: 25,
      },
    });
    expect(
      requests.some((request) => request.command.includes("audiobook")),
    ).toBe(false);
  });

  it("respects user provider restrictions and availability", () => {
    const requests = artistCatalogRequests(artist, providers, ["spotify--one"]);
    expect(JSON.stringify(requests)).not.toContain("lastfm");
    expect(
      artistCatalogRequests(
        artist,
        {
          ...providers,
          "spotify--one": { ...providers["spotify--one"], available: false },
        },
        ["spotify--one"],
      ),
    ).toHaveLength(2);
  });

  it("does not request a metadata provider for an artist outside the library", () => {
    const requests = artistCatalogRequests(
      { ...artist, item_id: "spotify-id", provider: "spotify--one" },
      providers,
    );
    expect(JSON.stringify(requests)).not.toContain("lastfm");
    expect(requests).toHaveLength(2);
  });
});

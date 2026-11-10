import {
  ProviderFeature,
  type Artist,
  type ProviderInstance,
} from "@/plugins/api/interfaces";
import type { CatalogWarmRequest } from "./homeCatalogWarmer";

/** Match the provider-specific keys used by the artist page, including Last.fm panels. */
export function artistCatalogRequests(
  artist: Artist,
  providers: Record<string, ProviderInstance>,
  providerFilter: string[] = [],
): CatalogWarmRequest[] {
  const requests: CatalogWarmRequest[] = [];
  const base = {
    item_id: artist.item_id,
    provider_instance_id_or_domain: artist.provider,
  };
  const allowed = (id: string) =>
    providers[id]?.available &&
    (!providerFilter.length || providerFilter.includes(id));
  const add = (command: string, args: Record<string, unknown>) =>
    requests.push({ command: `music/artists/${command}`, args });
  const mappings = artist.provider_mappings.filter(
    (mapping) => mapping.available && allowed(mapping.provider_instance),
  );
  if (artist.provider === "library") {
    for (const command of ["artist_albums", "artist_tracks"])
      for (const filter of [
        undefined,
        ...new Set(mappings.map((mapping) => mapping.provider_instance)),
      ])
        add(command, { ...base, provider_filter: filter });
  }
  for (const mapping of mappings) {
    const provider = providers[mapping.provider_instance];
    if (provider.domain !== "spotify") continue;
    for (const [feature, command] of [
      [ProviderFeature.ARTIST_ALBUMS, "artist_albums"],
      [ProviderFeature.ARTIST_TRACKS, "artist_tracks"],
    ] as const) {
      if (provider.supported_features.includes(feature))
        add(command, {
          item_id: mapping.item_id,
          provider_instance_id_or_domain: mapping.provider_instance,
        });
    }
  }
  for (const provider of Object.values(providers)) {
    if (!allowed(provider.instance_id)) continue;
    if (!["spotify", "lastfm_recommendations"].includes(provider.domain))
      continue;
    if (
      artist.provider !== "library" &&
      provider.instance_id !== artist.provider
    )
      continue;
    if (
      provider.domain === "spotify" &&
      !mappings.some(
        (mapping) => mapping.provider_instance === provider.instance_id,
      )
    )
      continue;
    for (const [feature, command] of [
      [ProviderFeature.ARTIST_TOPALBUMS, "top_albums"],
      [ProviderFeature.ARTIST_TOPTRACKS, "top_tracks"],
      [ProviderFeature.SIMILAR_ARTISTS, "similar_artists"],
    ] as const) {
      if (!provider.supported_features.includes(feature)) continue;
      add(command, {
        ...base,
        provider_filter:
          artist.provider === "library" ? provider.instance_id : undefined,
        ...(command === "similar_artists" ? { limit: 25 } : {}),
      });
    }
  }
  return requests;
}

import { onBeforeUnmount, watch, type ComputedRef } from "vue";
import { HomeCatalogWarmer } from "@/helpers/homeCatalogWarmer";
import { artistCatalogRequests } from "@/helpers/artistCatalogWarmup";
import api, { ConnectionState } from "@/plugins/api";
import type { MediaItemTypeOrItemMapping } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";

export function useHomeCatalogWarmup(
  items: ComputedRef<MediaItemTypeOrItemMapping[]>,
): void {
  const warmer = new HomeCatalogWarmer({
    request: (command, args) =>
      api.sendCommand(command, args, { suppressGlobalError: true }),
    isIdle: () => !document.hidden && api.canWarmCatalog(),
    artistRequests: (artist) =>
      artistCatalogRequests(
        artist,
        api.providers,
        store.currentUser?.provider_filter,
      ),
    isSpotify: (id) => {
      const provider = api.providers[id];
      const filter = store.currentUser?.provider_filter;
      return (
        provider?.domain === "spotify" &&
        provider.available &&
        (!filter?.length || filter.includes(id))
      );
    },
  });
  watch(
    () =>
      [
        items.value,
        api.state.value,
        store.currentUser?.user_id,
        store.currentUser?.provider_filter,
        api.serverInfo.value?.server_id,
      ] as const,
    ([cards, state, user, filter, server]) =>
      warmer.update(
        state === ConnectionState.INITIALIZED ? cards : [],
        JSON.stringify([server, user, filter, state]),
      ),
    { immediate: true },
  );
  onBeforeUnmount(() => warmer.stop());
}

<!--
  Global dialog to add item(s) to a playlist.
  Because this dialog can be called from various places throughout the app,
  we steer its visibility through the centralized eventbus.
-->
<template>
  <Sheet v-model:open="show">
    <SheetContent
      side="bottom"
      class="bg-popover flex h-[85vh] flex-col rounded-t-[20px] p-0"
    >
      <SheetHeader
        class="flex-row items-center gap-3 border-b border-border px-6 pt-5 pb-4"
      >
        <ListPlus class="text-subtle-foreground size-5 shrink-0" />
        <SheetTitle
          class="font-display text-[1.375rem] leading-tight font-medium tracking-[-0.01em]"
        >
          {{ $t("add_playlist") }}
        </SheetTitle>
      </SheetHeader>
      <SheetDescription class="sr-only">
        {{ $t("add_playlist") }}
      </SheetDescription>

      <ScrollArea class="h-full max-h-full overflow-hidden flex-1">
        <div class="playlist-list px-3 pt-3">
          <button
            v-for="playlist of playlists"
            :key="playlist.item_id"
            type="button"
            class="playlist-row"
            @click="addToPlaylist(playlist)"
          >
            <div class="playlist-row-art">
              <MediaItemThumb :item="playlist" :size="44" :rounded="false" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="playlist-row-title truncate">
                {{ playlist.name }}
              </div>
              <div class="playlist-row-meta truncate">
                {{ playlist.owner }}
              </div>
            </div>
            <provider-icon
              v-if="playlist.provider_mappings"
              :domain="playlist.provider_mappings[0].provider_domain"
              :size="18"
              class="shrink-0"
            />
          </button>

          <div class="px-2 py-3">
            <Separator />
          </div>

          <button
            v-for="providerId of createPlaylistProviders"
            :key="providerId"
            class="playlist-row"
            @click="newPlaylist(providerId)"
          >
            <div class="playlist-row-new">
              <provider-icon
                :domain="api.providers[providerId].domain"
                :size="24"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="playlist-row-title truncate">
                {{ $t("new_playlist") }}
              </div>
              <div class="playlist-row-meta truncate">
                {{ $t("create_playlist_on", [api.providers[providerId].name]) }}
              </div>
            </div>
            <provider-icon
              :domain="api.providers[providerId].domain"
              :size="18"
              class="shrink-0"
            />
          </button>
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import api from "@/plugins/api";
import type {
  MediaItemType,
  MediaItemTypeOrItemMapping,
  Playlist,
} from "@/plugins/api/interfaces";
import { MediaType, ProviderFeature } from "@/plugins/api/interfaces";
import { eventbus, PlaylistDialogEvent } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { ListPlus } from "@lucide/vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const show = ref<boolean>(false);
const playlists = ref<Playlist[]>([]);
const createPlaylistProviders = ref<string[]>([]);
const parentItem = ref<MediaItemType>();
const selectedItems = ref<MediaItemTypeOrItemMapping[]>([]);

watch(show, (open) => {
  store.dialogActive = open;
});

onMounted(() => {
  eventbus.on("playlistdialog", async (evt: PlaylistDialogEvent) => {
    show.value = true;
    selectedItems.value = evt.items;
    parentItem.value = evt.parentItem;
    await fetchPlaylists();
  });
  onBeforeUnmount(() => {
    eventbus.off("playlistdialog");
  });
});

const fetchPlaylists = async function () {
  // get all (editable) playlists that are suitable as target
  playlists.value = [];
  createPlaylistProviders.value = [];
  const playlistResults = await api.getLibraryPlaylists(
    undefined,
    undefined,
    undefined,
  );
  const selected = selectedItems.value.length
    ? selectedItems.value[0]
    : undefined;

  if (!selected) return;
  // an itemmapping carries no provider mappings, resolve it to the full item
  const refItem =
    "provider_mappings" in selected
      ? selected
      : await api.getItem(
          selected.media_type,
          selected.item_id,
          selected.provider,
        );
  // a browse folder has no provider mappings and can not be added to a playlist
  if (!("provider_mappings" in refItem)) return;

  for (const playlist of playlistResults) {
    // skip unavailable playlists
    if (!playlist.provider_mappings.filter((x) => x.available).length) continue;
    // skip non-editable playlists
    if (!playlist.is_editable) continue;
    // skip playlist that is currently opened (=parentItem)
    if (
      parentItem.value &&
      parentItem.value.media_type === MediaType.PLAYLIST &&
      playlist.item_id === parentItem.value.item_id
    )
      continue;
    const _supported_mediatypes = playlist.supported_mediatypes;
    if (_supported_mediatypes.includes(MediaType.TRACK))
      // backend unwraps albums to individual tracks
      _supported_mediatypes.push(MediaType.ALBUM);
    if (!_supported_mediatypes.includes(refItem.media_type)) {
      // target playlist doesn't support media type
      continue;
    }

    const playListProvider =
      api.providers[playlist.provider_mappings[0].provider_instance];

    // either the refItem has a provider match or builtin provider or streaming provider
    if (
      playListProvider &&
      (playListProvider.domain == "builtin" ||
        playListProvider.is_streaming_provider ||
        refItem?.provider_mappings.filter(
          (x) => x.provider_instance == playListProvider.instance_id,
        ).length)
    ) {
      playlists.value.push(playlist);
    }
  }
  // determine which providers may be used to create a new playlist
  for (const provider of Object.values(api.providers)) {
    // filter suitable create provider base on media_type
    if (
      // album is unwrapped to individual tracks by backend
      (refItem.media_type == MediaType.TRACK ||
        refItem.media_type == MediaType.ALBUM) &&
      !provider.supported_features.includes(ProviderFeature.PLAYLIST_CREATE) &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_TRACKS,
      )
    )
      continue;
    if (
      refItem.media_type == MediaType.AUDIOBOOK &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_AUDIOBOOKS,
      )
    )
      continue;
    if (
      refItem.media_type == MediaType.PODCAST_EPISODE &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_PODCAST_EPISODES,
      )
    )
      continue;
    if (
      refItem.media_type == MediaType.RADIO &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_RADIOS,
      )
    )
      continue;
    if (
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_TRACKS_EDIT,
      )
    )
      continue;
    // either the refItem has a provider match or builtin provider
    if (
      provider.domain == "builtin" ||
      provider.is_streaming_provider ||
      refItem?.provider_mappings.filter(
        (x) => x.provider_instance == provider.instance_id,
      ).length
    ) {
      createPlaylistProviders.value.push(provider.instance_id);
    }
  }
};
const addToPlaylist = async function (value: MediaItemType) {
  // add item(s) to playlist
  api.addPlaylistTracks(
    value.item_id,
    selectedItems.value.map((x) => x.uri),
  );
  close();
};
const newPlaylist = async function (provId: string) {
  const refItem = selectedItems.value.length
    ? selectedItems.value[0]
    : undefined;
  if (!refItem) return;
  const provider = api.getProvider(provId);
  if (!provider) return;
  const name = prompt($t("new_playlist_name"));
  if (!name) return;

  let supportedMediaTypes: MediaType[] = [];
  if (
    provider.supported_features.includes(ProviderFeature.PLAYLIST_CREATE_MIXED)
  ) {
    // if the provider supports mixed playlists, we always create a playlist for all
    // supported media types
    if (
      provider.supported_features.includes(ProviderFeature.PLAYLIST_CREATE) ||
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_TRACKS,
      )
    )
      supportedMediaTypes.push(MediaType.TRACK);
    if (
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_AUDIOBOOKS,
      )
    )
      supportedMediaTypes.push(MediaType.AUDIOBOOK);
    if (
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_PODCAST_EPISODES,
      )
    )
      supportedMediaTypes.push(MediaType.PODCAST_EPISODE);
    if (
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_RADIOS,
      )
    )
      supportedMediaTypes.push(MediaType.RADIO);
  } else {
    // otherwise the playlist must support the mediatype of the selected item
    supportedMediaTypes = [refItem.media_type];
  }
  const newPlaylist = await api.createPlaylist(
    name,
    provId,
    supportedMediaTypes,
  );
  addToPlaylist(newPlaylist);
};

const close = function () {
  show.value = false;
};
</script>

<style scoped>
.playlist-list {
  padding-bottom: calc(2rem + var(--device-inset-bottom));
}

.playlist-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.playlist-row:hover,
.playlist-row:focus-visible {
  background: color-mix(in oklab, var(--foreground) 5%, transparent);
  outline: none;
}

/* covers stay square and whole */
.playlist-row-art {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 3px;
}

.playlist-row-new {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--secondary);
}

.playlist-row-title {
  color: var(--foreground);
  font-size: 0.84375rem;
  font-weight: 600;
}

.playlist-row-meta {
  color: var(--subtle-foreground);
  font-size: 0.75rem;
}
</style>

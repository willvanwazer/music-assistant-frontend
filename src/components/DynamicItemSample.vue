<template>
  <div>
    <div class="flex items-center gap-3.5 px-2.5 pt-3">
      <div class="dynamic-badge flex items-center justify-center">
        <v-icon icon="mdi-shuffle-variant" size="20" color="primary" />
      </div>
      <div class="min-w-0">
        <div class="dynamic-heading ma-display">
          {{
            $t(
              isPlaylist
                ? "smart_playlist.dynamic_sample_heading"
                : "dynamic_radio_heading",
            )
          }}
        </div>
        <div class="text-muted-foreground mt-0.5 text-[13px]">
          {{ $t("smart_playlist.dynamic_sample_note") }}
        </div>
      </div>
    </div>

    <div class="px-2.5 pt-4">
      <Separator />
    </div>

    <div class="px-2.5 pt-3 pb-2">
      <template v-if="loading">
        <ListViewSkeleton v-for="n in 8" :key="'skeleton-list-' + n" />
      </template>

      <template v-else-if="tracks.length">
        <ListviewItem
          v-for="item in tracks"
          :key="item.uri"
          :item="item"
          :is-selected="false"
          :is-available="itemIsAvailable(item)"
          :is-playing="isPlaying(item)"
          :show-track-number="false"
          :show-provider="false"
          :show-favorite="false"
          :show-menu="item.is_playable"
        />
      </template>

      <Empty v-else class="border-none mt-2 mx-2">
        <EmptyMedia variant="icon">
          <Music2 class="h-5 w-5" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{{ $t("smart_playlist.empty_title") }}</EmptyTitle>
          <EmptyDescription>
            {{
              $t(
                isPlaylist
                  ? "smart_playlist.empty_desc"
                  : "dynamic_radio_empty_desc",
              )
            }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent v-if="isPlaylist">
          <Button variant="outline" size="sm" @click="emit('edit-rules')">
            <SlidersHorizontal class="h-3.5 w-3.5 mr-1.5" />
            {{ $t("smart_playlist.edit_rules") }}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import ListviewItem from "@/components/ListviewItem.vue";
import ListViewSkeleton from "@/components/skeletons/ListViewSkeleton.vue";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { api } from "@/plugins/api";
import { itemIsAvailable } from "@/plugins/api/helpers";
import {
  MediaType,
  PlaybackState,
  type Audiobook,
  type MediaItemType,
  type Playlist,
  type PodcastEpisode,
  type Radio,
  type Track,
} from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { Music2, SlidersHorizontal } from "@lucide/vue";
import { computed, ref, watch } from "vue";

export interface Props {
  itemDetails: Playlist | Radio;
  provider: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: "edit-rules"): void }>();

const isPlaylist = computed(
  () => props.itemDetails.media_type === MediaType.PLAYLIST,
);

const loading = ref(true);
const tracks = ref<(Track | Radio | PodcastEpisode | Audiobook)[]>([]);

const loadSample = async function () {
  loading.value = true;
  try {
    // request a fresh evaluation: the overview should show a current sample rather than
    // a (possibly stale/empty) cached browse result.
    const result = isPlaylist.value
      ? await api.getPlaylistTracks(
          props.itemDetails.item_id,
          props.provider,
          false,
        )
      : await api.getRadioTracks(props.itemDetails.item_id, props.provider);
    // the provider returns a bounded sample for dynamic sources; cap defensively
    tracks.value = result.slice(0, 25);
  } catch {
    tracks.value = [];
  } finally {
    loading.value = false;
  }
};

// reflect the currently playing track, like the rest of the app
const isPlaying = function (item: MediaItemType): boolean {
  if (store.activePlayer?.playback_state != PlaybackState.PLAYING) return false;
  const current = store.curQueueItem?.media_item;
  if (!current) return false;
  return item.item_id === current.item_id;
};

watch(
  () => [props.itemDetails.item_id, props.provider],
  (val) => {
    if (val[0]) loadSample();
  },
  { immediate: true },
);
</script>

<style scoped>
/* a round soft-accent badge marks the sample as generated */
.dynamic-badge {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary) 16%, transparent);
}

/* a section heading, like the listings' */
.dynamic-heading {
  font-size: 26px;
  line-height: 1.2;
}

@media (max-width: 539px) {
  .dynamic-heading {
    font-size: 22px;
  }
}
</style>

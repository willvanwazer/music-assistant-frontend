<template>
  <div class="listening-highlights">
    <EditorialShelf
      :title="$t('listening_home.recent_title')"
      :tiles-per-view="tilesPerView"
    >
      <template #actions>
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="$t('refresh')"
          :disabled="refreshing"
          @click="refresh"
        >
          <RefreshCw :class="{ 'animate-spin': refreshing }" />
        </Button>
      </template>
      <template v-if="loading">
        <EditorialCardSkeleton v-for="n in 4" :key="n" />
      </template>
      <template v-else>
        <EditorialMediaCard
          v-for="item in recent"
          :key="item.uri"
          :item="item"
        />
        <p v-if="!recent.length" class="listening-empty" role="status">
          {{
            $t(
              recentError
                ? "listening_home.recent_error"
                : "listening_home.recent_empty",
            )
          }}
        </p>
      </template>
    </EditorialShelf>

    <section
      aria-labelledby="listening-podcasts-title"
      class="listening-podcasts"
    >
      <header class="listening-podcasts__heading">
        <div class="listening-podcasts__titles">
          <h2 id="listening-podcasts-title">{{ $t("podcasts") }}</h2>
          <p>{{ $t("listening_home.podcasts_subtitle") }}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="listening-more"
          @click="router.push({ name: 'podcasts' })"
        >
          {{ $t("listening_home.all_podcasts") }}
          <ArrowRight class="size-3.5" />
        </Button>
      </header>
      <EditorialShelf
        :title="$t('listening_home.up_next')"
        :tiles-per-view="tilesPerView"
      >
        <template v-if="loading"
          ><EditorialCardSkeleton v-for="n in 4" :key="n"
        /></template>
        <template v-else>
          <EditorialMediaCard
            v-for="episode in upNext"
            :key="episode.uri"
            :item="episode"
          >
            <template #subtitle>{{ episode.podcast.name }}</template>
          </EditorialMediaCard>
          <p v-if="!upNext.length" class="listening-empty" role="status">
            {{
              $t(
                queueError
                  ? "listening_home.queue_error"
                  : "listening_home.queue_empty",
              )
            }}
          </p>
        </template>
      </EditorialShelf>
      <EditorialShelf
        :title="$t('listening_home.continue_listening')"
        :subtitle="$t('listening_home.continue_subtitle')"
        :tiles-per-view="tilesPerView"
      >
        <template v-if="loading"
          ><EditorialCardSkeleton v-for="n in 4" :key="n"
        /></template>
        <template v-else>
          <EditorialMediaCard
            v-for="episode in inProgress"
            :key="episode.uri"
            :item="episode"
          >
            <template #subtitle>
              {{ episode.podcast.name }}
              <span v-if="episode.resume_position_ms" class="episode-progress">
                {{ formatDuration(episode.resume_position_ms / 1000) }}
                <template v-if="episode.duration">
                  / {{ formatDuration(episode.duration) }}</template
                >
                <progress
                  v-if="episode.duration"
                  :value="episode.resume_position_ms / 1000"
                  :max="episode.duration"
                  :aria-label="$t('item_in_progress')"
                ></progress>
              </span>
            </template>
          </EditorialMediaCard>
          <p v-if="!inProgress.length" class="listening-empty" role="status">
            {{
              $t(
                progressError
                  ? "listening_home.progress_error"
                  : "listening_home.progress_empty",
              )
            }}
          </p>
        </template>
      </EditorialShelf>
      <p
        v-if="
          !loading &&
          (queueError || progressError) &&
          (upNext.length || inProgress.length)
        "
        class="listening-warning"
        role="status"
      >
        {{ $t("listening_home.partial_error") }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, RefreshCw } from "@lucide/vue";
import api from "@/plugins/api";
import { store } from "@/plugins/store";
import {
  EventType,
  type ItemMapping,
  type PodcastEpisode,
} from "@/plugins/api/interfaces";
import { formatDuration, shelfTilesPerView } from "@/helpers/utils";
import { Button } from "@/components/ui/button";
import EditorialShelf from "./EditorialShelf.vue";
import EditorialMediaCard from "./EditorialMediaCard.vue";
import EditorialCardSkeleton from "./EditorialCardSkeleton.vue";
import { podcastEpisodes } from "./utils/listeningHighlights";

const router = useRouter();
const loading = ref(true);
const refreshing = ref(false);
const recent = ref<ItemMapping[]>([]);
const upNext = ref<PodcastEpisode[]>([]);
const inProgress = ref<PodcastEpisode[]>([]);
const recentError = ref(false);
const queueError = ref(false);
const progressError = ref(false);
const tilesPerView = computed(() => shelfTilesPerView());
const podcastProviders = computed(() =>
  Object.values(api.providers).filter(
    (provider) =>
      provider.domain === "pocketcasts" &&
      provider.available &&
      (!store.currentUser?.provider_filter?.length ||
        store.currentUser.provider_filter.includes(provider.instance_id)),
  ),
);
let generation = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

async function refresh() {
  const current = ++generation;
  refreshing.value = true;
  const sources = podcastProviders.value;
  const [history, queue, progress] = await Promise.all([
    Promise.allSettled([api.getRecentlyPlayedAlbumsAndPlaylists()]),
    Promise.allSettled(
      sources.map((provider) =>
        api.browse(`${provider.instance_id}://up_next`),
      ),
    ),
    Promise.allSettled(
      sources.map((provider) =>
        api.browse(`${provider.instance_id}://in_progress`),
      ),
    ),
  ]);
  if (current !== generation) return;
  recentError.value = history[0].status === "rejected";
  if (history[0].status === "fulfilled") recent.value = history[0].value;
  queueError.value = queue.some((result) => result.status === "rejected");
  progressError.value = progress.some((result) => result.status === "rejected");
  upNext.value = podcastEpisodes(
    queue.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  );
  inProgress.value = podcastEpisodes(
    progress.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  );
  loading.value = false;
  refreshing.value = false;
}

function refreshVisible() {
  if (document.visibilityState !== "hidden" && !refreshing.value)
    void refresh();
}

function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    refreshVisible();
  }, 3000);
}

const unsubscribePlaylog = api.subscribe(
  EventType.PLAYLOG_UPDATED,
  scheduleRefresh,
);
const unsubscribeConnected = api.subscribe(
  EventType.CONNECTED,
  scheduleRefresh,
);
watch(
  () => [
    store.currentUser?.user_id,
    ...podcastProviders.value.map((p) => p.instance_id),
  ],
  () => {
    recent.value = [];
    upNext.value = [];
    inProgress.value = [];
    loading.value = true;
    void refresh();
  },
);

onMounted(() => {
  void refresh();
  timer = setInterval(refreshVisible, 60000);
  window.addEventListener("focus", refreshVisible);
  document.addEventListener("visibilitychange", refreshVisible);
});
onBeforeUnmount(() => {
  generation++;
  clearInterval(timer);
  clearTimeout(refreshTimer);
  unsubscribePlaylog();
  unsubscribeConnected();
  window.removeEventListener("focus", refreshVisible);
  document.removeEventListener("visibilitychange", refreshVisible);
});
</script>

<style scoped>
/* Listening: recent albums and playlists, then the Podcasts group. The group
   heading is a section heading; its two shelves sit under it one step
   smaller, so the hierarchy reads without rules or boxes. */
.listening-highlights {
  padding-top: 8px;
}
.listening-podcasts {
  margin: 0 0 10px;
}
.listening-podcasts__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
  margin: 0 var(--ed-page-gutter, 28px) 14px;
}
.listening-podcasts__titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 14px;
  row-gap: 2px;
  min-width: 0;
}
.listening-podcasts__heading h2 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 26px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--foreground);
}
.listening-podcasts__heading p {
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: var(--subtle-foreground);
}
/* the quiet "see all" pill */
.listening-more {
  flex-shrink: 0;
  height: 30px;
  padding-inline: 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted-foreground);
  border-color: color-mix(in oklab, var(--foreground) 14%, transparent);
}
.listening-more:hover {
  color: var(--foreground);
}
/* the group's shelves name their part of it, one step below the heading */
.listening-podcasts :deep(.ed-shelf__title) {
  font-size: 20px;
}
.listening-podcasts .ed-shelf {
  margin-bottom: 22px;
}
.listening-empty {
  width: 100%;
  min-height: 64px;
  padding: 20px 8px;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
.listening-warning {
  margin: 0 var(--ed-page-gutter, 28px) 24px;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
.episode-progress {
  display: block;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--subtle-foreground);
}
/* a hairline progress bar, like the room cards' */
.episode-progress progress {
  display: block;
  width: 100%;
  height: 3px;
  margin-top: 6px;
  border: 0;
  border-radius: 2px;
  overflow: hidden;
  appearance: none;
  background: color-mix(in oklab, var(--foreground) 12%, transparent);
  accent-color: var(--primary);
}
.episode-progress progress::-webkit-progress-bar {
  background: color-mix(in oklab, var(--foreground) 12%, transparent);
}
.episode-progress progress::-webkit-progress-value {
  background: var(--primary);
  border-radius: 2px;
}
.episode-progress progress::-moz-progress-bar {
  background: var(--primary);
  border-radius: 2px;
}
@media (max-width: 600px) {
  .listening-podcasts__heading {
    margin-inline: 16px;
    margin-bottom: 6px;
  }
  .listening-podcasts__heading h2 {
    font-size: 21px;
  }
  .listening-podcasts__heading p {
    font-size: 12px;
  }
  .listening-podcasts :deep(.ed-shelf__title) {
    font-size: 17px;
  }
  .listening-podcasts .ed-shelf {
    margin-bottom: 14px;
  }
}
</style>

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
        <div>
          <h2 id="listening-podcasts-title">{{ $t("podcasts") }}</h2>
          <p>{{ $t("listening_home.podcasts_subtitle") }}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          @click="router.push({ name: 'podcasts' })"
        >
          {{ $t("listening_home.all_podcasts") }} <ArrowRight class="size-4" />
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
        :title="$t('listening_home.active_podcasts')"
        :subtitle="$t('listening_home.active_subtitle')"
        :tiles-per-view="tilesPerView"
      >
        <template v-if="loading"
          ><EditorialCardSkeleton v-for="n in 4" :key="n"
        /></template>
        <template v-else>
          <EditorialMediaCard
            v-for="podcast in activeShows"
            :key="podcast.uri"
            :item="podcast"
          />
          <p v-if="!activeShows.length" class="listening-empty" role="status">
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
          (upNext.length || activeShows.length)
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
import { panelViewItemResponsive } from "@/helpers/utils";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { Button } from "@/components/ui/button";
import EditorialShelf from "./EditorialShelf.vue";
import EditorialMediaCard from "./EditorialMediaCard.vue";
import EditorialCardSkeleton from "./EditorialCardSkeleton.vue";
import {
  activePodcastShows,
  podcastEpisodes,
} from "./utils/listeningHighlights";

const router = useRouter();
const loading = ref(true);
const refreshing = ref(false);
const recent = ref<ItemMapping[]>([]);
const upNext = ref<PodcastEpisode[]>([]);
const inProgress = ref<PodcastEpisode[]>([]);
const recentError = ref(false);
const queueError = ref(false);
const progressError = ref(false);
const activeShows = computed(() => activePodcastShows(inProgress.value));
const tilesPerView = computed(() =>
  getBreakpointValue({ breakpoint: "bp1", condition: "lt" })
    ? 2.2
    : panelViewItemResponsive(0) + 0.5,
);
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
.listening-highlights {
  padding-top: 20px;
}
.listening-podcasts {
  margin: 0 0 24px;
}
.listening-podcasts__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 8px 28px 0;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.listening-podcasts__heading h2 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.listening-podcasts__heading p {
  color: var(--muted-foreground);
  font-size: 0.875rem;
  margin-top: 4px;
}
.listening-empty {
  width: 100%;
  min-height: 64px;
  padding: 20px 0;
  color: var(--muted-foreground);
  font-size: 0.9rem;
}
.listening-warning {
  margin: 0 28px;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
@media (max-width: 600px) {
  .listening-podcasts__heading {
    margin-inline: 16px;
    align-items: flex-start;
  }
  .listening-podcasts__heading h2 {
    font-size: 1.3rem;
  }
}
</style>

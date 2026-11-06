<template>
  <!-- now playing media -->
  <v-list-item
    class="player-track-details"
    :class="{ 'player-track-details--compact': props.compact }"
    style="height: auto; margin: 0px; padding: 0px"
    lines="two"
  >
    <template #prepend>
      <div
        class="media-thumb player-media-thumb"
        :class="{ 'player-media-thumb--compact': props.compact }"
        :style="`cursor: pointer; height: ${outerThumbSizePx}px; width: ${outerThumbSizePx}px;`"
        @click.stop="openPlayer"
      >
        <!-- player.current_media has content loaded (will work for all sources)  -->
        <div
          v-if="
            store.activePlayer?.powered != false &&
            store.activePlayer?.current_media?.image_url
          "
          class="player-media-thumb-art w-full h-full"
        >
          <v-img
            class="media-thumb"
            :src="getMediaImageUrl(store.activePlayer.current_media.image_url)"
            :alt="$t('tooltip.artwork')"
          />
          <!-- the artwork already opens the player; this only says so on hover -->
          <span
            v-if="!props.compact"
            class="player-media-thumb-expand"
            aria-hidden="true"
          >
            <Maximize2 :size="20" />
          </span>
        </div>
        <!-- fallback: display player icon -->
        <div
          v-else
          class="icon-thumb"
          :style="`height: ${fallbackThumbSizePx}px; width: ${fallbackThumbSizePx}px;`"
        >
          <PlayerIcon
            :icon="store.activePlayer?.icon"
            :grouped="
              store.activePlayer?.type == PlayerType.PLAYER &&
              !!store.activePlayer?.group_members.length
            "
            :size="props.compact ? 22 : 32"
          />
        </div>
      </div>
    </template>

    <!-- title -->
    <template #title>
      <div
        :style="{
          cursor: 'pointer',
          color: primaryColor,
        }"
        class="d-flex align-center"
        @click.stop="openPlayer"
      >
        <!-- no player selected message -->
        <div v-if="!store.activePlayer">
          {{ $t("no_player") }}
        </div>
        <!-- player powered off: show the name so it's clear which player is off -->
        <div
          v-else-if="store.activePlayer.powered == false"
          class="ma-line-clamp-1"
        >
          {{ store.activePlayer.name }}
        </div>
        <!-- track title -->
        <div
          v-else-if="store.activePlayer.current_media?.title"
          class="ma-line-clamp-1 ma-display player-track-title"
          style="min-width: 0"
          @click.stop="onTitleClick"
        >
          <MarqueeText :sync="marqueeSync">
            {{ store.activePlayer.current_media.title }}
          </MarqueeText>
        </div>
        <!-- queue ended message: the queue is still there, it just finished -->
        <div v-else-if="queueEnded" class="ma-line-clamp-1">
          {{ $t("queue_ended") }}
        </div>
        <!-- queue empty message -->
        <div
          v-else-if="
            store.activePlayerQueue && store.activePlayerQueue.items == 0
          "
          class="ma-line-clamp-1"
        >
          {{ $t("queue_empty") }}
        </div>
        <!-- fallback: player name, so the title never renders blank -->
        <div v-else class="ma-line-clamp-1">
          {{ store.activePlayer.name }}
        </div>
      </div>
    </template>
    <!-- append chip(s): quality -->
    <template #append>
      <!-- format -->
      <div
        v-if="
          hasActiveAudioPath &&
          !getBreakpointValue({ breakpoint: 'phone' }) &&
          showQualityDetailsBtn
        "
        class="pl-4"
      >
        <QualityDetailsBtn />
      </div>
    </template>
    <!-- subtitle: off state or artist(s) + album, led by the active source -->
    <template #subtitle>
      <div class="player-track-subtitle">
        <div class="player-track-subtitle-line">
          <!-- the floating card says which room it plays in, as the full bar
               does with its player button -->
          <span v-if="roomName" class="player-track-room">{{ roomName }}</span>
          <span
            v-if="roomName && hasSubtitleMeta"
            class="player-track-room-separator"
            aria-hidden="true"
            >·</span
          >
          <!-- the external source; the compact bar only has room for its icon -->
          <NowPlayingSourceBadge
            v-if="props.compact"
            icon-only
            plain
            class="player-track-source"
          />
          <!-- player powered off -->
          <div
            v-if="store.activePlayer?.powered == false"
            style="cursor: pointer"
            @click.stop="store.showPlayersMenu = true"
          >
            {{ $t("off") }}
          </div>
          <button
            v-else-if="currentChapter"
            type="button"
            class="player-track-chapter-button"
            @click.stop="store.showFullscreenPlayer = true"
          >
            <div class="ma-line-clamp-1">
              <MarqueeText :sync="marqueeSync">
                {{ currentChapter.chapter.name }}
              </MarqueeText>
            </div>
          </button>
          <div
            v-else-if="
              store.activePlayer?.current_media?.title &&
              (store.activePlayer?.current_media?.artist || albumSubtitle)
            "
            class="player-track-subtitle-text"
            style="cursor: pointer"
            @click.stop="store.showFullscreenPlayer = true"
          >
            <div class="ma-line-clamp-1">
              <MarqueeText :sync="marqueeSync">
                <!-- artists(s) + album -->
                <span
                  v-if="
                    store.activePlayer?.current_media?.artist &&
                    albumSubtitle &&
                    !props.showOnlyArtist
                  "
                >
                  {{ store.activePlayer?.current_media?.artist }} ·
                  {{ albumSubtitle }}
                </span>
                <!-- artists(s) only -->
                <span v-else-if="store.activePlayer?.current_media?.artist">
                  {{ store.activePlayer?.current_media?.artist }}
                </span>
                <!-- album only -->
                <span v-else-if="albumSubtitle">
                  {{ albumSubtitle }}
                </span>
              </MarqueeText>
            </div>
          </div>
        </div>
        <!-- the full bar has the height for the source to take a line of its
             own under the track metadata; plain, so it aligns with the text
             above instead of hanging indented in its pill -->
        <NowPlayingSourceBadge
          v-if="!props.compact"
          plain
          class="player-track-source"
        />
      </div>
    </template>
  </v-list-item>
  <PlayerFullscreen :color-palette="colorPalette" />
</template>

<script setup lang="ts">
import MarqueeText from "@/components/MarqueeText.vue";
import PlayerIcon from "@/components/PlayerIcon.vue";
import QualityDetailsBtn from "@/components/QualityDetailsBtn.vue";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import { openCurrentTrackDetails } from "@/helpers/now_playing";
import { isQueueEnded } from "@/helpers/queue_position";
import { resolveActiveElapsedTime } from "@/helpers/activeElapsedTime";
import { resolveCurrentChapter } from "@/helpers/chapters";
import { ImageColorPalette, getMediaImageUrl } from "@/helpers/utils";
import { MediaType, PlaybackState, PlayerType } from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { store } from "@/plugins/store";
import { computed, onUnmounted, ref, watch } from "vue";
import { useUserPreferences } from "@/composables/userPreferences";
import { useActiveAudioPath } from "@/composables/useActiveAudioPath";
import { useNowPlayingSource } from "@/composables/nowPlayingSource";
import { Maximize2 } from "@lucide/vue";
import NowPlayingSourceBadge from "./NowPlayingSourceBadge.vue";
import PlayerFullscreen from "./PlayerFullscreen.vue";

const marqueeSync = new MarqueeTextSync();
const { getPreference } = useUserPreferences();
const showChapterProgress = getPreference("audiobook_chapter_progress", true);

const nowTick = ref(0);
let chapterTimer: ReturnType<typeof setInterval> | null = null;
const currentChapter = computed(() => {
  void nowTick.value;
  const media = store.activePlayer?.current_media;
  const queueItem = store.curQueueItem;
  if (
    !showChapterProgress.value ||
    media?.media_type !== MediaType.AUDIOBOOK ||
    (media.queue_item_id !== null &&
      media.queue_item_id !== queueItem?.queue_item_id)
  ) {
    return undefined;
  }
  return resolveCurrentChapter(
    queueItem?.media_item?.metadata?.chapters,
    resolveActiveElapsedTime(),
    media.duration,
  );
});

const chapterTimerNeeded = computed(
  () =>
    showChapterProgress.value &&
    store.activePlayer?.playback_state === PlaybackState.PLAYING &&
    !!currentChapter.value,
);

const updateChapterTimer = (needed: boolean) => {
  if (needed && chapterTimer === null) {
    chapterTimer = setInterval(() => {
      nowTick.value = Date.now();
    }, 1000);
  } else if (!needed && chapterTimer !== null) {
    clearInterval(chapterTimer);
    chapterTimer = null;
  }
};

watch(chapterTimerNeeded, updateChapterTimer, { immediate: true });

onUnmounted(() => updateChapterTimer(false));

const queueEnded = computed(() => isQueueEnded(store.activePlayerQueue));

const { albumSubtitle, nowPlayingSource } = useNowPlayingSource();
const { hasActiveAudioPath } = useActiveAudioPath();

// properties
interface Props {
  showOnlyArtist?: boolean;
  showQualityDetailsBtn?: boolean;
  colorPalette: ImageColorPalette;
  primaryColor?: string;
  /** Smaller artwork and a shallower row, for the floating mobile player. */
  compact?: boolean;
  /**
   * Send the track title to its detail page rather than to the full screen
   * player. The floating mobile bar leaves it off: the title is most of the
   * card there, and the card as a whole is what opens the player.
   */
  titleOpensDetails?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showOnlyArtist: false,
  showQualityDetailsBtn: true,
  primaryColor: "",
  compact: false,
  titleOpensDetails: false,
});

// size of the clickable artwork area; cover art fills this via its
// w-full h-full wrapper, so this is also the real artwork size
const outerThumbSizePx = computed(() => {
  if (props.compact) return 46;
  return getBreakpointValue({ breakpoint: "phone" }) ? 60 : 62;
});

// the icon fallback (no cover art) has its own fixed size, independent of
// the breakpoint-driven outer container
const fallbackThumbSizePx = computed(() => (props.compact ? 46 : 60));

// Where the title is the player's own name (off, or nothing else to name) the
// room is already said; everywhere else the compact card names it under the
// track, since it has no player button of its own beside it.
const roomName = computed(() => {
  const player = store.activePlayer;
  if (!props.compact || !player || player.powered == false) return undefined;
  const titleNamesSomethingElse =
    !!player.current_media?.title ||
    queueEnded.value ||
    (!!store.activePlayerQueue && store.activePlayerQueue.items == 0);
  return titleNamesSomethingElse ? player.name : undefined;
});

// whether anything follows the room on its line, so the separator never
// dangles at the end of it
const hasSubtitleMeta = computed(
  () =>
    !!nowPlayingSource.value ||
    !!currentChapter.value ||
    (!!store.activePlayer?.current_media?.title &&
      (!!store.activePlayer.current_media.artist || !!albumSubtitle.value)),
);

function openPlayer() {
  if (!store.activePlayer || store.activePlayer.powered == false) {
    store.showPlayersMenu = true;
  } else {
    store.showFullscreenPlayer = true;
  }
}

function onTitleClick() {
  if (props.titleOpensDetails) {
    openCurrentTrackDetails();
    return;
  }
  openPlayer();
}
</script>

<style scoped>
.player-media-thumb {
  position: relative;
  flex: none;
  margin-right: 14px;
}

.player-media-thumb--compact {
  margin-right: 12px;
}

/* square and whole, a few pixels of radius and a soft shadow: the cover reads
   as an object sitting on the bar rather than a tile cut out of it */
.player-media-thumb-art {
  position: relative;
  overflow: hidden;
  border-radius: 3px;
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.16),
    0 6px 16px -6px rgb(0 0 0 / 0.38);
}

.player-media-thumb-art :deep(.v-img) {
  border-radius: 3px;
}

.player-media-thumb--compact .player-media-thumb-art,
.player-media-thumb--compact .player-media-thumb-art :deep(.v-img) {
  border-radius: 4px;
}

/* over the artwork, so white on a dark veil is the readable pairing */
.player-media-thumb-expand {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0.42);
  color: #fff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

.player-media-thumb:hover .player-media-thumb-expand {
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .player-media-thumb-art {
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .player-media-thumb:not(.player-media-thumb--compact):hover
    .player-media-thumb-art {
    transform: scale(1.04);
  }
}

.player-track-subtitle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  color: var(--muted-foreground);
  font-size: 12.5px;
  line-height: 1.4;
}

/* Vuetify fades the subtitle on top of its own colour; the muted token is
   already the step down from the title, so it stays as it is */
.player-track-details :deep(.v-list-item-subtitle) {
  opacity: 1;
}

.player-track-room {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 60%;
  overflow: hidden;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-track-room-separator {
  flex: none;
  color: var(--subtle-foreground);
}

/* the icon badge leads the line and keeps its width; the track metadata
   beside it is what gives way as the bar narrows */
.player-track-subtitle-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.player-track-source {
  flex-shrink: 0;
  max-width: 100%;
}

/* on the line itself (compact bar) an icon-less source shows its name, which
   must leave the metadata beside it half the width */
.player-track-subtitle-line .player-track-source {
  max-width: 50%;
}

.player-track-subtitle-text {
  min-width: 0;
}

/* the serif reads smaller than Inter at the same size, so it gets a step up */
.player-track-title {
  font-size: 1.125rem;
  line-height: 1.25;
}

.player-track-details--compact .player-track-title {
  font-size: 1rem;
}

/* the floating player keeps both text lines but drops below the two-line
   height Vuetify reserves, so the bar stays shallow */
.player-track-details.player-track-details--compact {
  min-height: 46px;
}

.player-track-chapter-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

.player-track-content-type {
  height: 20px !important;
  padding: 5px !important;
  padding-right: 9px !important;
  padding-left: 9px !important;
  font-weight: 500;
  font-size: 10px !important;
  letter-spacing: 0.1em;
  border-radius: 2px;
  margin-right: 30px;
}

.icon-thumb {
  width: 60px;
  height: 60px;
  border-radius: 3px;
  background-color: var(--secondary);
  color: var(--subtle-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<style>
/* this fixes missing subtitle items on webkit*/
.player-track-details .v-list-item-subtitle {
  -webkit-line-clamp: unset !important;
  line-clamp: unset !important;
}
</style>

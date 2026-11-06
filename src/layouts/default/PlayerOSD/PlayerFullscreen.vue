<template>
  <v-dialog
    v-model="store.showFullscreenPlayer"
    fullscreen
    :scrim="false"
    transition="dialog-bottom-transition"
    z-index="9000"
    :retain-focus="false"
    persistent
    no-click-animation
  >
    <v-card
      ref="cardRef"
      data-player-panel
      class="fullscreen-player-card"
      :class="{ dark: darkTreatment }"
      :style="{ background: backgroundColor }"
    >
      <!-- "ultrablur" backdrop: soft, slowly drifting blobs of the artwork's
           colours, a veil that keeps text legible over any artwork, and a
           little film grain. Sits beneath the optional visualizer layer. -->
      <div class="np-backdrop" :style="ultrablurStyle" aria-hidden="true">
        <div class="np-ub">
          <span class="np-ub__blob"></span>
          <span class="np-ub__blob"></span>
          <span class="np-ub__blob"></span>
        </div>
        <div class="np-veil"></div>
        <div class="np-grain"></div>
      </div>
      <VisualizerCanvas
        v-if="store.showFullscreenPlayer && visualizerActive"
        :preset="visualizerPresetPref"
        :blur="visualizerBlurPref"
        :opacity="visualizerOpacityPref"
        :player-id="store.activePlayer?.player_id"
        :force-dark-palette="visualizerOpacityPref > 50"
      />
      <PanelDragHandle
        v-if="store.mobileLayout"
        swipe-anywhere
        @dismiss="store.showFullscreenPlayer = false"
      />
      <v-toolbar
        data-panel-drag-region
        class="v-toolbar-default"
        color="transparent"
      >
        <template #prepend>
          <!-- on mobile the drag handle is the close affordance -->
          <Button
            v-if="!store.mobileLayout"
            variant="ghost-icon"
            size="icon-sm"
            class="np-cbtn"
            :aria-label="$t('tooltip.close_fullscreen')"
            @click="store.showFullscreenPlayer = false"
          >
            <ChevronDownIcon class="size-5" />
          </Button>
        </template>
        <template #append>
          <PlayerFullscreenHeaderControls
            :lyrics-state="lyricsState"
            :lyrics-active="showLyrics"
            @toggle-lyrics="toggleLyrics"
          />

          <Button
            variant="ghost-icon"
            size="icon-sm"
            class="np-cbtn ml-2"
            :aria-label="$t('tooltip.more_options')"
            @click.stop="openQueueMenu"
          >
            <EllipsisVerticalIcon :size="16" />
          </Button>
        </template>
      </v-toolbar>

      <!-- content -->
      <div
        class="main"
        :class="{ 'main--split': getBreakpointValue('bp7') && showRightColumn }"
      >
        <!-- left column: media thumb + details-->
        <div
          v-if="getBreakpointValue('bp7') || !showRightColumn"
          class="main-media-details"
        >
          <div
            v-if="$vuetify.display.height > 600"
            class="main-media-details-image"
          >
            <!-- current media image -->
            <v-img
              v-if="
                store.activePlayer?.powered != false &&
                store.activePlayer?.current_media?.image_url
              "
              :src="
                getMediaImageUrl(store.activePlayer.current_media.image_url)
              "
              :alt="$t('tooltip.artwork')"
            />
            <!-- fallback: display player icon in box -->
            <div v-else class="icon-thumb-large">
              <PlayerIcon
                :icon="store.activePlayer?.icon"
                :grouped="
                  store.activePlayer?.type == PlayerType.PLAYER &&
                  !!store.activePlayer?.group_members.length
                "
                :size="128"
              />
            </div>
          </div>
          <!-- The lines keep their source order (album before artist); the
               stylesheet orders them visually as eyebrow, title, artist,
               album, chapter, caption. -->
          <div class="main-media-details-track-info">
            <!-- eyebrow: "Now playing", plus the external source streaming the
                 media shown below when there is one -->
            <div class="np-eyebrow">
              <span v-if="showNowPlayingEyebrow" class="np-eyebrow__label">
                {{ $t("now_playing") }}
              </span>
              <NowPlayingSourceBadge plain class="main-media-details-source" />
            </div>
            <!-- player name as title if its powered off-->
            <v-card-title
              v-if="store.activePlayer?.powered == false"
              class="ma-display np-title"
              :style="`font-size: ${titleFontSize};`"
            >
              {{ store.activePlayer?.name }}
            </v-card-title>
            <!-- current media title -->
            <v-card-title
              v-else-if="store.activePlayer?.current_media?.title"
              class="ma-display np-title"
              :style="`font-size: ${titleFontSize};cursor:pointer;`"
              @click="openCurrentTrackDetails"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{ store.activePlayer.current_media.title }}
              </MarqueeText>
            </v-card-title>
            <!-- no player selected message -->
            <v-card-title
              v-else
              class="ma-display np-title"
              :style="`font-size: ${titleFontSize};cursor:pointer;`"
              @click="store.showPlayersMenu = true"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{ store.activePlayer?.name || $t("no_player") }}
              </MarqueeText>
            </v-card-title>

            <!-- SUBTITLE -->

            <!-- SUBTITLE: player powered off -->
            <v-card-subtitle
              v-if="store.activePlayer?.powered == false"
              class="np-artist"
              :style="`font-size: ${subTitleFontSize};`"
            >
              {{ $t("off") }}
            </v-card-subtitle>

            <!-- subtitle: album; placeholder when empty so the artwork
                 above keeps a constant size -->
            <v-card-subtitle
              v-else-if="store.activePlayer?.current_media && showAlbumSubtitle"
              class="np-album"
              :class="{ 'np-album--link': !!albumSubtitle }"
              :style="`font-size: ${albumFontSize};${
                albumSubtitle ? 'cursor:pointer;' : ''
              }`"
              @click="onAlbumClick"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{ albumSubtitle || " " }}
              </MarqueeText>
            </v-card-subtitle>

            <!-- subtitle: current chapter, followed by the author line -->
            <v-card-subtitle
              v-if="currentChapter"
              class="np-chapter"
              :style="`font-size: ${albumFontSize};`"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{ currentChapter.chapter.name }}
              </MarqueeText>
            </v-card-subtitle>

            <!-- subtitle: artist; placeholder when empty, as above -->
            <v-card-subtitle
              v-if="
                store.activePlayer?.powered != false &&
                store.activePlayer?.current_media
              "
              class="np-artist"
              :class="{
                'np-artist--link': !!store.activePlayer.current_media.artist,
              }"
              :style="`font-size: ${subTitleFontSize};${
                store.activePlayer.current_media.artist ? 'cursor:pointer;' : ''
              }`"
              @click="onArtistClick"
            >
              <MarqueeText :sync="playerMarqueeSync">
                <span class="np-artist__name">{{
                  store.activePlayer.current_media.artist || " "
                }}</span>
              </MarqueeText>
            </v-card-subtitle>

            <!-- subtitle: queue ended or empty; an active third party source
                 is named by the badge above instead -->
            <v-card-subtitle v-if="queueEnded" class="np-caption">
              {{ $t("queue_ended") }}
            </v-card-subtitle>
            <v-card-subtitle
              v-else-if="
                store.activePlayerQueue && store.activePlayerQueue.items == 0
              "
              class="np-caption"
            >
              {{ $t("queue_empty") }}
            </v-card-subtitle>
          </div>
        </div>

        <!-- right column: queue items or lyrics, on a frosted glass panel -->
        <div
          v-if="showRightColumn && store.activePlayerQueue"
          class="main-queue-items main-queue-items--panel"
        >
          <div class="np-panel">
            <!-- Lyrics view -->
            <div v-if="showLyrics" class="lyrics-wrapper">
              <LyricsViewer
                :media-item="store.curQueueItem?.media_item"
                :position="lyricsElapsedTime"
                :stream-details="store.curQueueItem?.streamdetails"
                :text-color="sliderColor"
                :lyrics="currentLyrics.plain"
                :lrc-lyrics="currentLyrics.synced"
                :offset="lyricsOffset"
              />
            </div>
            <!-- Unified queue list: played → now playing → up next (virtualized) -->
            <div
              v-else
              ref="queueScrollRef"
              class="queue-items-scroll-box"
              :style="`--queue-title-size: ${queueTitleFontSize}; --queue-subtitle-size: ${queueSubtitleFontSize};`"
            >
              <!-- the queue played through: say so, rather than leaving its
                   last track looking like it is still the current one -->
              <div v-if="queueEnded" class="queue-ended">
                {{ $t("queue_ended") }}
              </div>
              <!-- empty state -->
              <div v-if="!totalItems" class="queue-empty">
                {{ $t("queue_empty") }}
              </div>
              <!-- virtual spacer sized to the whole queue; only visible rows render -->
              <div
                v-else
                class="queue-virt"
                :class="{ 'queue-virt--dragging': isDragging }"
                :style="{ height: `${totalSize}px` }"
              >
                <div
                  v-for="row in virtualRows"
                  :key="row.index"
                  :ref="measureRow"
                  :data-index="row.index"
                  class="queue-virt-row"
                  :style="{
                    transform: `translateY(${row.vItem.start + rowOffset(row.index)}px)`,
                  }"
                >
                  <!-- section divider (Now playing / Up next) -->
                  <div v-if="row.divider" class="queue-divider">
                    <span class="queue-divider__label">{{
                      $t(row.divider)
                    }}</span>
                    <span
                      v-if="row.divider === 'up_next' && upNextCount"
                      class="queue-divider__count"
                    >
                      {{ upNextCount }}
                    </span>
                  </div>
                  <!-- queue mode banner (radio mix / autoplay state) under Up next -->
                  <QueueModeBanner v-if="row.divider === 'up_next'" />
                  <!-- loaded item -->
                  <QueueListItem
                    v-if="row.item"
                    :item="row.item"
                    :state="row.state"
                    :is-playing="playerActive"
                    :dragging="draggingIndex === row.index"
                    :marquee-sync="
                      row.state === 'playing'
                        ? playerMarqueeSync
                        : hoveredMarqueeSync
                    "
                    :request-badge-color="requestBadgeColor"
                    :boost-badge-color="boostBadgeColor"
                    @menu="(e: Event) => openQueueItemMenu(e, row.index)"
                    @dragstart="
                      (e: PointerEvent) => startItemDrag(e, row.index)
                    "
                  />
                  <!-- placeholder while the page loads -->
                  <div v-else class="queue-skeleton">
                    <div class="queue-skeleton__thumb"></div>
                    <div class="queue-skeleton__lines">
                      <div class="queue-skeleton__line"></div>
                      <div
                        class="queue-skeleton__line queue-skeleton__line--sub"
                      ></div>
                    </div>
                  </div>
                  <!-- chapters for the current audiobook item -->
                  <div
                    v-if="
                      row.state === 'playing' &&
                      row.item?.media_item?.metadata?.chapters?.length
                    "
                    class="queue-chapters"
                  >
                    <button
                      v-for="chapter in row.item.media_item.metadata.chapters"
                      :key="chapter.position"
                      type="button"
                      class="queue-chapter"
                      :class="{
                        'queue-chapter--active': isActiveChapter(
                          row.item,
                          chapter,
                        ),
                      }"
                      :aria-current="
                        isActiveChapter(row.item, chapter) ? 'true' : undefined
                      "
                      @click.stop="chapterClicked(row.item.media_item, chapter)"
                    >
                      <span class="queue-chapter__name">{{
                        chapter.name
                      }}</span>
                      <span v-if="chapter.end" class="queue-chapter__time">
                        {{ formatDuration(chapter.end - chapter.start) }}
                      </span>
                    </button>
                  </div>
                </div>
                <!-- floating ghost of the dragged item; tracks the pointer -->
                <div
                  v-if="isDragging && draggedItem"
                  class="queue-ghost"
                  :style="{ transform: `translateY(${ghostY}px)` }"
                >
                  <QueueListItem
                    :item="draggedItem"
                    state="upcoming"
                    ghost
                    :request-badge-color="requestBadgeColor"
                    :boost-badge-color="boostBadgeColor"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- right column: media image (on small but wide screens)-->
        <div
          v-if="!showRightColumn && $vuetify.display.height <= 600"
          class="main-queue-items"
        >
          <div class="main-media-details-image main-media-details-image-alt">
            <v-img
              v-if="store.activePlayer?.current_media?.image_url"
              :src="
                getMediaImageUrl(store.activePlayer.current_media.image_url)
              "
              :alt="$t('tooltip.artwork')"
            />
            <!-- fallback: display player icon in box -->
            <div v-else class="icon-thumb-large">
              <PlayerIcon
                :icon="store.activePlayer?.icon"
                :grouped="
                  store.activePlayer?.type == PlayerType.PLAYER &&
                  !!store.activePlayer?.group_members.length
                "
                :size="128"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- player controls (always at bottom)-->
      <div class="player-bottom">
        <!-- timeline / progressbar-->
        <div class="row" style="margin-left: 5%; margin-right: 5%">
          <PlayerTimeline
            :show-labels="true"
            :color="sliderColor"
            :waveform="waveformData"
          />
        </div>

        <!-- main media control buttons (play, next, previous etc.)-->
        <div class="media-controls">
          <div class="media-controls-item favorite-btn-wrapper">
            <FavoriteMenuBtn
              style="max-height: 30px; min-height: 0; min-width: 0"
              :size="18"
            />
          </div>
          <ShuffleBtn
            v-if="$vuetify.display.mdAndUp"
            :player="store.activePlayer"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="30px"
          />
          <PreviousBtn
            :player="store.activePlayer"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="45px"
            :size="28"
          />
          <div class="play-btn-wrapper" :style="playBtnStyle">
            <PlayBtn
              :player="store.activePlayer"
              :player-queue="store.activePlayerQueue"
              class="media-controls-item"
              :icon="{ staticWidth: '60px', staticHeight: '60px' }"
              :spinner-size="73"
              :size="30"
              :play-offset="2"
            />
          </div>
          <NextBtn
            :player="store.activePlayer"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="45px"
            :size="28"
          />
          <RepeatBtn
            v-if="$vuetify.display.mdAndUp"
            :player="store.activePlayer"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="35px"
          />
          <div class="media-controls-item queue-btn-wrapper">
            <QueueBtn
              style="max-height: 30px; min-height: 0; min-width: 0"
              :size="18"
            />
          </div>
        </div>

        <!-- volume control -->
        <div
          v-if="store.activePlayer"
          class="row"
          style="margin-left: 5%; margin-right: 5%"
        >
          <PlayerVolume
            :player="store.activePlayer"
            width="100%"
            :color="sliderColor"
            :allow-wheel="true"
            :prefer-group-volume="true"
          />
        </div>

        <!-- player select button (compact, Spotify-style) -->
        <div
          v-if="showExpandedPlayerSelectButton"
          class="row"
          style="
            display: flex;
            justify-content: center;
            align-items: center;
            padding-bottom: 8px;
            padding-top: 4px;
          "
        >
          <!-- Without a competing hover:text- here, the outline variant's own
               hover:text-accent-foreground survives the class merge and recolours
               the label against the artwork, so the hover colour is pinned to
               the --text-color the rest of the panel follows. The glass fill
               comes from np-room-pill. -->
          <Button
            id="fullscreen-player-select-button"
            variant="outline"
            size="xs"
            class="np-room-pill hover:text-[var(--text-color)]"
            :aria-label="playerSelectLabel"
            :aria-expanded="store.showPlayersMenu"
            aria-haspopup="dialog"
            @click="store.showPlayersMenu = true"
          >
            <PlayerIcon
              :icon="store.activePlayer?.icon"
              :size="20"
              class="np-room-pill__icon mr-1"
            />
            {{ store.activePlayer ? getPlayerName(store.activePlayer) : "" }}
          </Button>
        </div>
      </div>

      <PlaybackSpeedDialog v-model:open="playbackSpeedDialogOpen" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LyricsViewer from "@/components/LyricsViewer.vue";
import MarqueeText from "@/components/MarqueeText.vue";
import PanelDragHandle from "@/components/PanelDragHandle.vue";
import PlayerIcon from "@/components/PlayerIcon.vue";
import VisualizerCanvas from "@/components/VisualizerCanvas.vue";
import { Button } from "@/components/ui/button";
import { useLyricsElapsedTime } from "@/composables/lyrics/useLyricsElapsedTime";
import { useLyricsOffset } from "@/composables/lyrics/useLyricsOffset";
import { useActiveTrackWaveform } from "@/composables/useActiveTrackWaveform";
import { useCommandCenter } from "@/composables/useCommandCenter";
import { setStatusBarColorOverride } from "@/composables/useStatusBarColor";
import { useUserPreferences } from "@/composables/userPreferences";
import { useVisualizer } from "@/composables/visualizer/useVisualizer";
import { playbackSpeedSupported } from "@/helpers/elapsed";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import { openCurrentTrackDetails } from "@/helpers/now_playing";
import { getPlayerMenuItems } from "@/helpers/player_menu_items";
import {
  ImageColorPalette,
  formatDuration,
  getMediaImageUrl,
  getPlayerName,
} from "@/helpers/utils";
import LyricsOffsetMenuControl from "@/layouts/default/PlayerOSD/LyricsOffsetMenuControl.vue";
import PlaybackSpeedDialog from "@/layouts/default/PlayerOSD/PlaybackSpeedDialog.vue";
import FavoriteMenuBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/FavoriteMenuBtn.vue";
import NextBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/NextBtn.vue";
import PlayBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/PlayBtn.vue";
import PreviousBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/PreviousBtn.vue";
import RepeatBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/RepeatBtn.vue";
import ShuffleBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/ShuffleBtn.vue";
import NowPlayingSourceBadge from "@/layouts/default/PlayerOSD/NowPlayingSourceBadge.vue";
import PlayerFullscreenHeaderControls from "@/layouts/default/PlayerOSD/PlayerFullscreenHeaderControls.vue";
import PlayerVolume from "@/layouts/default/PlayerOSD/PlayerVolume.vue";
import QueueListItem from "@/layouts/default/PlayerOSD/QueueListItem.vue";
import QueueModeBanner from "@/layouts/default/PlayerOSD/QueueModeBanner.vue";
import { useFullscreenQueue } from "@/layouts/default/PlayerOSD/useFullscreenQueue";
import { useNowPlayingSource } from "@/composables/nowPlayingSource";
import { resolveActiveElapsedTime } from "@/helpers/activeElapsedTime";
import { resolveCurrentChapter } from "@/helpers/chapters";
import api from "@/plugins/api";
import {
  MediaItemChapter,
  MediaType,
  PlaybackState,
  PlayerType,
  QueueItem,
  Track,
} from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { eventbus } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";
import router from "@/plugins/router";
import { store } from "@/plugins/store";
import vuetify from "@/plugins/vuetify";
import { ChevronDownIcon, EllipsisVerticalIcon } from "@lucide/vue";
import Color from "color";
import {
  computed,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect,
  type ComponentPublicInstance,
} from "vue";
import { useDisplay } from "vuetify";
import QueueBtn from "./PlayerControlBtn/QueueBtn.vue";
import PlayerTimeline from "./PlayerTimeline.vue";

const { name, mdAndUp } = useDisplay();
const { open: openCommandCenter } = useCommandCenter();

const MIN_HEIGHT_SHOW_FULL_DETAILS = 750;
// The player select button is important enough to keep pinned at the bottom in
// (almost) all cases. Only on very short screens is it hidden entirely — it is
// never moved up into the header.
const MIN_HEIGHT_SHOW_PLAYER_SELECT_BUTTON = 480;
const showAlbumSubtitle = computed(
  () => vuetify.display.height.value > MIN_HEIGHT_SHOW_FULL_DETAILS,
);

const { albumSubtitle } = useNowPlayingSource();
const { getPreference, setPreference } = useUserPreferences();
const showWaveformPref = getPreference("show_waveform", true);
const showChapterProgress = getPreference("audiobook_chapter_progress", true);
const nowTick = ref(0);
let chapterTimer: ReturnType<typeof setInterval> | null = null;
const chapterQueueItem = computed(() => {
  const queueItem = store.curQueueItem;
  const media = store.activePlayer?.current_media;
  if (
    !queueItem?.media_item?.metadata?.chapters?.length ||
    !media ||
    (media.queue_item_id !== null &&
      media.queue_item_id !== queueItem.queue_item_id)
  ) {
    return undefined;
  }
  return queueItem;
});

const currentChapter = computed(() => {
  void nowTick.value;
  const media = store.activePlayer?.current_media;
  const queueItem = chapterQueueItem.value;
  if (
    !showChapterProgress.value ||
    media?.media_type !== MediaType.AUDIOBOOK ||
    !queueItem
  ) {
    return undefined;
  }
  return resolveCurrentChapter(
    queueItem.media_item?.metadata?.chapters,
    resolveActiveElapsedTime(),
    media.duration,
  );
});

const activeChapter = computed(() => currentChapter.value?.chapter);

const isActiveChapter = (item: QueueItem, chapter: MediaItemChapter) =>
  item.queue_item_id === chapterQueueItem.value?.queue_item_id &&
  chapter.position === activeChapter.value?.position;

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

const chapterTimerNeeded = computed(
  () =>
    store.showFullscreenPlayer &&
    store.showQueueItems &&
    store.activePlayer?.playback_state === PlaybackState.PLAYING &&
    !!chapterQueueItem.value &&
    showChapterProgress.value,
);

watch(chapterTimerNeeded, updateChapterTimer, { immediate: true });
onUnmounted(() => updateChapterTimer(false));

interface Props {
  colorPalette: ImageColorPalette;
}
const compProps = defineProps<Props>();

const playBtnStyle = computed(() => {
  const isDark = vuetify.theme.current.value.dark;
  const color = isDark
    ? compProps.colorPalette.darkColor
    : compProps.colorPalette.lightColor;
  if (!color) return {};
  return { "--play-icon-color": color };
});

const playerMarqueeSync = new MarqueeTextSync();

// The dialog keeps its content mounted after the first open, so a drag-to-close
// leaves PanelDragHandle's inline transform/opacity on the card; clear them
// when the player is opened again.
const cardRef = ref<ComponentPublicInstance | HTMLElement | null>(null);
watch(
  () => store.showFullscreenPlayer,
  async (isOpen) => {
    if (!isOpen) return;
    await nextTick();
    // template refs may resolve to either a component instance or a plain element
    const raw = cardRef.value;
    const el =
      raw instanceof HTMLElement
        ? raw
        : ((raw?.$el ?? undefined) as HTMLElement | undefined);
    if (!el?.dataset.dragDismissed) return;
    delete el.dataset.dragDismissed;
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
    el.style.removeProperty("transition");
    el.style.removeProperty("will-change");
  },
);

// Local reactive state for lyrics
const currentLyrics = ref<{ plain: string | null; synced: string | null }>({
  plain: null,
  synced: null,
});

const hasLyrics = computed(() => {
  const plain = currentLyrics.value.plain;
  const synced = currentLyrics.value.synced;
  return (
    (!!plain && plain.trim().length > 0) ||
    (!!synced && synced.trim().length > 0)
  );
});

// True while we're fetching lyrics for the current track.
const lyricsLoading = ref(false);

// Drives the lyrics header button: whether lyrics can be shown, are loading,
// or are unavailable (and why).
const lyricsState = computed<
  "available" | "loading" | "unavailable-song" | "none"
>(() => {
  if (!store.curQueueItem) return "none";
  // Lyrics only make sense for tracks; hide the button entirely otherwise.
  if (store.curQueueItem.media_item?.media_type !== MediaType.TRACK)
    return "none";
  if (lyricsLoading.value) return "loading";
  if (hasLyrics.value) return "available";
  return "unavailable-song";
});

// Lyrics are reached through a dedicated button in the header and shown in
// their own panel, independent of the queue list (which has its own toggle).
const showLyrics = ref(false);

const toggleLyrics = () => {
  showLyrics.value = !showLyrics.value;
};

// This component stays mounted while the dialog is closed and the lyrics panel
// keeps its state across open/close, so both are checked: the ~60fps loop only
// runs while the lyrics viewer it feeds is actually on screen.
const lyricsVisible = computed(
  () => store.showFullscreenPlayer && showLyrics.value,
);
const { elapsedTime: lyricsElapsedTime } = useLyricsElapsedTime(lyricsVisible);

// If the panel was opened optimistically while lyrics were still loading but
// the track turns out to have none, close it again so we don't show an empty
// panel.
watch(lyricsState, (state) => {
  if (showLyrics.value && (state === "unavailable-song" || state === "none")) {
    showLyrics.value = false;
  }
});

// The right column shows either the queue or the lyrics, never both (lyrics
// render on top of the queue's slot). Keep the two toggles mutually exclusive
// so each button visibly swaps the panel instead of silently flipping a hidden
// state. Opening lyrics remembers whether the queue was showing so closing them
// returns there rather than to the bare artwork.
let queueVisibleBeforeLyrics = false;
watch(showLyrics, (active) => {
  if (active) {
    queueVisibleBeforeLyrics = store.showQueueItems;
    store.showQueueItems = false;
  } else if (queueVisibleBeforeLyrics) {
    store.showQueueItems = true;
    queueVisibleBeforeLyrics = false;
  }
});
watch(
  () => store.showQueueItems,
  (active) => {
    if (active) showLyrics.value = false;
  },
);

// Whether the right-hand column (queue list or lyrics) is visible. Used to
// collapse the media details column on small/narrow screens.
const showRightColumn = computed(
  () => store.showQueueItems || showLyrics.value,
);

// The unified queue list (virtualized rows, paging, now-playing focus and
// per-item menu) lives in its own composable to keep this component lean.
const {
  queueScrollRef,
  virtualRows,
  totalItems,
  upNextCount,
  queueEnded,
  totalSize,
  measureRow,
  playerActive,
  hoveredMarqueeSync,
  requestBadgeColor,
  boostBadgeColor,
  queueTitleFontSize,
  queueSubtitleFontSize,
  openQueueItemMenu,
  chapterClicked,
  startItemDrag,
  draggingIndex,
  isDragging,
  draggedItem,
  ghostY,
  rowOffset,
} = useFullscreenQueue(showLyrics);

// The eyebrow above the title only says "Now playing" while something is:
// not for a powered off player, an empty view or a queue that played through.
const showNowPlayingEyebrow = computed(
  () =>
    store.activePlayer?.powered != false &&
    !!store.activePlayer?.current_media?.title &&
    !queueEnded.value,
);

// Protocols with accurate playback time reporting don't need a latency offset.
const ACCURATE_TIME_PROTOCOLS = ["airplay"];

const showLyricsOffset = computed(() => {
  const player = store.activePlayer;
  if (!player) return false;
  let domain: string | undefined;
  if (
    player.active_output_protocol &&
    player.active_output_protocol !== "native"
  ) {
    domain = player.output_protocols.find(
      (p) => p.output_protocol_id === player.active_output_protocol,
    )?.protocol_domain;
  }
  if (!domain) {
    domain = player.provider.split("--")[0];
  }
  return !ACCURATE_TIME_PROTOCOLS.includes(domain);
});

// Shared lyrics sync offset; adjusted from the overflow menu while lyrics are
// open (see openQueueMenu) and fed to the lyrics viewer.
const { offset: lyricsOffset } = useLyricsOffset();

// Fetch lyrics for the current track (only when fullscreen player is open)
let lyricsLoadGeneration = 0;
const fetchLyrics = async () => {
  const generation = ++lyricsLoadGeneration;
  // Clear lyrics immediately
  currentLyrics.value = { plain: null, synced: null };

  const mediaItem = store.curQueueItem?.media_item;
  const isTrack = mediaItem?.media_type === MediaType.TRACK;

  // Show the loading state right away for tracks so the header button doesn't
  // flash "unavailable" before we've looked the lyrics up.
  lyricsLoading.value = isTrack === true && store.showFullscreenPlayer;

  // Only fetch lyrics when fullscreen player is open and the item is a track.
  if (!store.showFullscreenPlayer || !isTrack) {
    lyricsLoading.value = false;
    return;
  }

  const track = mediaItem as Track;

  // Check if lyrics are already in metadata
  const existingPlain = track.metadata.lyrics?.trim() || null;
  const existingSynced = track.metadata.lrc_lyrics?.trim() || null;

  if (existingPlain || existingSynced) {
    currentLyrics.value = { plain: existingPlain, synced: existingSynced };
    lyricsLoading.value = false;
    return;
  }

  // Fetch lyrics from API
  try {
    const [lyrics, lrcLyrics] = await api.getTrackLyrics(track);
    // a newer track change started while awaiting; this result is stale
    if (generation !== lyricsLoadGeneration) return;
    currentLyrics.value = { plain: lyrics, synced: lrcLyrics };

    // Also update the media item's metadata for future reference
    if (lyrics || lrcLyrics) {
      track.metadata = {
        ...track.metadata,
        ...(lyrics && { lyrics }),
        ...(lrcLyrics && { lrc_lyrics: lrcLyrics }),
      };
    }
  } catch (error) {
    if (generation !== lyricsLoadGeneration) return;
    console.error("Failed to fetch track lyrics:", error);
  } finally {
    if (generation === lyricsLoadGeneration) lyricsLoading.value = false;
  }
};

// Watch for track changes and handle lyrics
watch(() => store.curQueueItem?.media_item?.item_id, fetchLyrics, {
  immediate: true,
});

// Also fetch lyrics when fullscreen player is opened
watch(
  () => store.showFullscreenPlayer,
  (isOpen) => {
    if (isOpen) {
      fetchLyrics();
    }
  },
);

// Waveform for the current track — loaded centrally by useActiveTrackWaveform.
const { waveformBins: waveformData } = useActiveTrackWaveform();
const {
  visualizerPresetPref,
  visualizerBlurPref,
  visualizerOpacityPref,
  visualizerActive,
} = useVisualizer(() => store.activePlayer?.player_id);

// Display-serif title size (rem) per breakpoint: [beside the queue or lyrics
// panel, details alone]. Desktop lands in the 48-58px editorial range, phones
// around 28-34px.
const TITLE_REM: Record<string, [number, number]> = {
  xs: [1.75, 1.75],
  sm: [2.125, 2.125],
  md: [2.5, 2.75],
  lg: [3, 3.25],
  xl: [3.25, 3.5],
  xxl: [3.375, 3.625],
};

const titleRem = computed(() => {
  const [withPanel, alone] = TITLE_REM[name.value] ?? TITLE_REM.xs;
  const rem = showRightColumn.value ? withPanel : alone;
  // short viewports hand the height to the artwork instead
  return showAlbumSubtitle.value ? rem : Math.min(rem, 2.25);
});

const titleFontSize = computed(() => `${titleRem.value}rem`);

// Artist line: 600 weight, 16px on phones up to 22px beside a large title.
const artistRem = computed(() =>
  Math.min(1.375, Math.max(1, titleRem.value * 0.4)),
);
const subTitleFontSize = computed(() => `${artistRem.value.toFixed(3)}rem`);

// Album (italic serif) and chapter lines sit a step below the artist.
const albumFontSize = computed(
  () => `${(artistRem.value * 0.92).toFixed(3)}rem`,
);

const playerSelectLabel = computed(() => {
  const selectPlayer = $t("tooltip.select_player");
  if (!store.activePlayer) return selectPlayer;
  return `${selectPlayer}: ${getPlayerName(store.activePlayer)}`;
});

const showExpandedPlayerSelectButton = computed(() => {
  // Always show the player select button at the bottom; only hide it on very
  // short screens (never relocate it to the header).
  return vuetify.display.height.value > MIN_HEIGHT_SHOW_PLAYER_SELECT_BUTTON;
});

// methods

// Helper to parse a Music Assistant URI
// Supports both formats:
// - MA style: <provider>://<mediaType>/<itemId>
// - Spotify style: <provider>:<mediaType>:<itemId>
const parseUri = function (uri: string | undefined) {
  if (!uri) return null;

  // Valid media types
  const validTypes = [
    MediaType.ALBUM,
    MediaType.ARTIST,
    MediaType.TRACK,
    MediaType.PLAYLIST,
    MediaType.RADIO,
    MediaType.PODCAST,
    MediaType.AUDIOBOOK,
    MediaType.PODCAST_EPISODE,
  ];

  // Try MA style: provider://mediaType/itemId
  let match = uri.match(/^([^:]+):\/\/([^/]+)\/(.+)$/);
  if (match) {
    const [, provider, mediaType, itemId] = match;
    if (validTypes.includes(mediaType as MediaType)) {
      return { provider, mediaType: mediaType as MediaType, itemId };
    }
  }

  // Try Spotify style: provider:mediaType:itemId
  match = uri.match(/^([^:]+):([^:]+):(.+)$/);
  if (match) {
    const [, provider, mediaType, itemId] = match;
    if (validTypes.includes(mediaType as MediaType)) {
      return { provider, mediaType: mediaType as MediaType, itemId };
    }
  }

  return null;
};

const navigateOrSearch = function (searchTerm: string, uri?: string) {
  const parsed = parseUri(uri);
  if (parsed && api.getProvider(parsed.provider)) {
    // Valid URI - navigate to item details
    store.showFullscreenPlayer = false;
    router.push({
      name: parsed.mediaType,
      params: {
        itemId: parsed.itemId,
        provider: parsed.provider,
      },
    });
  } else {
    // No valid URI - hand the term to the command center
    store.showFullscreenPlayer = false;
    openCommandCenter({ query: searchTerm });
  }
};

const onAlbumClick = async function () {
  const currentMedia = store.activePlayer?.current_media;
  if (!currentMedia || !albumSubtitle.value) return;

  // Try to get the album from the full media item (for library items)
  const mediaItem = store.curQueueItem?.media_item;

  if (mediaItem && "album" in mediaItem && mediaItem.album) {
    // Navigate directly to album detail page
    store.showFullscreenPlayer = false;
    router.push({
      name: "album",
      params: {
        itemId: mediaItem.album.item_id,
        provider: mediaItem.album.provider,
      },
    });
  } else {
    // Radio or non-library item - try to find in library first
    try {
      // Call with positional parameters: (favorite, search, limit, offset, order_by, album_types, provider)
      const results = await api.getLibraryAlbums(
        undefined, // favorite
        albumSubtitle.value, // search
        5, // limit - get a few results to find best match
        undefined,
        undefined,
        undefined,
        undefined, // genre_ids
      );

      if (results.length > 0) {
        let bestMatch = results[0];

        // If we have artist info, try to find album by same artist
        if (currentMedia.artist) {
          const matchWithArtist = results.find((album) =>
            album.artists.some(
              (artist) =>
                artist.name.toLowerCase() ===
                  currentMedia.artist!.toLowerCase() ||
                artist.name
                  .toLowerCase()
                  .includes(currentMedia.artist!.toLowerCase()) ||
                currentMedia
                  .artist!.toLowerCase()
                  .includes(artist.name.toLowerCase()),
            ),
          );
          if (matchWithArtist) {
            bestMatch = matchWithArtist;
          }
        }

        // Found in library! Navigate to it
        store.showFullscreenPlayer = false;
        router.push({
          name: "album",
          params: {
            itemId: bestMatch.item_id,
            provider: bestMatch.provider,
          },
        });
        return;
      }
    } catch (error) {
      console.error("Error searching library for album:", error);
    }

    // Not found in library - fall back to the command center
    const searchTerm = currentMedia.artist
      ? `${currentMedia.artist} - ${currentMedia.album}`
      : currentMedia.album || "";
    store.showFullscreenPlayer = false;
    openCommandCenter({ query: searchTerm });
  }
};

const onArtistClick = async function () {
  const currentMedia = store.activePlayer?.current_media;
  if (!currentMedia?.artist) return;

  // Try to get the artist from the full media item (for library items)
  const mediaItem = store.curQueueItem?.media_item;

  if (
    mediaItem &&
    "artists" in mediaItem &&
    mediaItem.artists &&
    mediaItem.artists.length > 0
  ) {
    // Navigate directly to artist detail page
    store.showFullscreenPlayer = false;
    router.push({
      name: "artist",
      params: {
        itemId: mediaItem.artists[0].item_id,
        provider: mediaItem.artists[0].provider,
      },
    });
  } else {
    // Radio or non-library item - try to find in library first
    try {
      // Call with positional parameters: (favorite, search, limit, offset, order_by, album_artists_only, provider)
      const results = await api.getLibraryArtists(
        undefined, // favorite
        currentMedia.artist, // search
        5, // limit
        undefined,
        undefined,
        undefined,
        undefined, // genre_ids
      );

      if (results.length > 0) {
        // Try to find exact match by name
        let bestMatch = results[0];

        const exactMatch = results.find(
          (artist) =>
            artist.name.toLowerCase() === currentMedia.artist!.toLowerCase(),
        );
        if (exactMatch) {
          bestMatch = exactMatch;
        }

        // Found in library! Navigate to it
        store.showFullscreenPlayer = false;
        router.push({
          name: "artist",
          params: {
            itemId: bestMatch.item_id,
            provider: bestMatch.provider,
          },
        });
        return;
      }
    } catch (error) {
      console.error("Error searching library for artist:", error);
    }

    // Not found in library - fall back to the command center
    store.showFullscreenPlayer = false;
    openCommandCenter({ query: currentMedia.artist });
  }
};

const playbackSpeedDialogOpen = ref(false);

// a route change closes the full screen player from under whatever is on top of
// it, and vuetify then unmounts this card - the dialog has to go first, or it
// leaves the app-wide dialog flag set and reappears on the next open
watch(
  () => store.showFullscreenPlayer,
  (open) => {
    if (!open) playbackSpeedDialogOpen.value = false;
  },
);

const speedSupported = computed(() =>
  playbackSpeedSupported(store.curQueueItem),
);

const openQueueMenu = function (evt: Event) {
  if (!store.activePlayer) return;
  const menuItems = getPlayerMenuItems(
    store.activePlayer,
    store.activePlayerQueue,
    {
      context: "queue",
      hideShuffleRepeat: mdAndUp.value,
    },
  );
  // playback speed only means something for spoken-word content, which is also
  // the only content anyone plays at anything but 1x
  if (speedSupported.value) {
    menuItems.push({
      label: "change_playback_speed",
      action: () => {
        playbackSpeedDialogOpen.value = true;
      },
      icon: "mdi-speedometer",
    });
  }
  // The waveform toggle slots in above the visualizer popout entry (which
  // comes from getPlayerMenuItems), keeping the display entries grouped.
  const waveformItem = {
    label: "settings.show_waveform.label",
    action: () => {
      void setPreference("show_waveform", !showWaveformPref.value);
    },
    icon: "mdi-waveform",
    selected: showWaveformPref.value,
    close_on_click: false,
  };
  const visualizerEntryIndex = menuItems.findIndex(
    (item) => item.label === "settings.visualizer_enabled.label",
  );
  if (visualizerEntryIndex === -1) {
    menuItems.push(waveformItem);
  } else {
    menuItems.splice(visualizerEntryIndex, 0, waveformItem);
  }
  // While lyrics are open, surface the sync-offset stepper at the top of the
  // overflow menu (only for players that benefit from a latency offset).
  if (showLyrics.value && showLyricsOffset.value) {
    menuItems.unshift({
      label: "lyrics_offset",
      // markRaw: the menu items land in a reactive array; a bare component
      // definition there would be needlessly made reactive.
      component: markRaw(LyricsOffsetMenuControl),
    });
  }
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: (evt as PointerEvent).clientX,
    posY: (evt as PointerEvent).clientY,
  });
};

// Handle Escape key to close fullscreen player (since persistent disables default behavior)
const onKeydown = (e: KeyboardEvent) => {
  if (
    e.key === "Escape" &&
    store.showFullscreenPlayer &&
    !store.dialogActive &&
    !store.showPlayersMenu
  ) {
    store.showFullscreenPlayer = false;
  }
};
onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown);
  });
});

const sliderColor = ref<string | undefined>(undefined);
const backgroundColor = ref<string | undefined>(undefined);

watchEffect(() => {
  // With a dominant visualizer the view is effectively dark content: force
  // light text and a dark palette-gradient base. At low opacity (<=50%) the
  // visualizer is only a faint overlay, so keep the completely normal
  // theme/palette treatment instead of forcing the dark look. This component is
  // permanently mounted via the OSD footer, so gate on the fullscreen player
  // actually being open, or --text-color would stay forced app-wide.
  if (
    store.showFullscreenPlayer &&
    visualizerActive.value &&
    visualizerOpacityPref.value > 50
  ) {
    document.documentElement.style.setProperty("--text-color", "#ffffff");
    document.documentElement.style.setProperty(
      "--text-color-inverse",
      "#000000",
    );
    sliderColor.value = "#ffffff";
    const darkBase = Color(compProps.colorPalette.darkColor || "#000");
    backgroundColor.value = `linear-gradient(to bottom, ${darkBase.lighten(0.25).hex()}, ${darkBase.darken(0.25).hex()})`;
    return;
  }
  const isDarkTheme = vuetify.theme.current.value.dark;
  const bgHex = isDarkTheme
    ? compProps.colorPalette.darkColor || "#000"
    : compProps.colorPalette.lightColor || "#fff";

  const textHex = isDarkTheme ? "#ffffff" : "#000000";
  const inverseTextHex = isDarkTheme ? "#000000" : "#ffffff";

  document.documentElement.style.setProperty("--text-color", textHex);
  document.documentElement.style.setProperty(
    "--text-color-inverse",
    inverseTextHex,
  );
  sliderColor.value = textHex;

  const bgColor = Color(bgHex);
  const topColor = bgColor.lighten(0.25);
  const bottomColor = bgColor.darken(0.25);
  backgroundColor.value = `linear-gradient(to bottom, ${topColor.hex()}, ${bottomColor.hex()})`;
  setStatusBarColorOverride(
    store.showFullscreenPlayer ? topColor.hex() : undefined,
  );
});

// Whether the view wears its dark treatment: the dark theme, or a dominant
// visualizer forcing light text (same condition as above). The card then
// carries the .dark class, so every theme token inside it (glass, borders,
// muted text) follows the light-on-dark text instead of the app theme.
const darkTreatment = computed(
  () =>
    vuetify.theme.current.value.dark ||
    (store.showFullscreenPlayer &&
      visualizerActive.value &&
      visualizerOpacityPref.value > 50),
);

// Tones for the "ultrablur" wash, drawn from the artwork palette: a base and
// three soft blobs. The dark treatment keeps them deep and saturated; the light
// one pulls each most of the way to white so the frosted veil stays bright.
// Without a palette nothing is set and the wash falls back to neutral tokens.
const ultrablurStyle = computed((): Record<string, string> => {
  const { darkColor, lightColor } = compProps.colorPalette;
  if (!darkColor && !lightColor) return {};
  let deep: ReturnType<typeof Color>;
  let bright: ReturnType<typeof Color>;
  try {
    deep = Color(darkColor || lightColor).saturate(0.2);
    bright = Color(lightColor || darkColor).rotate(14);
  } catch {
    return {};
  }
  if (darkTreatment.value) {
    const base = deep.mix(Color("#0c0c0e"), 0.72);
    const blob1 = deep.lighten(0.15);
    return {
      "--np-base": base.hex(),
      "--np-t1": blob1.hex(),
      "--np-t2": bright.darken(0.4).hex(),
      "--np-t3": blob1.mix(base, 0.5).hex(),
    };
  }
  const white = Color("#ffffff");
  return {
    "--np-base": deep.mix(white, 0.72).hex(),
    "--np-t1": deep.mix(white, 0.45).hex(),
    "--np-t2": bright.mix(white, 0.4).hex(),
    "--np-t3": deep.mix(white, 0.6).hex(),
  };
});

onBeforeUnmount(() => {
  setStatusBarColorOverride(undefined);
});
</script>

<style scoped>
.fullscreen-player-card {
  box-sizing: border-box;
  /* y is left to Vuetify, which holds it at auto from a more specific
     .v-dialog > .v-overlay__content > .v-card. That keeps the card scrollable
     when the viewport is too short for .player-bottom (flex-shrink: 0) to
     fit; clipping instead would put the play button out of reach of the wheel
     and of any pan global.css has not refused. */
  overflow-x: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--device-inset-top) var(--device-inset-right) 0
    var(--device-inset-left);
  /* Containing block for the backdrop and visualizer layers (z-index 0);
     everything else is lifted above them so they render strictly behind the
     content. */
  position: relative;
  color: var(--text-color);

  /* Tones for everything that sits on the artwork wash. Built from theme
     tokens, which follow the .dark class the card carries for its dark
     treatment, so a dominant visualizer gets dark glass under its white text
     even in the light theme. */
  --np-gutter: 24px;
  --np-text-2: color-mix(in srgb, var(--text-color) 68%, transparent);
  --np-text-3: color-mix(in srgb, var(--text-color) 50%, transparent);
  --np-hover: color-mix(in srgb, var(--text-color) 6%, transparent);
  --np-active: color-mix(in srgb, var(--text-color) 10%, transparent);
  --np-glass: color-mix(in oklab, var(--popover) 62%, transparent);
  --np-glass-hover: color-mix(in oklab, var(--popover) 82%, transparent);
  --np-glass-line: color-mix(in oklab, var(--background) 70%, transparent);
  --np-veil: color-mix(in oklab, var(--background) 40%, transparent);
  --np-panel-shadow: 0 16px 40px -14px rgba(20, 20, 50, 0.22);
  --np-art-shadow:
    0 40px 80px -32px rgba(20, 20, 50, 0.45), 0 0 0 1px rgba(10, 10, 20, 0.06);
  --np-grain-opacity: 0.12;
}

.fullscreen-player-card.dark {
  --np-glass-line: color-mix(in oklab, var(--foreground) 10%, transparent);
  --np-veil: color-mix(in oklab, var(--background) 42%, transparent);
  --np-panel-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.6);
  --np-art-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
  --np-grain-opacity: 0.18;
}

@media (max-width: 600px) {
  .fullscreen-player-card {
    --np-gutter: 12px;
  }
}

.fullscreen-player-card > :not(.visualizer-layer):not(.np-backdrop) {
  position: relative;
  z-index: 1;
}

.fullscreen-player-card :deep(.panel-drag-handle > div) {
  background: color-mix(in srgb, var(--text-color) 40%, transparent);
}

/* ---- "ultrablur" backdrop ------------------------------------------------ */

.np-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  isolation: isolate;
  pointer-events: none;
}

.np-ub {
  position: absolute;
  inset: -20%;
  background-color: var(--np-base, var(--background));
  transition: background-color 0.9s ease;
}

/* A radial mask feathers each blob like a heavy blur, without re-blurring a
   moving layer on every frame. */
.np-ub__blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.9;
  -webkit-mask-image: radial-gradient(
    closest-side,
    #000 15%,
    rgba(0, 0, 0, 0.55) 55%,
    transparent 100%
  );
  mask-image: radial-gradient(
    closest-side,
    #000 15%,
    rgba(0, 0, 0, 0.55) 55%,
    transparent 100%
  );
  transition: background-color 0.9s ease;
}

.np-ub__blob:nth-child(1) {
  width: 90%;
  height: 100%;
  left: -15%;
  top: -10%;
  background-color: var(--np-t1, var(--secondary));
}

.np-ub__blob:nth-child(2) {
  width: 80%;
  height: 90%;
  right: -15%;
  top: -20%;
  background-color: var(--np-t2, var(--card));
}

.np-ub__blob:nth-child(3) {
  width: 85%;
  height: 80%;
  left: 15%;
  bottom: -25%;
  background-color: var(--np-t3, var(--muted));
}

@media (prefers-reduced-motion: no-preference) {
  .np-ub__blob {
    will-change: transform;
    animation: np-drift 28s ease-in-out infinite;
  }

  .np-ub__blob:nth-child(2) {
    animation-duration: 34s;
    animation-direction: reverse;
  }

  .np-ub__blob:nth-child(3) {
    animation-duration: 40s;
  }
}

@keyframes np-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
  }
  33% {
    transform: translate(4%, -3%) scale(1.08) rotate(8deg);
  }
  66% {
    transform: translate(-3%, 4%) scale(0.96) rotate(-6deg);
  }
}

/* smoky (dark) or frosted (light) layer that keeps text readable over any
   artwork */
.np-veil {
  position: absolute;
  inset: 0;
  background: var(--np-veil);
}

.np-grain {
  position: absolute;
  inset: 0;
  opacity: var(--np-grain-opacity);
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>");
}

/* ---- header ------------------------------------------------------------- */

.v-toolbar :deep(.v-toolbar-title) {
  text-align: center;
}

.v-toolbar :deep(.v-toolbar__prepend) {
  margin-inline-start: var(--np-gutter);
}

/* the trailing buttons line up with the panel's right edge below */
.v-toolbar :deep(.v-toolbar__append) {
  margin-inline-end: var(--np-gutter);
}

/* round glass buttons (close, more) */
.np-cbtn {
  width: 34px !important;
  height: 34px !important;
  border: 1px solid var(--np-glass-line) !important;
  background-color: var(--np-glass) !important;
  color: var(--text-color) !important;
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  transition: background-color 150ms ease;
}

.np-cbtn:hover {
  background-color: var(--np-glass-hover) !important;
}

/* ---- layout ------------------------------------------------------------- */

.main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main .main-media-details {
  flex: 50%;
  max-width: 100%;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* beside the panel, the details take all the room the panel leaves */
.main--split .main-media-details {
  flex: 1 1 0;
  width: auto;
  min-width: 0;
}

.main-queue-items {
  flex: 50%;
  height: 100%;
  max-width: 100%;
  padding-right: 10px;
  padding-left: 15px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.main-queue-items--panel {
  padding: 4px var(--np-gutter) 0;
}

.main--split .main-queue-items--panel {
  flex: 0 0 clamp(360px, 32vw, 500px);
  padding-left: 8px;
}

/* ---- queue / lyrics panel ----------------------------------------------- */

.np-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* Keep the panel clear of the progress bar / controls below. */
  margin-bottom: 24px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--np-glass);
  -webkit-backdrop-filter: blur(40px) saturate(1.5);
  backdrop-filter: blur(40px) saturate(1.5);
  box-shadow:
    inset 0 0 0 1px var(--np-glass-line),
    var(--np-panel-shadow);
}

@media (prefers-reduced-motion: no-preference) {
  .np-panel {
    animation: np-panel-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

@keyframes np-panel-in {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
}

@media (max-width: 600px) {
  .np-panel {
    border-radius: 18px;
    margin-bottom: 16px;
  }
}

.queue-items-scroll-box {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* No top padding: the virtualizer and the drag ghost measure rows from the
     scroll box's own top edge. */
  padding: 0 8px 12px;
  scroll-behavior: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-color) 22%, transparent)
    transparent;
}

/* Virtual list: a spacer sized to the whole queue, with only the visible rows
   rendered and absolutely positioned via an inline translateY. */
.queue-virt {
  position: relative;
  width: 100%;
}

.queue-virt-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

/* While dragging, the rows slide smoothly as the landing gap opens/moves. */
.queue-virt--dragging .queue-virt-row {
  transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1);
}

/* Floating clone of the dragged row; sits above the list and tracks the
   pointer. Positioned via an inline translateY in content space. */
.queue-ghost {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 3;
  pointer-events: none;
}

/* Placeholder shown while a page of items is still loading; sized like a
   real row. */
.queue-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 60px;
  padding: 8px 10px;
}

.queue-skeleton__thumb {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 10%,
    transparent
  );
}

.queue-skeleton__lines {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-skeleton__line {
  width: 55%;
  height: 12px;
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 10%,
    transparent
  );
}

.queue-skeleton__line--sub {
  width: 38%;
  height: 10px;
}

/* Section labels (Now playing / Up next) as eyebrows, the up-next count on
   the right. */
.queue-divider {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 16px 10px 8px;
}

.queue-divider__label {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--np-text-3);
}

.queue-divider__count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--np-text-3);
}

/* Audiobook chapters under the current item, lined up with its title. */
.queue-chapters {
  display: flex;
  flex-direction: column;
  margin: 2px 0 8px 56px;
}

.queue-chapter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  text-align: left;
  color: var(--text-color, currentColor);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.queue-chapter:hover {
  background: var(--np-hover);
}

.queue-chapter--active {
  color: var(--primary);
  background: var(--np-active);
  font-weight: 600;
}

.queue-chapter--active:hover {
  background: var(--np-active);
}

.queue-chapter__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--queue-subtitle-size, 0.8rem);
}

.queue-chapter__time {
  flex: 0 0 auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--np-text-3);
}

.queue-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  font-size: 13.5px;
  color: var(--np-text-2);
}

.queue-ended {
  padding: 14px 10px 6px;
  text-align: center;
  font-size: 13px;
  color: var(--np-text-2);
}

/* ---- artwork and track details ------------------------------------------ */

/* The cover takes all the height the details leave, as large as the column
   allows, centred. */
.main-media-details-image {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 24px 0;
  container-type: size;
}
.main-media-details-image .v-img {
  /* Fallback for engines without container query units; they drop the pair below and collapse the image to 0x0. */
  width: 100%;
  height: auto;
  width: min(100cqi, 100cqh);
  height: min(100cqi, 100cqh);
  flex: 0 0 auto;
  border-radius: 6px;
  box-shadow: var(--np-art-shadow);
  overflow: hidden;
}

.main-media-details-image-alt {
  height: 100% !important;
  max-height: 100% !important;
  padding: 10px !important;
}

.main-media-details-track-info {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  text-align: center;
  padding: min(4%, 3.5vh) 0 8px;
  overflow: hidden;
}

.main-media-details-track-info > * {
  max-width: 100%;
}

/* Visual order of the details: eyebrow, title, artist, album, chapter and any
   caption (their source order differs, see the template). */
.np-eyebrow {
  order: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--np-text-2);
}

.np-eyebrow:empty {
  display: none;
}

/* the source badge reads as part of the eyebrow, after a separator */
.np-eyebrow .main-media-details-source {
  max-width: 100%;
  gap: 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.1em;
}

.np-eyebrow__label + .main-media-details-source::before {
  content: "·";
  margin-right: 2px;
}

.np-title {
  order: 1;
  padding: 0 16px;
  line-height: 1.15;
  letter-spacing: -0.012em;
  color: var(--text-color);
}

/* tighter than the marquee's default box, so the artist sits close below */
.np-title :deep(.container) {
  min-height: 1.25em;
}

.np-artist {
  order: 2;
  margin-top: 0.6rem;
  padding: 0 16px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.005em;
  opacity: 1;
  color: var(--text-color);
}

.np-artist--link .np-artist__name {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.22em;
  text-decoration-color: color-mix(in oklab, var(--primary) 45%, transparent);
  transition: color 150ms ease;
}

.np-artist--link:hover .np-artist__name {
  color: var(--primary);
}

.np-album {
  order: 3;
  margin-top: 0.25rem;
  padding: 0 16px;
  font-family: var(--font-heading);
  font-style: italic;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: 0;
  opacity: 1;
  color: var(--np-text-2);
  transition: color 150ms ease;
}

.np-album--link:hover {
  color: var(--text-color);
}

.np-chapter {
  order: 4;
  margin-top: 0.25rem;
  padding: 0 16px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0;
  opacity: 1;
  color: var(--np-text-2);
}

.np-caption {
  order: 5;
  margin-top: 0.5rem;
  padding: 0 16px;
  font-size: 13px;
  letter-spacing: 0;
  opacity: 1;
  color: var(--np-text-3);
}

/* ---- transport ---------------------------------------------------------- */

.player-bottom {
  flex-shrink: 0;
  position: unset !important;
  padding-bottom: max(var(--device-inset-bottom), min(3%, 3vh));
  width: 100%;
}

.track-info {
  margin-top: 10px;
  margin-bottom: 10px;
  padding-top: 2vh;
  padding-bottom: 2vh;
  text-align: center;
  line-height: 10%;
}

.track-info-subtitle {
  opacity: 0.5;
}

.media-controls {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 15px;
  /* match the visual gap between the controls and the volume bar below */
  margin-top: 10px;
  height: 100px;
}

.media-controls-item {
  margin: 0 10px;
  width: 100%;
  height: 100%;
}

.queue-btn-wrapper,
.favorite-btn-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .media-controls-item {
    margin: 0 5px;
    width: 100%;
    height: 100%;
  }
}

.row {
  align-content: center;
}

.row-centered {
  justify-content: center;
  max-width: 100%;
  padding: 15px;
}

.media-controls > button {
  flex: 1 1 auto;
}

.media-controls-bottom {
  display: flex;
  flex: 0 1 auto;
  justify-content: center;
  align-items: center;
}

.media-controls-bottom > div {
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%;
}

.media-controls > div {
  width: calc(100% / 3);
}

/* Match the marginless transport icons so the play button stays centred. */
.media-controls > .queue-btn-wrapper,
.media-controls > .favorite-btn-wrapper {
  margin: 0;
}

.mediacontrols-right {
  display: table-cell;
  text-align: right;
  vertical-align: middle;
}

.mediacontrols-right > div {
  display: inline-flex;
  align-items: center;
}

div,
button {
  color: var(--text-color);
}

.play-btn-wrapper :deep(.play-btn-icon) {
  background-color: var(--text-color) !important;
}

/* Icon.vue rests its buttons at 0.62 until hover; the solid disc is the main
   action and would read as greyed out, the more so on touch with no hover */
.play-btn-wrapper
  :deep(.icon-container--button:not(.icon-container--disabled)) {
  opacity: 1;
}

.player-bottom :deep([data-slot="slider-range"]) {
  background-color: var(--text-color) !important;
}

.player-bottom :deep([data-slot="slider-thumb"])::before {
  background-color: var(--text-color) !important;
}

.player-bottom :deep([data-slot="slider-track"])::before {
  background-color: color-mix(
    in srgb,
    var(--text-color) 24%,
    transparent
  ) !important;
}

/* The room the controls act on, named on a glass pill. */
.np-room-pill {
  height: 32px !important;
  padding: 0 14px 0 11px !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  border-color: var(--np-glass-line) !important;
  background-color: var(--np-glass) !important;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  transition: background-color 150ms ease;
}

.np-room-pill:hover {
  background-color: var(--np-glass-hover) !important;
}

.np-room-pill :deep(.np-room-pill__icon) {
  color: var(--primary);
}

/* ---- lyrics ------------------------------------------------------------- */

.lyrics-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.lyrics-wrapper > :deep(.lyrics-container) {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
}

/* Editorial lyrics: left-aligned serif lines; the current one at full
   strength and very slightly larger, sung lines at half, lines to come
   fainter still. */
.lyrics-wrapper :deep(.synced-content),
.lyrics-wrapper :deep(.lyrics-content),
.lyrics-wrapper :deep(.lyrics-intro) {
  padding-left: 24px;
  padding-right: 24px;
}

.lyrics-wrapper :deep(.synced-content),
.lyrics-wrapper :deep(.lyrics-content) {
  text-align: left;
}

.lyrics-wrapper :deep(.lyrics-line) {
  margin: 0 0 10px;
  padding: 4px 0;
  font-size: clamp(1.375rem, 1rem + 0.8vw, 1.625rem);
  line-height: 1.32;
  transform-origin: left center;
}

.lyrics-wrapper :deep(.break-note) {
  font-size: clamp(1.375rem, 1rem + 0.8vw, 1.625rem);
}

.lyrics-wrapper :deep(.lyrics-line),
.lyrics-wrapper :deep(.lyrics-line.lyrics-line--far),
.lyrics-wrapper :deep(.lyrics-line.lyrics-line--hidden) {
  opacity: 0.32;
}

.lyrics-wrapper :deep(.lyrics-line.lyrics-line--past) {
  opacity: 0.5;
}

.lyrics-wrapper :deep(.lyrics-line.active) {
  opacity: 1;
}

.lyrics-wrapper :deep(.song-title) {
  font-size: clamp(1.75rem, 2.4vw, 2.375rem);
}

.lyrics-wrapper :deep(.artist-name) {
  margin-bottom: 24px;
  font-size: 1rem;
}

.lyrics-wrapper :deep(.lyrics-coming-soon) {
  font-size: 0.95rem;
}

.icon-thumb-large {
  width: 100%;
  aspect-ratio: 1;
  max-width: 400px;
  /* fit the box the artwork would have had, so on a short window it does not
     spill over the details below (the plain sizing above is the fallback) */
  width: min(100cqi, 100cqh, 400px);
  height: min(100cqi, 100cqh, 400px);
  flex: 0 0 auto;
  margin: 0 auto;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--text-color) 8%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-request-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: color-mix(in srgb, var(--badge-color) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-color) 35%, transparent);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--badge-color);
  margin-right: 0.5rem;
}

@media (max-width: 540px) {
  .main-media-details-image {
    padding-left: 16px;
    padding-right: 16px;
  }

  .main-media-details-track-info {
    padding: 12px 0 8px;
  }
}
</style>

<template>
  <div
    v-if="queueItem"
    :class="[
      'track-card',
      `position-${position}`,
      { 'guest-request': isGuestRequest, 'white-text': forceWhiteText },
    ]"
    :style="isGuestRequest ? guestRequestStyle : {}"
  >
    <div :class="['track-artwork', sizeClass]">
      <MediaItemThumb :item="queueItem" />
      <div
        v-if="position === 'current' && isPlaying"
        class="now-playing-overlay"
      >
        <NowPlayingBadge :show-badge="false" />
      </div>
    </div>
    <div :class="['track-info', sizeClass]">
      <div class="track-name">
        <MarqueeText :disabled="position !== 'current'">
          {{ trackName }}
        </MarqueeText>
      </div>
      <div v-if="artistName" class="track-artist">
        <MarqueeText :disabled="position !== 'current'">
          {{ artistName }}
        </MarqueeText>
      </div>
    </div>
    <!-- Progress bar for current playing track -->
    <div
      v-if="
        position === 'current' &&
        isPlaying &&
        progressPercentage > 0 &&
        showProgressBar
      "
      class="progress-bar"
    >
      <div
        class="progress-fill"
        :style="{ '--progress-scale': progressPercentage / 100 }"
      ></div>
    </div>
    <!-- Guest request badge -->
    <div v-if="isGuestRequest" class="guest-badge" :style="guestBadgeStyle">
      <Rocket v-if="isBoost" class="badge-icon" />
      <UserRound v-else class="badge-icon" />
      <span v-if="position === 'current'">{{ badgeText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarqueeText from "@/components/MarqueeText.vue";
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import { usePartyConfig } from "@/composables/usePartyConfig";
import { resolveActiveElapsedTime } from "@/helpers/activeElapsedTime";
import type { QueueItem } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { Rocket, UserRound } from "@lucide/vue";
import Color from "color";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const { config: partyConfig } = usePartyConfig();

export interface Props {
  queueItem?: QueueItem;
  position: "previous-2" | "previous-1" | "current" | "next-1" | "next-2";
  isPlaying?: boolean;
  requestBadgeColor?: string;
  boostBadgeColor?: string;
  forceWhiteText?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  queueItem: undefined,
  isPlaying: false,
  requestBadgeColor: "#2196F3", // Default: Blue
  boostBadgeColor: "#FF5722", // Default: Orange
  forceWhiteText: false,
});

// Ticking ref to force recompute of progress (Date.now() is non-reactive)
const nowTick = ref(0);
let rafId: number | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;

const startTick = () => {
  if (!showProgressBar.value) return;

  if (rafId === null) {
    const tick = () => {
      const now = Date.now();
      if (now - nowTick.value >= 64) {
        nowTick.value = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }
  if (fallbackTimer === null) {
    fallbackTimer = setInterval(() => (nowTick.value = Date.now()), 1000);
  }
};

const stopTick = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
};

onMounted(() => {
  // Start ticking if this is the current track and playing
  if (props.position === "current" && props.isPlaying) {
    startTick();
  }
});

onUnmounted(() => {
  stopTick();
});

// Check if this is a guest request (party sets party_guest=true)
const isGuestRequest = computed(() => {
  return props.queueItem?.extra_attributes?.party_guest === true;
});

// Check if this was added via "Boost" (party sets party_boosted=true)
const isBoost = computed(() => {
  return props.queueItem?.extra_attributes?.party_boosted === true;
});

// Get the badge color based on queue option (fallback to defaults if empty)
const badgeColor = computed(() => {
  const color = isBoost.value ? props.boostBadgeColor : props.requestBadgeColor;
  // Fallback to defaults if color is empty (before config loads)
  if (!color) return isBoost.value ? "#FF5722" : "#2196F3";
  return color;
});

// Older Cast and Android TV runtimes need precomputed alpha colors.
const guestRequestStyle = computed(() => {
  const color = Color(badgeColor.value);
  return {
    "--guest-background": color.alpha(0.2).string(),
    "--guest-border": color.alpha(0.4).string(),
    "--guest-current-background": color.alpha(0.25).string(),
    "--guest-current-border": color.alpha(0.5).string(),
    "--guest-shadow": color.alpha(0.3).string(),
  };
});

const guestBadgeStyle = computed(() => {
  const color = Color(badgeColor.value);
  return {
    "--badge-background": color.alpha(0.35).string(),
    "--badge-border": color.alpha(0.55).string(),
  };
});

// Get badge text based on queue option
const badgeText = computed(() => {
  if (!isGuestRequest.value) return "";
  if (isBoost.value) return $t("providers.party.boost");
  return $t("providers.party.request");
});

// Computed track name - prefer media_item.name for proper track title
const trackName = computed(() => {
  if (!props.queueItem) return "";
  // For radio streams, stream_metadata.title contains the current track
  const streamTitle = props.queueItem.streamdetails?.stream_metadata?.title;
  if (streamTitle) return streamTitle;
  // Use media_item.name for proper track title (not "Artist - Title" format)
  if (props.queueItem.media_item && "name" in props.queueItem.media_item) {
    return props.queueItem.media_item.name;
  }
  // Fallback to queue item name
  return props.queueItem.name;
});

// Computed subtitle - shows "Artist - Album" or just artist for streams
const artistName = computed(() => {
  if (!props.queueItem) return "";

  // For radio streams, just show the artist
  const streamArtist = props.queueItem.streamdetails?.stream_metadata?.artist;
  if (streamArtist) return streamArtist;

  // Build "Artist - Album" format for regular tracks
  const parts: string[] = [];

  // Get artist name(s)
  if (
    props.queueItem.media_item &&
    "artists" in props.queueItem.media_item &&
    props.queueItem.media_item.artists.length
  ) {
    const artistStr = props.queueItem.media_item.artists
      .map((a: { name: string }) => a.name)
      .join(", ");
    parts.push(artistStr);
  }

  // Get album name
  if (
    props.queueItem.media_item &&
    "album" in props.queueItem.media_item &&
    props.queueItem.media_item.album?.name
  ) {
    parts.push(props.queueItem.media_item.album.name);
  }

  return parts.join(" • ");
});

// Size class used by both artwork and info sections
const sizeClass = computed(() => {
  return props.position === "current" ? "size-large" : "size-medium";
});

const showProgressBar = computed(
  () => partyConfig.value?.show_progress_bar ?? false,
);

// Progress percentage for the visual ticker (only for current track)
const progressPercentage = computed(() => {
  // Include nowTick.value so this computed re-evaluates periodically while mounted
  void nowTick.value;

  if (props.position !== "current" || !props.queueItem || !props.isPlaying) {
    return 0;
  }

  const duration = props.queueItem.duration;
  if (!duration || duration <= 0) {
    return 0;
  }

  const elapsed = resolveActiveElapsedTime() ?? 0;
  return Math.min((elapsed / duration) * 100, 100);
});

// Watch for changes in position and isPlaying to start/stop ticking
watch(
  () => props.position === "current" && props.isPlaying,
  (shouldTick: boolean) => {
    if (shouldTick) {
      startTick();
    } else {
      stopTick();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
/* Glass panels over the art wash. Colours are rgb triplets with alpha rather
   than color-mix(): older Cast and Android TV runtimes need precomputed alpha
   colors. */
.track-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2vh;
  padding: 1.2vh;
  border-radius: 1.8vh;
  background: rgba(var(--v-theme-surface), 0.42);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.08);
  backdrop-filter: blur(2vh) saturate(1.3);
  -webkit-backdrop-filter: blur(2vh) saturate(1.3);
  width: 95%;
  box-sizing: border-box;
  overflow: hidden;
  transform: scale(var(--scale, 1));
  opacity: var(--opacity, 1);
  z-index: var(--z-index, 1);
  transition:
    transform 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    margin 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* over artwork or a dark wash the glass goes dark, with a white hairline */
.track-card.white-text {
  background: rgba(16, 16, 18, 0.3);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.track-card.position-previous-2 {
  --scale: 0.85;
  --opacity: 0.5;
  --z-index: 1;
  margin-bottom: -4vh;
}

.track-card.position-previous-1 {
  --scale: 0.9;
  --opacity: 0.7;
  --z-index: 2;
  margin-bottom: -3vh;
}

.track-card.position-current {
  --scale: 1;
  --opacity: 1;
  --z-index: 3;
  background: rgba(var(--v-theme-surface), 0.62);
  box-shadow:
    inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.1),
    0 3vh 7vh -2.5vh rgba(0, 0, 0, 0.3);
}

.track-card.white-text.position-current {
  background: rgba(16, 16, 18, 0.46);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    0 3vh 7vh -2.5vh rgba(0, 0, 0, 0.6);
}

.track-card.position-next-1 {
  --scale: 0.9;
  --opacity: 0.7;
  --z-index: 2;
  margin-top: -3vh;
}

.track-card.position-next-2 {
  --scale: 0.85;
  --opacity: 0.5;
  --z-index: 1;
  margin-top: -4vh;
}

/* Guest request highlighting - color set via inline style from config */
.track-card.guest-request {
  background: var(--guest-background);
  border: 2px solid var(--guest-border);
  box-shadow: none;
}

.track-card.guest-request.position-current {
  background: var(--guest-current-background);
  border: 2px solid var(--guest-current-border);
  box-shadow:
    0 3vh 7vh -2.5vh rgba(0, 0, 0, 0.45),
    0 0 2vh var(--guest-shadow);
}

.guest-badge {
  /* Color set via inline style from config */
  display: flex;
  align-items: center;
  gap: 0.6vh;
  padding: 0.6vh 1.3vh;
  background: var(--badge-background);
  border: 1px solid var(--badge-border);
  border-radius: 999px;
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-size: clamp(0.65rem, 1.2vh, 1.1rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-shrink: 0;
  margin-left: auto;
}

.white-text .guest-badge {
  color: white;
}

.badge-icon {
  width: clamp(14px, 1.6vh, 24px);
  height: clamp(14px, 1.6vh, 24px);
}

/* The cover: square and whole, small radius, a soft shadow beneath. */
.track-artwork {
  position: relative;
  flex-shrink: 0;
  border-radius: max(3px, 0.4vh);
  overflow: hidden;
  box-shadow: 0 1.4vh 3vh -1.2vh rgba(0, 0, 0, 0.55);
  transition:
    width 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.track-artwork::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
  pointer-events: none;
}

.now-playing-overlay {
  position: absolute;
  bottom: 0.5vh;
  right: 0.5vh;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 0.6vh;
  padding: 0.4vh;
}

.now-playing-overlay :deep(.now-playing-icon .bar) {
  background: rgb(var(--v-theme-primary));
}

.track-artwork.size-medium {
  width: 12vh;
  height: 12vh;
}

.track-artwork.size-large {
  width: 20vh;
  height: 20vh;
}

.track-info {
  flex: 1;
  min-width: 0;
  transform-origin: left center;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.track-info.size-medium {
  transform: scale(0.85);
}

/* the track is named in the display serif; the artist line is Inter */
.track-name {
  font-family: var(--font-heading);
  font-weight: 500;
  letter-spacing: -0.012em;
  line-height: 1.18;
  margin-bottom: 0.2em;
  font-size: clamp(1.5rem, 3.4vh, 3.8rem);
  color: rgba(var(--v-theme-on-surface), 0.96);
}

.track-artist {
  font-size: clamp(1.05rem, 2.1vh, 2.4rem);
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.white-text .track-name {
  color: rgba(255, 255, 255, 0.97);
}

.white-text .track-artist {
  color: rgba(255, 255, 255, 0.7);
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0.5vh;
  overflow: hidden;
  /* Make sure it sits behind the content */
  z-index: -1;
}

.progress-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  transform-origin: left center;
  transform: scaleX(var(--progress-scale, 0));
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

@media (max-width: 768px) {
  .track-card {
    gap: 0.75vh;
    padding: 0.5vh;
  }
}
</style>

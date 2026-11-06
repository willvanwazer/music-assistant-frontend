<template>
  <div
    class="now-playing-view"
    :class="isDark ? 'now-playing-view--dark' : 'now-playing-view--light'"
    :style="viewStyle"
  >
    <!-- "ultrablur" backdrop: soft, slowly drifting blobs of the artwork's
         colours, a veil that keeps text legible and a little film grain.
         Feathered with masks rather than blur filters and kept free of
         color-mix(), so older cast runtimes can draw it. -->
    <div class="now-playing-backdrop" aria-hidden="true">
      <div class="now-playing-ub">
        <span class="now-playing-ub__blob"></span>
        <span class="now-playing-ub__blob"></span>
        <span class="now-playing-ub__blob"></span>
      </div>
      <div class="now-playing-veil"></div>
      <div class="now-playing-grain"></div>
    </div>
    <VisualizerCanvas
      v-if="visualizerActive"
      :preset="visualizerPresetPref"
      :blur="visualizerBlurPref"
      :opacity="visualizerOpacityPref"
      :player-id="store.activePlayer?.player_id"
      covered-when-fullscreen
    />
    <div v-if="!store.activePlayer" class="now-playing-empty">
      {{ $t("no_player") }}
    </div>
    <template v-else>
      <div class="now-playing-artwork">
        <img
          v-if="artworkUrl"
          :src="artworkUrl"
          :alt="$t('tooltip.artwork')"
          class="now-playing-artwork-image"
        />
        <div v-else class="now-playing-artwork-fallback">
          <PlayerIcon :icon="store.activePlayer.icon" :size="160" />
        </div>
      </div>

      <div class="now-playing-info">
        <div
          v-if="store.activePlayer.powered === false"
          class="now-playing-title"
        >
          {{ store.activePlayer.name }}
        </div>
        <template v-else>
          <MarqueeText :sync="marqueeSync" class="now-playing-title">
            {{
              store.activePlayer.current_media?.title || store.activePlayer.name
            }}
          </MarqueeText>
          <!-- placeholder when no artist, so the artwork position stays fixed -->
          <MarqueeText :sync="marqueeSync" class="now-playing-subtitle">
            {{ store.activePlayer.current_media?.artist || " " }}
          </MarqueeText>
        </template>
      </div>

      <div class="now-playing-timeline">
        <PlayerTimeline
          :show-labels="true"
          :color="timelineColor"
          :waveform="waveformData"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MarqueeText from "@/components/MarqueeText.vue";
import VisualizerCanvas from "@/components/VisualizerCanvas.vue";
import PlayerIcon from "@/components/PlayerIcon.vue";
import { useActiveTrackWaveform } from "@/composables/useActiveTrackWaveform";
import { useVisualizer } from "@/composables/visualizer/useVisualizer";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import {
  type ImageColorPalette,
  getMediaImageUrl,
  paletteFromServer,
} from "@/helpers/utils";
import PlayerTimeline from "@/layouts/default/PlayerOSD/PlayerTimeline.vue";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { useColorMode } from "@vueuse/core";
import Color from "color";
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

// Pin the active player to whichever one this dashboard was cast for.
onMounted(() => {
  const playerId = route.query.player;
  if (typeof playerId === "string" && playerId) {
    store.activePlayerId = playerId;
  }
});

// Synced marquee scrolling for the title/artist, same as the fullscreen player.
const marqueeSync = new MarqueeTextSync();

// Waveform is always on here: the guest session has no show_waveform preference, so it defaults on.
const { waveformBins: waveformData } = useActiveTrackWaveform();

const artworkUrl = computed(
  () => getMediaImageUrl(store.activePlayer?.current_media?.image_url) || null,
);

const {
  visualizerPresetPref,
  visualizerBlurPref,
  visualizerOpacityPref,
  visualizerActive,
} = useVisualizer(() => store.activePlayer?.player_id);

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");

const colorPalette = computed<ImageColorPalette>(() =>
  paletteFromServer(store.activePlayer?.current_media?.palette),
);

const timelineColor = computed(() => (isDark.value ? "#ffffff" : "#000000"));

// Same gradient treatment as the fullscreen player background; it stays as
// the base the wash is drawn over (and all there is without a palette).
const backgroundGradient = computed(() => {
  const bgHex = isDark.value
    ? colorPalette.value.darkColor || "#000"
    : colorPalette.value.lightColor || "#fff";
  const bgColor = Color(bgHex);
  const topColor = bgColor.lighten(0.25);
  const bottomColor = bgColor.darken(0.25);
  return `linear-gradient(to bottom, ${topColor.hex()}, ${bottomColor.hex()})`;
});

// Tones for the "ultrablur" wash, drawn from the artwork palette the same way
// as the fullscreen player's: a base and three soft blobs, deep in the dark
// theme and pulled most of the way to white in the light one. Resolved here
// rather than with color-mix(), which older cast runtimes lack.
const ultrablurTones = computed((): Record<string, string> => {
  const { darkColor, lightColor } = colorPalette.value;
  if (!darkColor && !lightColor) return {};
  let deep: ReturnType<typeof Color>;
  let bright: ReturnType<typeof Color>;
  try {
    deep = Color(darkColor || lightColor).saturate(0.2);
    bright = Color(lightColor || darkColor).rotate(14);
  } catch {
    return {};
  }
  if (isDark.value) {
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

const viewStyle = computed(() => ({
  background: backgroundGradient.value,
  ...ultrablurTones.value,
}));
</script>

<style scoped>
.now-playing-view {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3vh;
  /* Deeper bottom padding lifts the timeline clear of the screen edge. */
  padding: 5vh 5vw 9vh;
  box-sizing: border-box;
}

/* White over the smoky veil in the dark theme; the theme's ink over the
   frosted one in the light theme. */
.now-playing-view--dark {
  color: #fff;
}

.now-playing-view--light {
  color: var(--foreground, #1c1c1e);
}

/* Lift content above the backdrop and visualizer layers (z-index 0). */
.now-playing-view > *:not(.visualizer-layer):not(.now-playing-backdrop) {
  position: relative;
  z-index: 1;
}

/* Keep the vh fallback in a separate rule: the minifier collapses duplicate
   declarations, which would drop it and leave Android TV without a height. */
@supports (height: 100dvh) {
  .now-playing-view {
    height: 100dvh;
  }
}

/* ---- "ultrablur" backdrop ------------------------------------------------ */

/* Offsets rather than inset, for the oldest cast runtimes. */
.now-playing-backdrop {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Without a palette nothing is set and the gradient on the view shows
   through. */
.now-playing-ub {
  position: absolute;
  top: -20%;
  right: -20%;
  bottom: -20%;
  left: -20%;
  background-color: var(--np-base, transparent);
  transition: background-color 0.9s ease;
}

.now-playing-ub__blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.9;
  -webkit-mask-image: radial-gradient(
    closest-side,
    #000 15%,
    rgba(0, 0, 0, 0.55) 55%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: radial-gradient(
    closest-side,
    #000 15%,
    rgba(0, 0, 0, 0.55) 55%,
    rgba(0, 0, 0, 0) 100%
  );
  transition: background-color 0.9s ease;
}

.now-playing-ub__blob:nth-child(1) {
  width: 90%;
  height: 100%;
  left: -15%;
  top: -10%;
  background-color: var(--np-t1, transparent);
}

.now-playing-ub__blob:nth-child(2) {
  width: 80%;
  height: 90%;
  right: -15%;
  top: -20%;
  background-color: var(--np-t2, transparent);
}

.now-playing-ub__blob:nth-child(3) {
  width: 85%;
  height: 80%;
  left: 15%;
  bottom: -25%;
  background-color: var(--np-t3, transparent);
}

@media (prefers-reduced-motion: no-preference) {
  .now-playing-ub__blob {
    will-change: transform;
    animation: now-playing-drift 32s ease-in-out infinite;
  }

  .now-playing-ub__blob:nth-child(2) {
    animation-duration: 38s;
    animation-direction: reverse;
  }

  .now-playing-ub__blob:nth-child(3) {
    animation-duration: 44s;
  }
}

@keyframes now-playing-drift {
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

/* Over artwork, so fixed tones rather than theme surfaces. */
.now-playing-veil {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(10, 10, 12, 0.42);
}

.now-playing-view--light .now-playing-veil {
  background: rgba(255, 255, 255, 0.38);
}

.now-playing-grain {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  opacity: 0.18;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>");
}

.now-playing-view--light .now-playing-grain {
  opacity: 0.12;
}

/* ---- content ------------------------------------------------------------ */

.now-playing-empty {
  font-size: 1.5rem;
  opacity: 0.7;
}

/* The row hugs the artwork rather than growing, so the leftover height is
   shared with the auto margins below instead of pooling under the artwork. */
.now-playing-artwork {
  flex: 0 0 auto;
  margin-top: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Whole, square and barely rounded, lifted on a deep shadow. */
.now-playing-artwork-image {
  /* flex-basis auto with no shrink: the square must never be squashed to fit */
  flex: 0 0 auto;
  width: min(52vh, 85vw);
  height: min(52vh, 85vw);
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

.now-playing-view--light .now-playing-artwork-image {
  box-shadow:
    0 40px 80px -32px rgba(20, 20, 50, 0.45),
    0 0 0 1px rgba(10, 10, 20, 0.06);
}

.now-playing-artwork-fallback {
  flex: 0 0 auto;
  width: min(52vh, 85vw);
  height: min(52vh, 85vw);
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
}

.now-playing-view--light .now-playing-artwork-fallback {
  background: rgba(10, 10, 20, 0.06);
}

.now-playing-info {
  flex: 0 0 auto;
  /* Centres the text between the artwork and the timeline. */
  margin-block: auto;
  width: 100%;
  max-width: 900px;
  text-align: center;
  overflow: hidden;
}

/* The track is named in the display serif. A Nest Hub (1024x600) and a
   Chromecast on a TV (1280x720) report almost the same viewport, so the steep
   slope plus a cap that bites around 1070px is what lets the Hub catch up
   without the TV growing much. */
.now-playing-title {
  font-family: var(--font-heading);
  font-size: clamp(1.75rem, 4.5vw, 3rem);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.012em;
}

.now-playing-subtitle {
  font-size: clamp(1rem, 2.2vw, 1.5rem);
  font-weight: 600;
  opacity: 0.78;
  margin-top: 0.4rem;
}

.now-playing-timeline {
  flex: 0 0 auto;
  width: 100%;
  max-width: 900px;
}

/* The timeline's elapsed/total labels come from a shared Vuetify caption class;
   scale them here only, so the rest of the app keeps its 12px captions. */
.now-playing-timeline :deep(.text-caption) {
  font-size: clamp(0.75rem, 1.3vw, 0.9375rem);
  font-variant-numeric: tabular-nums;
}
</style>

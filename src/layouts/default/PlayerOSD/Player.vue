<template>
  <!-- Non-mobile: background gradient and player bar -->
  <template v-if="!useFloatingPlayer">
    <div class="mediacontrols-bg" :data-floating="useFloatingPlayer"></div>
    <!-- the popouts find their top edge to hang above by this id -->
    <div
      id="player-bar"
      class="mediacontrols"
      :data-compact="!getBreakpointValue('bp6')"
    >
      <div class="mediacontrols-left">
        <!-- the quality chip sits with the other room controls on the right -->
        <PlayerTrackDetails
          :show-quality-details-btn="false"
          :show-only-artist="getBreakpointValue('bp7') ? false : true"
          title-opens-details
          :color-palette="coverImageColorPalette"
          primary-color="var(--foreground)"
        />
      </div>
      <div class="mediacontrols-bottom-center">
        <div class="player-center-controls">
          <div class="player-center-transport">
            <div class="player-center-side-action">
              <FavoriteMenuBtn class="player-control-button" />
            </div>

            <PlayerControls
              :visible-components="{
                repeat: { isVisible: getBreakpointValue('bp3') },
                shuffle: { isVisible: getBreakpointValue('bp3') },
                play: {
                  isVisible: true,
                  icon: {
                    staticWidth: '42px',
                    staticHeight: '42px',
                  },
                  size: 20,
                },
                previous: { isVisible: getBreakpointValue('bp3') },
                next: { isVisible: getBreakpointValue('bp3') },
              }"
            />

            <div class="player-center-side-action">
              <QueueBtn :size="22" class="player-control-button" />
            </div>
          </div>

          <!-- each of these shows only while it has something to say, so most
               of the time this is empty and the row is the transport alone -->
          <div v-if="showCenterExtras" class="player-center-extras">
            <PlaybackSpeedBtn v-if="showPlaybackSpeed" />
            <SleepTimerBtn />
          </div>
        </div>
        <!-- progress bar: the track's waveform where one has been analysed,
             with the elapsed and total time either side of it -->
        <PlayerTimeline
          v-if="getBreakpointValue('bp6')"
          class="player-bar-timeline"
          :show-labels="true"
          :waveform="waveformBins"
        />
      </div>
      <div class="mediacontrols-bottom-right">
        <div>
          <!-- what the room is receiving; it opens the signal path -->
          <QualityDetailsBtn v-if="showQualityChip" />
          <!-- player extended control buttons -->
          <PlayerExtendedControls
            :player="{
              isVisible: true,
            }"
            :volume="{
              isVisible: store.activePlayer != undefined,
            }"
          />
        </div>
      </div>
    </div>
  </template>

  <!-- Mobile: floating player with volume slider inside container -->
  <div v-else class="mediacontrols-mobile-container">
    <div class="mediacontrols-bg" :data-floating="useFloatingPlayer"></div>
    <div class="mediacontrols" :data-mobile="true">
      <!-- the whole card opens the player, so the empty space around the
           track details is clickable too; the controls stop their own clicks -->
      <div class="mediacontrols-left" @click="openActivePlayer">
        <PlayerTrackDetails
          :show-quality-details-btn="false"
          :show-only-artist="true"
          :compact="true"
          :color-palette="coverImageColorPalette"
          primary-color="var(--foreground)"
        />
      </div>
      <div class="mediacontrols-bottom-right">
        <div class="flex items-center">
          <!-- grouping sits beside play: both act on what this bar is playing -->
          <PlayerBarGroupControl floating />
          <!-- player mobile control buttons -->
          <PlayerControls
            :visible-components="{
              repeat: { isVisible: false },
              shuffle: { isVisible: false },
              play: {
                isVisible: true,
                icon: {
                  staticWidth: '40px',
                  staticHeight: '40px',
                },
                size: 18,
              },
              previous: { isVisible: false },
              next: { isVisible: false },
            }"
          />
        </div>
      </div>
    </div>
    <div v-if="store.activePlayer" class="volume-slider">
      <PlayerVolume
        :player="store.activePlayer"
        width="100%"
        :prefer-group-volume="true"
        :enable-popout="false"
        :request-expand-on-group-tap="true"
        :expand-on-touch="true"
        @toggle-group-expansion="showMobileVolumeControls = true"
      />
    </div>
    <PlayerBarMobileVolumeSheet
      v-if="store.activePlayer"
      v-model:open="showMobileVolumeControls"
      :player="store.activePlayer"
    />
  </div>
</template>

<script setup lang="ts">
import QualityDetailsBtn from "@/components/QualityDetailsBtn.vue";
import { useActiveTrackWaveform } from "@/composables/useActiveTrackWaveform";
import { ImageColorPalette, paletteFromServer } from "@/helpers/utils";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { store } from "@/plugins/store";
import vuetify from "@/plugins/vuetify";
import { computed, ref, watch } from "vue";
import PlayerBarGroupControl from "./PlayerBarGroupControl.vue";
import PlayerBarMobileVolumeSheet from "./PlayerBarMobileVolumeSheet.vue";
import FavoriteMenuBtn from "./PlayerControlBtn/FavoriteMenuBtn.vue";
import PlaybackSpeedBtn from "./PlayerControlBtn/PlaybackSpeedBtn.vue";
import QueueBtn from "./PlayerControlBtn/QueueBtn.vue";
import SleepTimerBtn from "./PlayerControlBtn/SleepTimerBtn.vue";
import PlayerControls from "./PlayerControls.vue";
import PlayerExtendedControls from "./PlayerExtendedControls.vue";
import PlayerTimeline from "./PlayerTimeline.vue";
import PlayerTrackDetails from "./PlayerTrackDetails.vue";
import PlayerVolume from "./PlayerVolume.vue";

interface Props {
  useFloatingPlayer: boolean;
}
const props = defineProps<Props>();
const showMobileVolumeControls = ref(false);

// The controls beside the queue button reach into the room the actions to their
// right leave free, so each waits for the width it fits in. Measured, that room
// clears the 85px countdown on its own from 1100px, and the two of them together
// only from 1160px - so the speed control waits for the next breakpoint up.
const showCenterExtras = computed(() => getBreakpointValue("bp7"));
const showPlaybackSpeed = computed(() => getBreakpointValue("bp8"));

// the quality chip joins the room controls on the right once they leave it the
// room, which is the width the bar used to offer it beside the track at
const showQualityChip = computed(
  () =>
    getBreakpointValue("bp9") && !getBreakpointValue({ breakpoint: "phone" }),
);

// shared with the full screen player, which already keeps it loaded for the
// track that is playing, so the bar adds no request of its own
const { waveformBins } = useActiveTrackWaveform();

/** Opens the fullscreen player, or the player picker when there is nothing to show. */
function openActivePlayer() {
  if (!store.activePlayer || store.activePlayer.powered === false) {
    store.showPlayersMenu = true;
    return;
  }
  store.showFullscreenPlayer = true;
}

const coverImageColorPalette = computed<ImageColorPalette>(() =>
  paletteFromServer(store.activePlayer?.current_media?.palette),
);

// The artwork is the only colour the bar carries, as a soft wash; without
// artwork there is nothing to tint it with and the chrome stays neutral.
const backgroundColor = computed(() => {
  if (vuetify.theme.current.value.dark) {
    if (coverImageColorPalette.value && coverImageColorPalette.value.darkColor)
      return coverImageColorPalette.value.darkColor;
    return "transparent";
  }
  if (coverImageColorPalette.value && coverImageColorPalette.value.lightColor)
    return coverImageColorPalette.value.lightColor;
  return "transparent";
});

watch(
  () => store.activePlayerId,
  () => {
    showMobileVolumeControls.value = false;
  },
);
</script>

<style scoped lang="scss">
.mediadetails-streamdetails .icon {
  opacity: 100;
}

/* The label beside a room control carries the value or the name it stands
   for. Its resting weight lives up here, out of the nested blocks below, so the
   open state's rule in the app stylesheet keeps out-ranking it. */
.mediacontrols :deep(.player-bar-action-label) {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ------------------------------------------------------------------------
   Floating mobile card
   ------------------------------------------------------------------------ */

/* Frosted: what scrolls beneath shows through, blurred, under a translucent
   popover surface. The surface is a layer of its own rather than a colour-mix
   so it still draws on the older Cast and Android TV runtimes. */
.mediacontrols-mobile-container {
  position: relative;
  isolation: isolate;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
  box-shadow:
    0 16px 40px -14px rgb(20 20 50 / 0.24),
    0 0 0 1px var(--border);
  /* must stay unprefixed: the minifier keeps only the last of a hand-written
     pair, and -webkit-backdrop-filter alone is dead in Chromium */
  backdrop-filter: blur(30px) saturate(1.6);
}

.dark .mediacontrols-mobile-container {
  box-shadow:
    0 16px 40px -10px rgb(0 0 0 / 0.6),
    0 0 0 1px var(--border);
}

.mediacontrols-mobile-container::before {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: var(--popover);
  opacity: 0.8;
  pointer-events: none;
  content: "";
}

/* ------------------------------------------------------------------------
   The bar
   ------------------------------------------------------------------------ */

.mediacontrols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 40%) minmax(0, 1fr);
  align-items: center;
  width: 100%;
  min-height: var(--player-bar-height);
  padding: 8px 15px;
  background-color: var(--card);
  .mediacontrols-bottom-center {
    flex: 0 1 40%;
    min-width: 0;
  }

  /* set off from the page by a hairline rather than a shadow. It hangs off the
     footer, as the artwork wash does, and draws over that wash */
  &:not([data-mobile="true"])::before {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 1px;
    background: var(--border);
    pointer-events: none;
    content: "";
  }

  &[data-mobile="true"] {
    display: flex;
    background-color: transparent;
    min-height: 0;
    /* the artwork ends up as far from the top as from the left once the row
       centres it; the volume row carries the space below */
    padding: 10px 12px 6px 10px;
    /* the card is a popover surface, so its controls take the text colour of
       one rather than the muted grey the flat bars rest at */
    :deep(.player-control-button) {
      color: var(--foreground) !important;
    }
    :deep(.player-control-button:hover:not([data-suppress-hover="true"])),
    :deep(.player-control-button[data-active="true"]),
    :deep(.player-control-button[data-state="open"]) {
      color: var(--primary) !important;
    }
    /* Icon.vue rests its buttons at 0.62 and only lifts them on hover, which a
       touch device never reaches, so play looked faded next to the grouping
       button beside it */
    :deep(.icon-container--button:not(.icon-container--disabled)) {
      opacity: 1;
    }
    /* play stays the primary action but is outlined here, so the compact row
       does not read as a solid block */
    :deep(.play-btn-icon) {
      min-width: 40px;
      min-height: 40px;
      border: 2px solid currentColor;
      background-color: transparent;
      color: var(--foreground);
    }
    .mediacontrols-bottom-right {
      margin-right: 0;
    }
    .mediacontrols-bottom-center {
      display: none;
    }
    .mediacontrols-left {
      flex: 1;
      min-width: 0;
      max-width: none;
      cursor: pointer;
    }
  }
}

/* The artwork is the only colour here: a soft wash out of the corner the cover
   sits in, never a band of colour across the bar. */
.mediacontrols-bg {
  height: 100%;
  position: absolute;
  width: 440px;
  left: 0px;
  top: 0px;
  /* it is positioned, so it paints over the row behind it; without this it
     takes every click that does not land on the controls or the text */
  pointer-events: none;
  opacity: 0.5;
  background: radial-gradient(
    ellipse 100% 160% at 0% 50%,
    v-bind("backgroundColor") 0%,
    transparent 72%
  );

  /* on the card it tints the frosted surface from under the content */
  &[data-floating="true"] {
    z-index: -1;
    border-radius: 16px;
    width: 100%;
    opacity: 0.35;
    background: linear-gradient(
      to right,
      v-bind("backgroundColor") 0%,
      transparent 90%
    );
  }
}

.mediacontrols-top-right {
  display: table-row;
}

.mediacontrols-left {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  > div {
    padding: 0px !important;
    min-width: 0;
  }
}

/* ------------------------------------------------------------------------
   Transport
   ------------------------------------------------------------------------ */

/* the transport takes the middle track and the extras the one after it. Neither
   outer track asks for room of its own, so they stay equal and the play button
   holds the centre of the bar whatever the extras beside it are showing; the
   extras reach past the column into the room the actions leave to their left
   instead. The middle track's own floor is waived so the transport still
   shrinks to fit a narrow bar, which is all it did before it had a track. */
.player-center-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr);
  align-items: center;
}

.player-center-transport {
  display: flex;
  grid-column: 2;
  align-items: center;
  /* the transport controls between the two side actions hold a width of their
     own, so from 769 to 809px the row is wider than the track it sits in.
     Centring splits that overhang between the two ends rather than letting it
     all fall to one, which is what keeps the play button centred there too. */
  justify-content: center;
}

/* the actions to the right claim their whole column even though they draw only
   at the far end of it, so the extras have to be lifted over that to stay
   clickable where they reach into the room it leaves free */
.player-center-extras {
  position: relative;
  z-index: 1;
  display: flex;
  grid-column: 3;
  align-items: center;
  justify-self: start;
  gap: 8px;
  margin-inline-start: 8px;
}

.player-center-side-action {
  display: flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
}

.mediacontrols:not([data-mobile="true"]) {
  /* 20px glyphs in 42px cells leave the 22px between them the transport is
     spaced at; play takes the same again either side of its disc */
  .player-center-transport :deep(.player-controls-elements) {
    width: 42px;
  }

  .player-center-transport :deep(.play-btn-wrapper) {
    margin-inline: 8px;
  }

  /* resting controls are muted and come up to the text colour under the
     pointer; Icon.vue's own resting fade is replaced by that */
  .player-center-transport :deep(.icon-container--button) {
    color: var(--muted-foreground);
    opacity: 1;
    transition: color 150ms ease;
  }

  .player-center-transport :deep(.icon-container--button:hover) {
    color: var(--foreground);
  }

  /* the favourite and queue buttons either side follow the same rule rather
     than the accent the app gives player controls under the pointer, which
     here is what says shuffle or repeat is on; open, they keep the accent */
  .player-center-transport :deep(.player-control-button:hover) {
    color: var(--foreground) !important;
  }

  .player-center-transport
    :deep(.player-control-button[data-suppress-hover="true"]) {
    color: var(--muted-foreground) !important;
  }

  .player-center-transport :deep(.player-control-button[data-state="open"]) {
    color: var(--primary) !important;
  }

  .player-center-transport
    :deep(.icon-container--button.icon-container--disabled) {
    opacity: 0.4;
  }

  /* play is a disc in the text colour with the glyph cut out of it in the
     page colour, so it reads in both themes without a colour of its own */
  .player-center-transport :deep(.icon-container--button.play-btn-icon) {
    min-width: 42px;
    min-height: 42px;
    background-color: var(--foreground);
    color: var(--background);
  }

  /* shuffle and repeat take the accent while on, and a dot under them, so the
     state still reads where the accent alone would be easy to miss */
  .player-center-transport :deep(.icon-container[data-toggled]) {
    position: relative;
  }

  .player-center-transport :deep(.icon-container[data-toggled]::after) {
    position: absolute;
    top: calc(50% + 14px);
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--primary);
    content: "";
  }
}

@media (prefers-reduced-motion: no-preference) {
  .mediacontrols:not([data-mobile="true"])
    .player-center-transport
    :deep(.icon-container--button.play-btn-icon) {
    transition:
      transform 150ms ease,
      color 150ms ease;
  }

  .mediacontrols:not([data-mobile="true"])
    .player-center-transport
    :deep(.icon-container--button.play-btn-icon:hover) {
    transform: scale(1.06);
  }

  .mediacontrols:not([data-mobile="true"])
    .player-center-transport
    :deep(.icon-container--button.play-btn-icon:active) {
    transform: scale(0.95);
  }
}

/* ------------------------------------------------------------------------
   Seek
   ------------------------------------------------------------------------ */

/* elapsed time, the waveform and the length sit on one line under the
   transport, as the times either side of a record's run-out groove */
.player-bar-timeline {
  width: 100%;
  max-width: 640px;
  height: auto !important;
  margin: 2px auto 0;
}

.player-bar-timeline > :deep(div) {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  column-gap: 12px;
}

.player-bar-timeline :deep([data-slot="slider"]) {
  grid-row: 1;
  grid-column: 2;
  height: 20px !important;
}

.player-bar-timeline[data-waveform] :deep([data-slot="slider"]) {
  height: 30px !important;
}

.player-bar-timeline[data-waveform] :deep([data-slot="slider-track"]) {
  height: 26px !important;
}

/* the chapter names the full screen player floats over its timeline would sit
   on the transport here, so the bar leaves them to the ticks */
.player-bar-timeline :deep([data-slot="slider"] > button) {
  display: none;
}

.player-bar-timeline :deep(.time-text-row) {
  display: contents;
}

.player-bar-timeline :deep(.time-text-row > div) {
  grid-row: 1;
  display: block;
  width: auto;
  color: var(--subtle-foreground);
  font-size: 11.5px !important;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0 !important;
  line-height: 1 !important;
  white-space: nowrap;
}

.player-bar-timeline :deep(.time-text-left) {
  grid-column: 1;
  text-align: right;
  cursor: pointer;
}

.player-bar-timeline :deep(.time-text-right) {
  grid-column: 3;
  text-align: left;
}

/* played bars in the text colour, the rest a quieter grey, and the accent
   under the pointer, where the bright part previews the seek */
.player-bar-timeline :deep(.waveform-layer path) {
  transition: stroke 200ms ease;
}

.player-bar-timeline :deep(.waveform-layer:first-child path) {
  stroke: var(--subtle-foreground);
  stroke-opacity: 0.55;
}

.player-bar-timeline
  :deep([data-slot="slider"]:hover .waveform-layer + .waveform-layer path) {
  stroke: var(--primary);
}

.player-bar-timeline
  :deep(
    [data-slot="slider"][data-disabled] .waveform-layer + .waveform-layer path
  ) {
  stroke: var(--foreground);
}

.player-bar-timeline
  :deep([data-slot="slider"]:hover [data-slot="slider-range"]),
.player-bar-timeline
  :deep([data-slot="slider"]:hover [data-slot="slider-thumb"]) {
  background-color: var(--primary) !important;
}

/* ------------------------------------------------------------------------
   Room controls
   ------------------------------------------------------------------------ */

.mediacontrols-bottom-right {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  > div {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }
}

.mediacontrols :deep(.player-bar-action-row) {
  justify-content: flex-end;
}

/* spacing the controls rather than the row keeps the popovers' own anchor
   elements, which sit between them and take no space, out of the count */
.mediacontrols :deep(.player-bar-action-row > button ~ button) {
  margin-inline-start: 6px;
}

.mediacontrols :deep(.player-bar-action-icon) {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
}

/* the volume and grouping triggers are compact enough that a soft fill is what
   shows them as targets. The app stylesheet clears the ghost fill off every
   player control, so they take one back, heavier than that rule; one tapped
   shut gives it up again until the pointer comes back */
.mediacontrols :deep(.player-control-button.player-bar-volume-button:hover),
.mediacontrols :deep(.player-control-button.player-bar-group-button:hover),
.mediacontrols
  :deep(.player-control-button.player-bar-volume-button[data-state="open"]),
.mediacontrols
  :deep(.player-control-button.player-bar-group-button[data-state="open"]) {
  background-color: var(--secondary) !important;
}

.mediacontrols
  :deep(
    .player-control-button.player-bar-volume-button[data-suppress-hover="true"]
  ),
.mediacontrols
  :deep(
    .player-control-button.player-bar-group-button[data-suppress-hover="true"]
  ) {
  background-color: transparent !important;
}

.mediacontrols :deep(.player-bar-volume-button .player-bar-action-label) {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

/* the level beside the number only once the room controls have the width */
.mediacontrols :deep(.player-bar-volume-meter) {
  display: none;
}

/* the member count is on the speaker's badge, and spelt out in the button's
   name, so the bar shows it once */
.mediacontrols :deep(.player-bar-group-button .player-bar-action-label) {
  display: none;
}

/* The player button names the room this bar controls, in words, in a pill: the
   speaker in the accent, the name in the text colour. It keeps its fill in
   every state and shows the open drawer with a ring, so the state colours the
   app gives player controls do not apply to it. */
.mediacontrols :deep(.player-control-button.player-bar-player-button) {
  flex: 0 1 auto !important;
  min-width: 0 !important;
  max-width: 220px;
  background-color: var(--secondary) !important;
  color: var(--foreground) !important;
}

.mediacontrols :deep(.player-control-button.player-bar-player-button:hover) {
  background-color: color-mix(
    in oklab,
    var(--foreground) 8%,
    var(--secondary)
  ) !important;
}

.mediacontrols
  :deep(
    .player-control-button.player-bar-player-button[data-suppress-hover="true"]
  ) {
  background-color: var(--secondary) !important;
}

.mediacontrols
  :deep(.player-control-button.player-bar-player-button[data-active="true"]) {
  box-shadow: 0 0 0 2px var(--primary);
}

.mediacontrols :deep(.player-bar-player-button .player-bar-action-icon) {
  color: var(--primary);
}

.mediacontrols :deep(.player-bar-player-button .player-bar-action-label) {
  font-size: 13px;
}

/* the room name is what the pill is for, so as the bar narrows the chevron
   goes first, then the speaker and the count of rooms joined to it */
@media screen and (max-width: 1099px) {
  .mediacontrols :deep(.player-bar-player-chevron) {
    display: none;
  }
}

@media screen and (max-width: 959px) {
  .mediacontrols :deep(.player-bar-player-button .player-bar-action-icon),
  .mediacontrols :deep(.player-bar-player-count) {
    display: none;
  }
}

@media screen and (min-width: 1100px) {
  .mediacontrols :deep(.player-bar-action-row > button ~ button) {
    margin-inline-start: 8px;
  }
}

@media screen and (min-width: 1300px) {
  .mediacontrols :deep(.player-bar-volume-meter) {
    display: block;
  }
}

/* ------------------------------------------------------------------------
   Floating card volume
   ------------------------------------------------------------------------ */

.volume-slider {
  width: auto;
  margin: -4px 10px 2px 10px;
}

/* the slider only needs room for its own track in the floating bar. Its
   colours are the shared slider's: the card is a popover surface now rather
   than an artwork tint, so it needs no contrast colours of its own */
.volume-slider :deep(.player-volume-container) {
  min-height: 28px;
}
</style>

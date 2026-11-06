<template>
  <div class="fullscreen-header-controls">
    <!-- sleep timer countdown (only while a timer is running) -->
    <SleepTimerBtn pill />

    <!-- streaming quality details chip (moved up from under the track info) -->
    <QualityDetailsBtn v-if="hasActiveAudioPath" pill />

    <!-- lyrics: available -> clickable toggle (fully primary while the panel is open) -->
    <TooltipProvider v-if="lyricsState === 'available'" :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost-outline"
            :size="showLabel ? 'xs' : 'icon-xs'"
            :class="[pillClass, lyricsActive ? activePillClass : '']"
            :aria-label="$t('lyrics')"
            @click="emit('toggle-lyrics')"
          >
            <MicVocal :size="16" :class="{ 'mic-singing': lyricsActive }" />
            <span v-if="showLabel">{{ $t("lyrics") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="z-[10001] max-w-[240px]">
          {{ lyricsActive ? $t("lyrics_hide") : $t("lyrics_show") }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- lyrics: loading or unavailable -> greyed out with an explanatory tooltip -->
    <TooltipProvider v-else-if="lyricsState !== 'none'" :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost-outline"
            :size="showLabel ? 'xs' : 'icon-xs'"
            :class="['text-muted-foreground cursor-default', pillClass]"
            :aria-label="$t('lyrics')"
          >
            <MicVocal
              :size="16"
              :class="lyricsState === 'loading' ? 'animate-pulse' : ''"
            />
            <span v-if="showLabel">{{ $t("lyrics") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="z-[10001] max-w-[240px]">
          {{ lyricsTooltip }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- dynamic mode: autoplay is implicitly on and the queue refills itself
         from its sources. Non-interactive indicator; the tooltip names the
         seeds it is based on. -->
    <TooltipProvider v-if="dynamicModeActive" :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            as="span"
            variant="ghost-outline"
            :size="showLabel ? 'xs' : 'icon-xs'"
            :class="[pillClass, activePillClass, 'cursor-default']"
            :aria-label="$t('autoplay')"
          >
            <AutoplayIcon :size="16" active />
            <span v-if="showLabel">{{ $t("autoplay") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="z-[10001] max-w-[240px]">
          <p class="font-medium">{{ $t("autoplay_dynamic_title") }}</p>
          <p class="mt-1 opacity-80">
            {{
              seedNames
                ? `${$t("autoplay_dynamic_lead")} ${seedNames}`
                : $t("autoplay_dynamic_desc")
            }}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- autoplay: direct toggle (primary while enabled). Hidden while dynamic
         mode is active or for infinite streams (autoplay is moot there). -->
    <TooltipProvider v-if="autoplayApplicable && queue" :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost-outline"
            :size="showLabel ? 'xs' : 'icon-xs'"
            :class="[pillClass, autoplayEnabled ? activePillClass : '']"
            :aria-label="$t('autoplay')"
            @click="setAutoplay(!autoplayEnabled)"
          >
            <AutoplayIcon :size="16" :active="autoplayEnabled" />
            <span v-if="showLabel">{{ $t("autoplay") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="z-[10001] max-w-[240px]">
          <p class="font-medium">
            {{
              autoplayEnabled ? $t("autoplay_disable") : $t("autoplay_enable")
            }}
          </p>
          <p v-if="!autoplayEnabled" class="mt-1 opacity-80">
            {{ $t("autoplay_explanation") }}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- crossfade: direct toggle (primary while enabled) -->
    <TooltipProvider v-if="showCrossfade && queue" :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost-outline"
            :size="showLabel ? 'xs' : 'icon-xs'"
            :class="[pillClass, crossfadeEnabled ? activePillClass : '']"
            :aria-label="$t('crossfade')"
            @click="toggleCrossfade"
          >
            <CrossfadeIcon :size="16" :smart="smartCrossfadeActive" />
            <span v-if="showLabel">{{ $t("crossfade") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="z-[10001] max-w-[240px]">
          <p class="font-medium">{{ $t("crossfade") }}</p>
          <p class="mt-1 opacity-80">{{ crossfadeDescription }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <ShowDashboardButton
      dashboard="now_playing"
      :player-id="store.activePlayerId"
      variant="ghost-outline"
      :button-size="showLabel ? 'xs' : 'icon-xs'"
      :icon-size="16"
      content-class="z-[10001]"
    />

    <!-- audio overlay: shown only while an overlay sound is active. Clicking it
         reopens the overlay dialog to adjust the sound or volume. -->
    <TooltipProvider v-if="overlayActive && queue" :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost-outline"
            :size="showLabel ? 'xs' : 'icon-xs'"
            :class="[pillClass, activePillClass]"
            :aria-label="$t('audio_overlay')"
            @click="openOverlay"
          >
            <AudioLines :size="16" />
            <span v-if="showLabel">{{ $t("audio_overlay") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="z-[10001] max-w-[240px]">
          <p class="font-medium">{{ $t("audio_overlay") }}</p>
          <p v-if="overlayName" class="mt-1 opacity-80">{{ overlayName }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import QualityDetailsBtn from "@/components/QualityDetailsBtn.vue";
import ShowDashboardButton from "@/components/ShowDashboardButton.vue";
import SleepTimerBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/SleepTimerBtn.vue";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AutoplayIcon from "@/layouts/default/PlayerOSD/PlayerControlBtn/AutoplayIcon.vue";
import CrossfadeIcon from "@/layouts/default/PlayerOSD/PlayerControlBtn/CrossfadeIcon.vue";
import { useQueueModes } from "@/layouts/default/PlayerOSD/useQueueModes";
import { useActiveAudioPath } from "@/composables/useActiveAudioPath";
import { useAudioOverlay } from "@/composables/useAudioOverlay";
import api from "@/plugins/api";
import {
  isQueueInfiniteStream,
  queueSourceCrossfadeProvider,
} from "@/plugins/api/helpers";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { AudioLines, MicVocal } from "@lucide/vue";
import { computed } from "vue";

const props = defineProps<{
  lyricsState?: string;
  lyricsActive?: boolean;
}>();
const emit = defineEmits<{
  (e: "toggle-lyrics"): void;
}>();

// Explanation shown in the tooltip when lyrics can't be opened (yet).
const lyricsTooltip = computed(() =>
  props.lyricsState === "loading"
    ? $t("lyrics_loading")
    : $t("lyrics_unavailable_song"),
);

const { hasActiveAudioPath } = useActiveAudioPath();

// Shared dynamic/autoplay state (also used by the queue mode banner).
const {
  queue,
  sources,
  dynamicModeActive,
  autoplayEnabled,
  autoplayApplicable,
  setAutoplay,
} = useQueueModes();

// Source (seed) names for the dynamic-mode tooltip (plain text — the tooltip
// can't host links, so the banner is where they're clickable).
const seedNames = computed(() =>
  sources.value
    .map((source) => source.name)
    .filter(Boolean)
    .join(", "),
);

const showLabel = computed(() => !store.mobileLayout);

// The ghost-outline variant provides the pill shape; the stylesheet below
// turns every pill in this row (the sleep timer, quality and dashboard ones
// included) into frosted glass.
const pillClass = "relative";

// Solid primary pill for the "enabled" state of the toggles.
const activePillClass =
  "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:bg-primary dark:hover:bg-primary/90";

// --- crossfade ---
const crossfadeEnabled = computed(
  () => queue.value?.crossfade_enabled === true,
);

// the server reports smart_fades_active when the effective crossfade is "smart"
const smartFadesActive = computed(
  () => queue.value?.smart_fades_active === true,
);

const sourceCrossfadeName = computed(() => {
  const provider = queueSourceCrossfadeProvider(queue.value);
  return provider ? api.getProviderName(provider) : undefined;
});
const smartCrossfadeActive = computed(
  () =>
    crossfadeEnabled.value &&
    smartFadesActive.value &&
    !sourceCrossfadeName.value,
);
const crossfadeDescription = computed(() => {
  if (!crossfadeEnabled.value) return $t("crossfade_explanation");
  if (sourceCrossfadeName.value) {
    return $t("streamdetails.audio_processing.crossfade_mode.source", [
      sourceCrossfadeName.value,
    ]);
  }
  return smartFadesActive.value
    ? $t("streamdetails.audio_processing.crossfade_mode.smart")
    : $t("streamdetails.audio_processing.crossfade_mode.standard");
});

// Crossfade only applies to an active queue that is playing regular tracks.
// Hide the control entirely for external sources, audiosources and radio streams.
const showCrossfade = computed(() => {
  const q = queue.value;
  if (!q || !q.active) return false;
  if (isQueueInfiniteStream(q)) return false;
  return "crossfade_enabled" in q;
});

const toggleCrossfade = () => {
  const q = queue.value;
  if (!q) return;
  api.queueCommandCrossfade(q.queue_id, !q.crossfade_enabled);
};

// --- audio overlay ---
const { openOverlayDialog } = useAudioOverlay();

const overlayActive = computed(() => queue.value?.overlay_enabled === true);
const overlayName = computed(() => queue.value?.overlay_source?.name);

const openOverlay = () => {
  const q = queue.value;
  if (q) openOverlayDialog(q.queue_id);
};
</script>

<style scoped>
.fullscreen-header-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Glass pills: translucent fill, blur and a hairline ring over the artwork
   wash. Every element in the row is one pill, and they come from several
   components (the sleep timer, quality and dashboard ones are not rendered
   here, and their tooltip/popover triggers rewrite data-slot), so the look is
   applied to the row's children. The utilities those buttons carry are
   !important, hence the same here. */
.fullscreen-header-controls > :deep(*) {
  height: 32px !important;
  padding-inline: 13px !important;
  gap: 7px !important;
  border-radius: 999px !important;
  border-color: var(
    --np-glass-line,
    color-mix(in oklab, var(--foreground) 12%, transparent)
  ) !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

/* icon-only pills (the dashboard one, and every pill on mobile) are round */
.fullscreen-header-controls > :deep(:not(:has(> span))) {
  width: 32px !important;
  padding-inline: 0 !important;
}

/* resting fill; an enabled toggle keeps its solid accent instead */
.fullscreen-header-controls > :deep(:not(.bg-primary)) {
  background-color: var(
    --np-glass,
    color-mix(in oklab, var(--popover) 62%, transparent)
  ) !important;
}

.fullscreen-header-controls
  > :deep(:not(.bg-primary):not(.cursor-default):hover) {
  background-color: var(
    --np-glass-hover,
    color-mix(in oklab, var(--popover) 82%, transparent)
  ) !important;
}

.fullscreen-header-controls > :deep(.bg-primary) {
  border-color: transparent !important;
}

/* while the lyrics panel is open the mic gently sways, like it's being sung
   into */
.mic-singing {
  transform-origin: 50% 85%;
  animation: mic-sway 2.4s ease-in-out infinite;
}

@keyframes mic-sway {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mic-singing {
    animation: none;
  }
}
</style>

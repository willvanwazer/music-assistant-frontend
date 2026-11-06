<template>
  <!-- streaming quality details -->
  <Popover v-if="activeAudioPath">
    <!-- quality pill/chip trigger; pill = ghost-outline to match the fullscreen
         header controls. A single clean PopoverTrigger so it opens reliably
         inside the fullscreen v-dialog (a Tooltip wrapper here blocked it). -->
    <PopoverTrigger as-child>
      <!-- the player bar's chip is a filled pill whose dot carries the tier -->
      <Button
        :variant="pill ? 'ghost-outline' : 'secondary'"
        size="xs"
        :class="{ 'quality-chip': !pill }"
        :disabled="triggerDisabled"
        :title="$t('show_audio_chain_details')"
        :aria-label="qualityDetailsLabel"
      >
        <span
          class="quality-pill-dot"
          :style="{
            backgroundColor: qualityTierColor,
            '--quality-dot': qualityTierColor,
          }"
        ></span>
        <span class="tracking-wide">{{ qualityLabel }}</span>
      </Button>
    </PopoverTrigger>

    <PopoverContent
      :side="pill ? 'bottom' : 'top'"
      align="center"
      :collision-padding="8"
      class="audio-processing-popover overflow-y-auto"
      data-testid="audio-processing-popover-content"
      :aria-label="$t('show_audio_chain_details')"
      @open-auto-focus="focusPopoverContent"
    >
      <div
        ref="popoverFocusTarget"
        class="audio-processing-popover-focus-target outline-none"
        tabindex="-1"
      >
        <!-- the tier the room ends up receiving names the signal path, over
             the steps that lead to it -->
        <p class="audio-processing-popover-title ma-display">
          <span
            class="quality-pill-dot"
            :style="{
              backgroundColor: qualityTierColor,
              '--quality-dot': qualityTierColor,
            }"
            aria-hidden="true"
          ></span>
          {{ qualityTierName }}
        </p>
        <AudioProcessingDetails
          :chain="activeAudioPath.audioProcessing"
          :stream-details="activeAudioPath.streamDetails"
          :crossfade-intent="activeAudioPath.crossfadeIntent"
        />
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AudioProcessingDetails from "@/components/AudioProcessingDetails.vue";
import { store } from "@/plugins/store";
import { $t } from "@/plugins/i18n";
import {
  QualityTier,
  qualityTierRangeLabel,
  qualityTierToColor,
  useStreamQuality,
} from "@/composables/useStreamQuality";
import { useActiveAudioPath } from "@/composables/useActiveAudioPath";

// render the quality indicator as a rounded "pill" (matching the shadcn player
// header controls) instead of the default square chip
defineProps<{ pill?: boolean }>();

const { activeAudioPath } = useActiveAudioPath();

const { minOutputQualityTier, maxOutputQualityTier } = useStreamQuality(
  computed(() => activeAudioPath.value?.audioProcessing),
);

const qualityLabel = computed(() => {
  return qualityTierRangeLabel(
    minOutputQualityTier.value,
    maxOutputQualityTier.value,
  );
});
const qualityTierColor = computed(() =>
  qualityTierToColor(maxOutputQualityTier.value),
);

// the signal path is titled by the best tier the room receives, in the words
// its steps already use for a tier
const qualityTierName = computed(() => {
  switch (maxOutputQualityTier.value) {
    case QualityTier.HIRES:
      return $t("streamdetails.audio_processing.quality.hi_res");
    case QualityTier.LOSSLESS:
      return $t("streamdetails.audio_processing.quality.lossless");
    case QualityTier.GOOD:
      return $t("streamdetails.audio_processing.quality.standard");
    case QualityTier.LOW:
      return $t("streamdetails.audio_processing.quality.low");
    default:
      return $t("streamdetails.audio_processing.quality.unknown");
  }
});
const qualityDetailsLabel = computed(() =>
  qualityLabel.value
    ? $t("show_audio_chain_details_for_quality", {
        quality: qualityLabel.value,
      })
    : $t("show_audio_chain_details"),
);
const popoverFocusTarget = ref<HTMLElement>();

// disable the trigger when there is no active queue with items; a live
// source has no queue to check and is gated by the popover's own v-if instead
const triggerDisabled = computed(() => {
  if (activeAudioPath.value?.kind !== "queue") return false;
  return (
    !store.activePlayerQueue ||
    !store.activePlayerQueue?.active ||
    store.activePlayerQueue?.items == 0
  );
});

function focusPopoverContent(event: Event): void {
  event.preventDefault();
  popoverFocusTarget.value?.focus();
}
</script>

<script lang="ts">
export const iconHiRes = new URL("@/assets/hires.png", import.meta.url).href;

export const imgCoverDark = new URL("@/assets/cover_dark.png", import.meta.url)
  .href;
export const imgCoverLight = new URL(
  "@/assets/cover_light.png",
  import.meta.url,
).href;
export const iconFolder = new URL("@/assets/folder.svg", import.meta.url).href;
</script>

<style>
.audio-processing-popover[data-slot="popover-content"] {
  width: min(420px, calc(100vw - 16px));
  max-width: calc(100vw - 16px);
  max-height: min(
    560px,
    calc(100dvh - 16px),
    var(--reka-popover-content-available-height, calc(100dvh - 16px))
  );
  padding: 18px 20px 16px;
  font-size: 0.8125rem;
  line-height: 1.35;
  overscroll-behavior: contain;
}

.quality-pill-dot {
  display: inline-block;
  height: 8px;
  width: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}

/* The player bar's chip: a filled pill, the tier dot ringed in its own colour
   so it still reads as a tier at that size. The button's size utilities are
   !important, so the paired selector is what lets these through. */
[data-slot="button"].quality-chip {
  gap: 7px !important;
  padding-inline: 10px 11px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em;
}

.quality-chip .quality-pill-dot,
.audio-processing-popover-title .quality-pill-dot {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--quality-dot) 22%, transparent);
}

.audio-processing-popover-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 14px 2px;
  font-size: 1.5rem;
  line-height: 1.15;
}

.audio-processing-popover-title .quality-pill-dot {
  width: 10px;
  height: 10px;
}

@media (max-width: 379px) {
  .audio-processing-popover[data-slot="popover-content"] {
    padding: 14px 14px 12px;
    font-size: 0.8rem;
  }
}
</style>

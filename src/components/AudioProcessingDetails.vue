<template>
  <div class="audio-processing-details" data-testid="audio-processing-details">
    <!-- each section carries its tier as --tier, which colours the stretch of
         the signal line it covers and the node of every step on it -->
    <section
      class="audio-processing-group"
      data-section="input"
      data-testid="audio-input-path"
      :style="{ '--tier': qualityTierToColor(inputQualityTier) }"
    >
      <div class="audio-processing-header">
        <span
          class="audio-processing-quality-dot"
          :style="{ backgroundColor: qualityTierToColor(inputQualityTier) }"
        ></span>
        <span class="audio-processing-header-title">
          {{ $t("streamdetails.input_header") }}
        </span>
        <span class="audio-processing-header-meta">
          {{ inputQualityLabel }}
        </span>
        <span class="audio-processing-header-rule" aria-hidden="true"></span>
      </div>

      <div class="audio-processing-section">
        <AudioProcessingStage
          v-for="(stage, stageIndex) in inputStages"
          :key="stage.key"
          :stage="stage"
          :class="{
            'audio-processing-stage--terminal':
              outputPaths.length === 0 &&
              processingStages.length === 0 &&
              stageIndex === inputStages.length - 1,
          }"
        />
      </div>
    </section>

    <section class="audio-processing-group" data-section="processing">
      <div class="audio-processing-header">
        <span
          class="audio-processing-quality-dot audio-processing-quality-dot--neutral"
        ></span>
        <span class="audio-processing-header-title">
          {{ $t("streamdetails.processing_header") }}
        </span>
        <span
          class="audio-processing-header-rule audio-processing-header-rule--wide"
          aria-hidden="true"
        ></span>
      </div>

      <div class="audio-processing-section">
        <AudioProcessingStage
          v-for="(stage, stageIndex) in processingStages"
          :key="stage.key"
          :stage="stage"
          :class="{
            'audio-processing-stage--terminal':
              outputPaths.length === 0 &&
              stageIndex === processingStages.length - 1,
          }"
        />
      </div>
    </section>

    <section
      v-for="(output, outputIndex) in outputPaths"
      :key="output.key"
      class="audio-processing-group"
      data-section="output"
      data-testid="audio-output-path"
      :data-player-ids="output.playerIds.join(',')"
      :style="{ '--tier': qualityTierToColor(output.qualityTier) }"
    >
      <div class="audio-processing-header">
        <span
          class="audio-processing-quality-dot"
          :style="{ backgroundColor: qualityTierToColor(output.qualityTier) }"
        ></span>
        <span class="audio-processing-header-title">
          {{ $t("streamdetails.output_header") }}
        </span>
        <span class="audio-processing-header-meta">
          {{ output.qualityLabel }}
        </span>
        <span class="audio-processing-header-rule" aria-hidden="true"></span>
      </div>

      <div class="audio-processing-section">
        <AudioProcessingStage
          v-for="stage in output.stages"
          :key="stage.key"
          :stage="stage"
        />
        <AudioProcessingStage
          :stage="output.destination"
          :class="{
            'audio-processing-stage--terminal':
              outputIndex === outputPaths.length - 1,
          }"
        />
      </div>
    </section>

    <!-- what the colours along the line mean; the steps spell out their own
         quality in words, so this is only for the eye -->
    <div class="audio-processing-legend" aria-hidden="true">
      <span
        v-for="tier in legendTiers"
        :key="tier.key"
        class="audio-processing-legend-item"
        :style="{ '--tier': tier.color }"
      >
        <span class="audio-processing-legend-dot"></span>
        {{ $t(tier.key) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import AudioProcessingStage from "@/components/AudioProcessingStage.vue";
import { useAudioProcessingDetails } from "@/composables/useAudioProcessingDetails";
import {
  QualityTier,
  qualityTierToColor,
} from "@/composables/useStreamQuality";
import { $t } from "@/plugins/i18n";
import type {
  AudioProcessingChain,
  CrossfadeMode,
  StreamDetails,
} from "@/plugins/api/interfaces";

const props = defineProps<{
  chain: AudioProcessingChain;
  streamDetails: StreamDetails;
  crossfadeIntent?: CrossfadeMode;
}>();

const {
  inputQualityTier,
  inputQualityLabel,
  inputStages,
  processingStages,
  outputPaths,
} = useAudioProcessingDetails(
  toRef(props, "chain"),
  toRef(props, "streamDetails"),
  toRef(props, "crossfadeIntent"),
);

// best first, in the words the steps already use for each tier
const legendTiers = [
  {
    key: "streamdetails.audio_processing.quality.hi_res",
    color: qualityTierToColor(QualityTier.HIRES),
  },
  {
    key: "streamdetails.audio_processing.quality.lossless",
    color: qualityTierToColor(QualityTier.LOSSLESS),
  },
  {
    key: "streamdetails.audio_processing.quality.standard",
    color: qualityTierToColor(QualityTier.GOOD),
  },
  {
    key: "streamdetails.audio_processing.quality.low",
    color: qualityTierToColor(QualityTier.LOW),
  },
];
</script>

<style>
/* The signal path as a chain: one line down the left, coloured by the tier of
   each stretch it runs through, with a ringed node on it for every step. The
   section a step belongs to sets --tier; processing keeps the neutral one. */
.audio-processing-details {
  --tier: var(--muted-foreground);
  min-width: 0;
}

.audio-processing-details .audio-processing-group + .audio-processing-group {
  margin-top: 10px;
}

/* --- section heading: a small label sitting on the line --- */

.audio-processing-details .audio-processing-header {
  position: relative;
  display: grid;
  grid-template-columns: 16px max-content max-content minmax(20px, 1fr);
  column-gap: 8px;
  align-items: center;
  min-height: 22px;
}

/* the line leaves the heading's dot downwards... */
.audio-processing-details .audio-processing-header::before {
  position: absolute;
  top: 50%;
  bottom: 0;
  left: 7px;
  width: 2px;
  border-radius: 2px;
  background: var(--tier);
  opacity: 0.5;
  content: "";
}

/* ...and reaches up across the gap into the section before it */
.audio-processing-details
  .audio-processing-group
  + .audio-processing-group
  .audio-processing-header::before {
  top: -10px;
}

.audio-processing-details .audio-processing-quality-dot {
  z-index: 1;
  grid-column: 1;
  justify-self: center;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--tier);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--tier) 22%, transparent);
}

.audio-processing-details .audio-processing-quality-dot--neutral {
  background: var(--muted-foreground);
}

.audio-processing-details .audio-processing-header-title {
  color: var(--subtle-foreground);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}

.audio-processing-details .audio-processing-header-meta {
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

/* the line already joins the sections, so the rule the heading used to
   trail is left out */
.audio-processing-details .audio-processing-header-rule {
  display: none;
}

/* --- steps: a node on the line, an icon, then the title over its detail --- */

.audio-processing-details .audio-processing-stage {
  position: relative;
  display: grid;
  grid-template-columns: 16px 20px minmax(0, 1fr) 24px;
  column-gap: 8px;
  align-items: start;
  min-height: 30px;
}

.audio-processing-details .audio-processing-stage-connector {
  position: relative;
  grid-column: 1;
  align-self: stretch;
  min-height: 30px;
}

/* the stretch of line beside the step */
.audio-processing-details .audio-processing-stage-connector::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 7px;
  width: 2px;
  background: var(--tier);
  opacity: 0.5;
  content: "";
}

/* the step's node: a ring in the tier's colour, open in the middle so the line
   reads as running through it */
.audio-processing-details .audio-processing-stage-connector::after {
  position: absolute;
  top: 5px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--popover);
  box-shadow: inset 0 0 0 3px var(--tier);
  content: "";
}

/* the line ends at the last step's node */
.audio-processing-details
  .audio-processing-stage--terminal
  .audio-processing-stage-connector::before {
  bottom: auto;
  height: 11px;
}

.audio-processing-details .audio-processing-stage-icon {
  grid-column: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  color: var(--muted-foreground);
}

.audio-processing-details .audio-processing-stage-provider-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  /* pin the size whatever width the provider icon sets on itself inline */
  width: 18px !important;
  height: 18px;
  overflow: hidden;
}

.audio-processing-details .audio-processing-stage-provider-icon :is(svg, img) {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.audio-processing-details .audio-processing-stage-copy {
  grid-column: 3;
  min-width: 0;
  padding: 2px 0 8px;
}

.audio-processing-details .audio-processing-stage-primary {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
  line-height: 1.35;
}

.audio-processing-details .audio-processing-stage-title {
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.audio-processing-details .audio-processing-stage-badge {
  flex: 0 0 auto;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--muted-foreground);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}

.audio-processing-details .audio-processing-stage-subtitle {
  margin-top: 1px;
  color: var(--muted-foreground);
  font-size: 12.5px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.audio-processing-details .audio-processing-stage-subtitle-part--atomic {
  display: inline-block;
  white-space: nowrap;
}

.audio-processing-details .audio-processing-stage-info {
  grid-column: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: end;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.audio-processing-details .audio-processing-stage-info:hover {
  background: var(--secondary);
  color: var(--foreground);
}

.audio-processing-details .audio-processing-stage-info:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}

/* --- legend: the four tiers the line can be coloured by --- */

.audio-processing-details .audio-processing-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.audio-processing-details .audio-processing-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.audio-processing-details .audio-processing-legend-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tier);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--tier) 22%, transparent);
}
</style>

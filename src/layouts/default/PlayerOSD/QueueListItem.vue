<!--
  A single row in the fullscreen player's unified queue list.

  Dedicated, shadcn/Tailwind-based replacement for the generic (Vuetify)
  ListItem when rendering PlayerQueue items. It is state-aware so the list can
  visually distinguish already played tracks, the currently playing track, the
  items locked in the stream buffer and the freely reorderable up-next items.
-->
<template>
  <div
    v-hold="onHold"
    class="qitem"
    :class="{
      'qitem--played': state === 'played',
      'qitem--playing': state === 'playing',
      'qitem--buffered': state === 'buffered',
      'qitem--unavailable': !item.available,
      'qitem--dragging': dragging,
      'qitem--ghost': ghost,
      'qitem--mobile': isMobile,
    }"
    :data-queue-current="state === 'playing' ? 'true' : undefined"
    role="button"
    tabindex="0"
    @click="emit('click', $event)"
    @click.capture="swallowClickAfterHold"
    @contextmenu.prevent="emit('menu', $event)"
    @keydown.enter.prevent="emit('click', $event)"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @touchstart.passive="onTouchStart"
  >
    <!-- thumbnail (with now-playing equalizer overlay) -->
    <div class="qitem__thumb">
      <MediaItemThumb size="44" :item="item" />
      <div v-if="showEqualizer" class="qitem__eq" aria-hidden="true">
        <MiniEqualizer
          v-if="waveformBins"
          color="rgb(var(--v-theme-primary))"
          :bars="4"
          :height="16"
        />
        <NowPlayingBadge v-else :show-badge="false" :show-icon="true" />
      </div>
    </div>

    <!-- title + subtitle -->
    <div class="qitem__body">
      <MarqueeText :sync="marqueeSync" :disabled="!marqueeActive">
        <span class="qitem__title">{{ title }}</span>
      </MarqueeText>
      <div v-if="artistName" class="qitem__subtitle">
        <MarqueeText
          class="qitem__artist"
          :sync="marqueeSync"
          :disabled="!marqueeActive"
        >
          <span>{{ artistName }}</span>
        </MarqueeText>
      </div>
    </div>

    <!-- trailing badges + actions -->
    <div class="qitem__append">
      <PartyPlayerBadge
        v-if="item.extra_attributes?.party_guest === true"
        :type="
          item.extra_attributes?.party_boosted === true ? 'boost' : 'request'
        "
        :badge-color="
          item.extra_attributes?.party_boosted === true
            ? boostBadgeColor
            : requestBadgeColor
        "
      />
      <!-- buffered indicator: already loaded into the stream to play next -->
      <TooltipProvider v-if="state === 'buffered'" :delay-duration="200">
        <Tooltip>
          <TooltipTrigger as-child>
            <span class="qitem__info" @click.stop>
              <InfoIcon class="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" class="z-[10001] max-w-[240px]">
            {{ $t("queue_buffered_explanation") }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TriangleAlertIcon
        v-if="!item.available"
        class="size-4 shrink-0 text-destructive"
      />
      <!-- duration sits to the left of the always-visible action buttons; items
           without a fixed length (radio, live sources) simply show nothing -->
      <span v-if="item.duration" class="qitem__duration">{{
        formatDuration(item.duration)
      }}</span>
      <!-- Fixed-width slot so the menu stays aligned whether or not a row has a
           grip (only up-next rows are reorderable). -->
      <div class="qitem__actions">
        <!-- drag handle to reorder. Active on up-next items; disabled/grayed on
             every other row (now playing, buffered, played can't be reordered).
             Shown at the far right; on desktop it appears on hover/focus. -->
        <button
          type="button"
          class="qitem__grip"
          :disabled="state !== 'upcoming'"
          :aria-label="$t('queue_reorder')"
          @pointerdown.stop.prevent="emit('dragstart', $event)"
          @click.stop
          @contextmenu.prevent
        >
          <GripVerticalIcon class="size-4" />
        </button>
        <!-- context menu button -->
        <Button
          variant="ghost"
          size="icon-sm"
          class="qitem__menu"
          :aria-label="$t('queue_options')"
          @click.stop="emit('menu', $event)"
          @pointerdown.stop
        >
          <EllipsisVerticalIcon class="size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarqueeText from "@/components/MarqueeText.vue";
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import MiniEqualizer from "@/components/MiniEqualizer.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import PartyPlayerBadge from "@/components/party/PartyPlayerBadge.vue";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHoldToOpenMenu } from "@/composables/useHoldToOpenMenu";
import { useActiveTrackWaveform } from "@/composables/useActiveTrackWaveform";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import { formatDuration } from "@/helpers/utils";
import { QueueItem } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import {
  EllipsisVerticalIcon,
  GripVerticalIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "@lucide/vue";
import { computed, ref } from "vue";

export type QueueItemState = "played" | "playing" | "buffered" | "upcoming";

interface Props {
  item: QueueItem;
  state: QueueItemState;
  // Whether the player is actually rendering audio (drives the equalizer).
  isPlaying?: boolean;
  // Shared marquee sync group so the visible scrolling title(s) stay in sync.
  marqueeSync?: MarqueeTextSync;
  requestBadgeColor?: string;
  boostBadgeColor?: string;
  // Whether this row is the one currently being dragged to reorder.
  dragging?: boolean;
  // Whether this is the floating "ghost" clone that follows the pointer.
  ghost?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  marqueeSync: undefined,
  requestBadgeColor: "#2196f3",
  boostBadgeColor: "#ff5722",
  dragging: false,
  ghost: false,
});

const emit = defineEmits<{
  (e: "click", event: Event): void;
  (e: "menu", event: Event): void;
  (e: "dragstart", event: PointerEvent): void;
}>();

const hovered = ref(false);

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  (evt: Event) => emit("menu", evt),
);

const { waveformBins } = useActiveTrackWaveform();

// Only animate the title/album marquee for the now-playing track, or while a
// row is hovered — keeps the list calm and avoids dozens of scrolling rows.
const marqueeActive = computed(
  () => props.state === "playing" || hovered.value,
);

const showEqualizer = computed(
  () => props.state === "playing" && props.isPlaying,
);

const title = computed(() => props.item.media_item?.name || props.item.name);

const artistName = computed(() => {
  const mediaItem = props.item.media_item;
  if (mediaItem && "artists" in mediaItem && mediaItem.artists.length) {
    return mediaItem.artists.map((a) => a.name).join(", ");
  }
  return "";
});

// Mobile layout drops the duration and shows the grip alongside the menu
// button. Width-based (store.mobileLayout) rather than a hover media query,
// which isn't reliable in the PWA / device emulation.
const isMobile = computed(() => store.mobileLayout);
</script>

<style scoped>
/* Rows sit on the fullscreen player's glass panel, so their tones derive from
   the --text-color the panel follows rather than the app theme. */
.qitem {
  --qitem-text-2: color-mix(
    in srgb,
    var(--text-color, currentColor) 66%,
    transparent
  );
  --qitem-text-3: color-mix(
    in srgb,
    var(--text-color, currentColor) 48%,
    transparent
  );
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-color, currentColor);
  transition:
    background-color 150ms ease,
    opacity 150ms ease;
  user-select: none;
}

.qitem:hover {
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 6%,
    transparent
  );
}

.qitem:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}

.qitem--played {
  opacity: 0.5;
}

.qitem--played:hover {
  opacity: 0.72;
}

/* Now playing: a soft neutral fill; the title carries the accent. */
.qitem--playing {
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 10%,
    transparent
  );
}

.qitem--playing:hover {
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 13%,
    transparent
  );
}

/* Buffered: locked into the stream to play next — faint tint reads as cued. */
.qitem--buffered {
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}

.qitem--buffered:hover {
  background: color-mix(in srgb, var(--primary) 11%, transparent);
}

.qitem--unavailable {
  opacity: 0.5;
}

.qitem__thumb {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 3px;
  overflow: hidden;
}

.qitem__eq {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.qitem__body {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.qitem__title {
  font-size: var(--queue-title-size, 0.84375rem);
  font-weight: 600;
  line-height: 1.3;
}

.qitem--playing .qitem__title {
  color: var(--primary);
}

.qitem__subtitle {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
  font-size: var(--queue-subtitle-size, 0.75rem);
  color: var(--qitem-text-2);
}

.qitem__artist {
  min-width: 0;
  overflow: hidden;
}

.qitem__append {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.qitem__duration {
  flex: 0 0 auto;
  white-space: nowrap;
  font-size: 12px;
  color: var(--qitem-text-3);
  font-variant-numeric: tabular-nums;
}

/* Fixed-width + right-aligned so the menu aligns with or without a grip. */
.qitem__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  width: calc(4rem + 4px);
}

.qitem__info {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  color: var(--qitem-text-3);
  cursor: help;
}

.qitem__info:hover {
  color: var(--text-color, currentColor);
}

/* Row menu: quiet until the row is pointed at. The ghost variant's own hover
   fill is an opaque chip, too heavy on the glass panel. */
.qitem__menu {
  color: var(--qitem-text-3);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.qitem:hover .qitem__menu,
.qitem__menu:focus-visible {
  color: var(--text-color, currentColor);
}

/* nested so it outranks the ghost variant's dark:hover fill */
.qitem .qitem__menu:hover {
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 12%,
    transparent
  ) !important;
  color: var(--text-color, currentColor) !important;
}

/* Mobile layout drops the duration; the grip + menu stay visible. */
.qitem--mobile .qitem__duration {
  display: none;
}

/* Drag handle: plain button for full pointer-gesture control, sized like
   icon-sm, at the far end of the row. */
.qitem__grip {
  order: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  color: var(--qitem-text-3);
  cursor: grab;
  /* Don't let touch turn the drag into a scroll. */
  touch-action: none;
  transition:
    opacity 150ms ease,
    color 150ms ease,
    background-color 150ms ease;
}

.qitem__grip:not(:disabled):hover {
  color: var(--text-color, currentColor);
  background: color-mix(
    in srgb,
    var(--text-color, currentColor) 12%,
    transparent
  );
}

/* Non-reorderable rows: solid muted color (not opacity) stays legible when dimmed. */
.qitem__grip:disabled {
  color: var(--muted-foreground);
  cursor: default;
}

/* With a pointer, handles appear while the row is pointed at or focused;
   touch layouts keep them visible. */
.qitem:not(.qitem--mobile) .qitem__grip {
  opacity: 0;
}

.qitem:not(.qitem--mobile):hover .qitem__grip,
.qitem:not(.qitem--mobile):focus-within .qitem__grip,
.qitem--dragging .qitem__grip {
  opacity: 1;
}

/* Source row hides in place; the ghost stands in while dragging. */
.qitem--dragging {
  opacity: 0;
  pointer-events: none;
}

.qitem--dragging .qitem__grip {
  cursor: grabbing;
}

/* Floating drag clone: lifted onto a solid popover surface with a deep
   shadow so it reads as picked up. */
.qitem--ghost {
  background: var(--popover);
  color: var(--popover-foreground);
  box-shadow:
    0 16px 40px -10px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px var(--border);
  cursor: grabbing;
}

.qitem--ghost .qitem__subtitle {
  color: var(--muted-foreground);
}

.qitem--ghost .qitem__actions {
  display: none;
}
</style>

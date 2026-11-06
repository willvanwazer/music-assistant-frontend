<template>
  <div
    class="queue-item"
    :class="{
      'queue-item-current': absoluteIndex === currentQueueIndex,
      'queue-item-played': absoluteIndex < currentQueueIndex,
      'queue-item--expanded': isExpanded,
      'queue-item--clickable': absoluteIndex > currentQueueIndex,
    }"
    @click="onItemClick"
  >
    <div class="queue-item-info">
      <div class="queue-position">
        <NowPlayingBadge
          v-if="absoluteIndex === currentQueueIndex && isPlaying"
          :show-badge="false"
        />
        <span v-else class="queue-number">{{ absoluteIndex + 1 }}</span>
      </div>
      <Avatar class="queue-avatar size-12 rounded-[3px]">
        <AvatarImage :src="imageUrl" :alt="item.name" />
        <AvatarFallback class="avatar-placeholder rounded-[3px]">
          <Music :size="20" />
        </AvatarFallback>
      </Avatar>
      <div class="queue-info">
        <MarqueeText class="queue-name">
          {{ title }}
        </MarqueeText>
        <MarqueeText class="queue-artist">
          {{ subtitle }}
        </MarqueeText>
      </div>

      <!-- Guest request badge -->
      <span
        v-if="item.extra_attributes?.party_guest === true"
        class="guest-request-badge"
        :style="badgeStyle"
      >
        <component :is="badgeIconComponent" :size="10" />
        <span>{{ badgeLabel }}</span>
      </span>
    </div>

    <!-- Boost action (shown when expanded on upcoming items) -->
    <template v-if="isExpanded && canBoost">
      <div class="queue-item-actions">
        <Button
          size="sm"
          :disabled="boostDisabled || boosting"
          class="boost-btn"
          :style="{ '--btn-bg': boostBadgeColor }"
          @click.stop="$emit('boost', item)"
        >
          <Spinner v-if="boosting" class="size-4" />
          <Rocket v-else :size="16" />
          {{ $t("providers.party.boost") }}
        </Button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MarqueeText from "@/components/MarqueeText.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner/Spinner.vue";
import { getMediaItemImageUrl } from "@/helpers/utils";
import type { QueueItem } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { Music, Rocket, UserRound } from "@lucide/vue";
import Color from "color";
import { computed } from "vue";

const props = defineProps<{
  item: QueueItem;
  index: number;
  queueFetchOffset: number;
  currentQueueIndex: number;
  isPlaying: boolean;
  boostBadgeColor: string;
  requestBadgeColor: string;
  boostEnabled: boolean;
  rateLimitingEnabled: boolean;
  boostTokens: number;
  boosting: boolean;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  boost: [item: QueueItem];
  toggleExpand: [queueItemId: string];
}>();

const canBoost = computed(
  () => props.boostEnabled && absoluteIndex.value > props.currentQueueIndex,
);

const boostDisabled = computed(
  () => props.rateLimitingEnabled && props.boostTokens <= 0,
);

const onItemClick = () => {
  if (absoluteIndex.value > props.currentQueueIndex) {
    emit("toggleExpand", props.item.queue_item_id);
  }
};

const absoluteIndex = computed(() => props.queueFetchOffset + props.index);

const imageUrl = computed(() => {
  if (!props.item.image) return "";
  return getMediaItemImageUrl(props.item.image);
});

const title = computed(() => {
  return props.item.media_item?.name || props.item.name;
});

const subtitle = computed(() => {
  const mediaItem = props.item.media_item;
  const parts: string[] = [];

  if (mediaItem && "artists" in mediaItem && mediaItem.artists.length > 0) {
    parts.push(mediaItem.artists.map((a) => a.name).join(", "));
  }

  if (mediaItem && "album" in mediaItem && mediaItem.album?.name) {
    parts.push(mediaItem.album.name);
  }

  return parts.length > 0
    ? parts.join(" • ")
    : $t("providers.party.guest_page.unknown_artist");
});

const isBoosted = computed(
  () => props.item.extra_attributes?.party_boosted === true,
);

const badgeColor = computed(() => {
  const color = isBoosted.value
    ? props.boostBadgeColor
    : props.requestBadgeColor;
  if (!color) return isBoosted.value ? "#FF5722" : "#2196F3";
  return color;
});

// Older Cast and Android TV runtimes need precomputed alpha colors.
const badgeStyle = computed(() => {
  const color = Color(badgeColor.value);
  return {
    "--badge-color": badgeColor.value,
    "--badge-background": color.alpha(0.2).string(),
    "--badge-border": color.alpha(0.4).string(),
  };
});

const badgeIconComponent = computed(() =>
  isBoosted.value ? Rocket : UserRound,
);

const badgeLabel = computed(() =>
  isBoosted.value ? $t("providers.party.boost") : $t("providers.party.request"),
);
</script>

<style scoped>
.queue-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  background: transparent;
  border-radius: 12px;
  min-height: 64px;
  transition: background 0.15s ease;
}

.queue-item--clickable {
  cursor: pointer;
}

.queue-item--clickable:hover {
  background: color-mix(in oklab, var(--foreground) 5%, transparent);
}

.queue-item--expanded,
.queue-item--clickable.queue-item--expanded:hover {
  background: var(--card);
  box-shadow: inset 0 0 0 1px var(--border);
}

.queue-item-info {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex: 1;
  min-width: 0;
}

.queue-item-actions {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

/* the boost colour is the server's, so the button keeps it */
.queue-item-actions .boost-btn {
  font-weight: 600;
  text-transform: none;
  background-color: var(--btn-bg) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

/* the playing row: a soft accent fill, its title in the accent */
.queue-item-current {
  background: color-mix(in oklab, var(--primary) 14%, transparent);
}

.queue-item-current .queue-name {
  color: var(--primary);
}

.queue-item-played {
  opacity: 0.5;
}

.queue-position {
  width: 20px;
  margin-right: -2px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.queue-position :deep(.now-playing-icon) {
  margin: 0;
}

.queue-number {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--subtle-foreground);
}

.queue-avatar {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary);
  color: var(--subtle-foreground);
}

.queue-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.queue-name {
  font-size: 0.9375rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-artist {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* request/boost colours are configured on the server, so they stay */
.guest-request-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.25rem;
  padding: 0 0.45rem;
  background: var(--badge-background);
  border: 1px solid var(--badge-border);
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--badge-color);
  flex-shrink: 0;
  margin-left: auto;
  max-width: 6rem;
  overflow: hidden;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .queue-item--expanded {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    min-height: auto;
  }

  .queue-item-actions {
    border-top: 1px solid var(--border);
    padding-top: 0.5rem;
    width: 100%;
    margin-left: 0;
  }

  .queue-item-actions .boost-btn {
    flex: 1;
  }
}
</style>

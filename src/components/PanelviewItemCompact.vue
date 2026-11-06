<template>
  <EditorialMediaCard
    fluid
    class="lib-card-compact"
    :class="{ 'lib-card-compact--round': item.media_type === MediaType.ARTIST }"
    :item="item"
    :is-available="isAvailable"
    :is-selected="isSelected"
    :show-checkboxes="showCheckboxes"
    :is-playing="isPlaying"
    :disable-play-button="disablePlayButton"
    :disabled="disabled"
    :parent-item="parentItem"
    :sort-by="sortBy"
    :show-provider-on-cover="showProviderOnCover"
    @select="(i, selected) => emit('select', i, selected)"
  />
</template>

<script setup lang="ts">
import EditorialMediaCard from "@/components/discover/EditorialMediaCard.vue";
import {
  ItemMapping,
  MediaType,
  type MediaItemType,
} from "@/plugins/api/interfaces";

export interface Props {
  item: MediaItemType | ItemMapping;
  size?: number;
  isSelected?: boolean;
  showCheckboxes?: boolean;
  permanentOverlay?: boolean;
  showProviderOnCover?: boolean;
  isAvailable?: boolean;
  isPlaying?: boolean;
  disablePlayButton?: boolean;
  parentItem?: MediaItemType;
  sortBy?: string;
  disabled?: boolean;
}
withDefaults(defineProps<Props>(), {
  size: 200,
  isSelected: false,
  showCheckboxes: false,
  permanentOverlay: false,
  showProviderOnCover: false,
  isAvailable: true,
  disablePlayButton: false,
  disabled: false,
  parentItem: undefined,
  sortBy: undefined,
});

const emit = defineEmits<{
  (e: "select", item: MediaItemType | ItemMapping, selected: boolean): void;
}>();
</script>

<style scoped>
/* the grid card, a size down: no padding of its own and smaller type */
.lib-card-compact.ed-card {
  --ed-card-pad: 0px;
}

.lib-card-compact--round.ed-card :deep(.ed-card__art) {
  border-radius: 50%;
}

.lib-card-compact.ed-card :deep(.ed-card__meta) {
  margin-top: 8px;
}

.lib-card-compact.ed-card :deep(.ed-card__title) {
  font-size: 12.5px;
  line-height: 16px;
}

.lib-card-compact.ed-card :deep(.ed-card__sub) {
  font-size: 11.5px;
  line-height: 15px;
}

.lib-card-compact.ed-card :deep(.ed-card__play) {
  width: 34px;
  height: 34px;
}
</style>

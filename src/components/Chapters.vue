<template>
  <section style="margin-bottom: 10px">
    <Toolbar
      :title="$t('chapters')"
      :menu-items="toolbarMenuItems"
      @title-clicked="toggleExpand"
    />
    <v-divider />
    <Container v-if="expanded">
      <!-- track-list rows: tabular position, name, duration -->
      <v-list class="chapter-list">
        <v-list-item
          v-for="chapter in itemDetails?.metadata?.chapters"
          :key="chapter.position"
          class="chapter-row"
          :disabled="!itemIsAvailable(itemDetails)"
          @click="chapterClicked(chapter)"
        >
          <template #prepend>
            <span class="chapter-position">{{ chapter.position }}</span>
          </template>
          <template #title>
            <div class="chapter-name">{{ chapter.name }}</div>
          </template>
          <template #append>
            <span v-if="chapter.end" class="chapter-duration"
              >{{ formatDuration(chapter.end - chapter.start) }}
            </span>
          </template>
        </v-list-item>
      </v-list>
    </Container>
  </section>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronUp } from "@lucide/vue";
import Container from "@/components/Container.vue";
import Toolbar from "@/components/Toolbar.vue";
import { formatDuration } from "@/helpers/utils";
import { api } from "@/plugins/api";
import { itemIsAvailable } from "@/plugins/api/helpers";
import { MediaItemChapter, type MediaItem } from "@/plugins/api/interfaces";
import { computed, ref } from "vue";

export interface Props {
  itemDetails: MediaItem;
}
const props = defineProps<Props>();

const expanded = ref(true);

const toggleExpand = function () {
  expanded.value = !expanded.value;
};

const toolbarMenuItems = computed(() => {
  return [
    // toggle expand
    {
      label: "tooltip.collapse_expand",
      icon: expanded.value ? ChevronUp : ChevronDown,
      action: toggleExpand,
      overflowAllowed: false,
    },
  ];
});

const chapterClicked = function (chapter: MediaItemChapter) {
  if (!props.itemDetails || !itemIsAvailable(props.itemDetails)) return;
  api.playMedia(props.itemDetails.uri, undefined, {
    start_item: chapter.position.toString(),
  });
};
</script>

<style scoped>
.chapter-list {
  padding: 4px 0;
  background: transparent;
}

.chapter-row {
  min-height: 48px;
  border-radius: 10px;
  transition: background-color 150ms ease;
}

.chapter-position {
  display: inline-block;
  width: 40px;
  font-size: 13px;
  font-weight: 500;
  color: var(--subtle-foreground);
  font-variant-numeric: tabular-nums;
}

.chapter-name {
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-duration {
  padding-left: 12px;
  font-size: 12.5px;
  color: var(--subtle-foreground);
  font-variant-numeric: tabular-nums;
}
</style>

<script setup lang="ts">
import type { LucideIcon } from "@lucide/vue";
import {
  BookAudio,
  Disc3,
  EllipsisVertical,
  GripVertical,
  ListMusic,
  Mic2,
  Music,
  Podcast,
  Radio,
  Tag,
} from "@lucide/vue";
import { computed, markRaw, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  getEventPosition,
  useHoldToOpenMenu,
} from "@/composables/useHoldToOpenMenu";
import { useListDragReorder } from "@/composables/useListDragReorder";
import {
  findPinnedUriForItem,
  reorderShortcutStandalone,
  useShortcuts,
  type ShortcutItem,
} from "@/composables/useShortcuts";
import { useSidebarScrollbarGutter } from "@/composables/useSidebarScrollbarGutter";
import { getImageThumbForItem } from "@/helpers/utils";
import { showContextMenuForMediaItem } from "@/layouts/default/ItemContextMenu.vue";
import { MediaType } from "@/plugins/api/interfaces";
import NavSectionHeader from "./NavSectionHeader.vue";
import { getMenuSectionConfig } from "./utils/getMenuItems";

const props = defineProps<{
  editMode?: boolean;
}>();

const RouterLinkComponent = markRaw(RouterLink);
const route = useRoute();
const { t } = useI18n();
const { isMobile, setOpenMobile, state } = useSidebar();
const isCollapsed = computed(() => state.value === "collapsed");

const { pinnedItems, isLoading, pinnedCount } = useShortcuts();

const sectionConfig = computed(() => getMenuSectionConfig("shortcuts"));
const sectionLabel = computed(
  () => sectionConfig.value.label || t("shortcuts"),
);

const isActive = (url: string) =>
  route.path === url || route.path.startsWith(url + "/");

const handleClick = () => {
  if (isMobile.value) setOpenMobile(false);
};

const MEDIA_TYPE_PATH: Partial<Record<MediaType, string>> = {
  [MediaType.PLAYLIST]: "playlists",
  [MediaType.ARTIST]: "artists",
  [MediaType.ALBUM]: "albums",
  [MediaType.TRACK]: "tracks",
  [MediaType.RADIO]: "radios",
  [MediaType.PODCAST]: "podcasts",
  [MediaType.AUDIOBOOK]: "audiobooks",
  [MediaType.GENRE]: "genres",
};

const MEDIA_TYPE_FALLBACK_ICON: Partial<Record<MediaType, LucideIcon>> = {
  [MediaType.PLAYLIST]: ListMusic,
  [MediaType.ARTIST]: Mic2,
  [MediaType.ALBUM]: Disc3,
  [MediaType.TRACK]: Music,
  [MediaType.RADIO]: Radio,
  [MediaType.PODCAST]: Podcast,
  [MediaType.AUDIOBOOK]: BookAudio,
  [MediaType.GENRE]: Tag,
};

const getItemUrl = (item: ShortcutItem) => {
  const base = MEDIA_TYPE_PATH[item.media_type] ?? "playlists";
  const provider = encodeURIComponent(item.provider);
  const itemId = encodeURIComponent(item.item_id);
  return `/${base}/${provider}/${itemId}`;
};

const getFallbackIcon = (item: ShortcutItem): LucideIcon =>
  MEDIA_TYPE_FALLBACK_ICON[item.media_type] ?? Music;

// artists are people, so their pictures are round, as everywhere else
const isArtist = (item: ShortcutItem) => item.media_type === MediaType.ARTIST;

const getDisplayName = (item: ShortcutItem): string =>
  item.media_type === MediaType.GENRE && item.name
    ? item.name.charAt(0).toUpperCase() + item.name.slice(1)
    : item.name;

const thumbMap = computed(() =>
  Object.fromEntries(
    pinnedItems.value.map((item) => [
      item.uri,
      getImageThumbForItem(item, undefined, 64),
    ]),
  ),
);

const pinnedItemsWithUrls = computed(() =>
  pinnedItems.value.map((item) => ({ item, url: getItemUrl(item) })),
);

const openContextMenu = async (event: Event, item: ShortcutItem) => {
  const pos = getEventPosition(event);
  await showContextMenuForMediaItem(
    item,
    undefined,
    pos.x,
    pos.y,
    true,
    true,
    undefined,
    { shortcutContext: true },
  );
};

const holdToOpenMenu = useHoldToOpenMenu(openContextMenu);

// Long-press context menu conflicts with touch dragging, so gate it off
// while editing.
const onHold = (e: Event, item: ShortcutItem) => {
  if (!props.editMode) holdToOpenMenu.onHold(e, item);
};
const onTouchStart = () => {
  if (!props.editMode) holdToOpenMenu.onTouchStart();
};
const swallowClickAfterHold = holdToOpenMenu.swallowClickAfterHold;

const { navEl } = useSidebarScrollbarGutter(pinnedItems);

// ---- edit mode: drag-to-reorder --------------------------------------------

const listEl = ref<HTMLElement | null>(null);

const {
  startItemDrag,
  draggingIndex,
  isDragging,
  ghostY,
  dragRowHeight,
  rowOffset,
} = useListDragReorder({
  listEl,
  count: () => pinnedItems.value.length,
  onCommit: (from, to) => {
    const source = pinnedItems.value[from];
    const target = pinnedItems.value[to];
    if (!source || !target) return;
    const sourceUri = findPinnedUriForItem(source);
    const targetUri = findPinnedUriForItem(target);
    if (!sourceUri || !targetUri) return;
    reorderShortcutStandalone(sourceUri, targetUri);
  },
});

const draggedItem = computed(() =>
  draggingIndex.value != null ? pinnedItems.value[draggingIndex.value] : null,
);
</script>

<template>
  <div ref="navEl"></div>
  <template v-if="pinnedItems.length > 0 || isLoading">
    <SidebarGroup :class="{ 'shortcuts-group-collapsed': isCollapsed }">
      <NavSectionHeader
        section-id="shortcuts"
        :label="sectionLabel"
        :default-label="t('shortcuts')"
        :label-hidden="sectionConfig.hide_label"
        :edit-mode="editMode"
      />
      <SidebarGroupContent class="flex flex-col gap-0.5">
        <div ref="listEl" class="relative">
          <SidebarMenu class="gap-0.5">
            <!-- Skeletons while the API calls are in flight -->
            <template v-if="isLoading">
              <SidebarMenuItem v-for="i in pinnedCount" :key="`skeleton-${i}`">
                <SidebarMenuSkeleton
                  :show-icon="true"
                  class="ml-2 h-10 gap-[7px] px-[5px]"
                />
              </SidebarMenuItem>
            </template>
            <!-- Pinned shortcuts. The row gutter would skew the centred icon
                 rail, so it lifts when collapsed. -->
            <SidebarMenuItem
              v-for="({ item, url }, index) in pinnedItemsWithUrls"
              :key="item.uri"
              v-hold="(e: Event) => onHold(e, item)"
              class="mr-1.5 group-data-[collapsible=icon]:mr-0"
              :class="{
                'shortcut-item': editMode,
                'shortcut-item-dragging': draggingIndex === index,
              }"
              :data-drag-index="editMode ? index : undefined"
              :style="
                editMode
                  ? {
                      transform: `translateY(${rowOffset(index)}px)`,
                      transition:
                        isDragging && draggingIndex !== index
                          ? 'transform 200ms ease-out'
                          : 'none',
                    }
                  : undefined
              "
              @click.capture="swallowClickAfterHold"
              @touchstart.passive="onTouchStart"
            >
              <button
                v-if="editMode && !isCollapsed"
                class="shortcut-drag-handle"
                :aria-label="t('queue_reorder')"
                @pointerdown.stop.prevent="startItemDrag($event, index)"
                @click.stop
              >
                <GripVertical class="size-4" />
              </button>
              <SidebarMenuButton
                :as="editMode ? 'div' : RouterLinkComponent"
                v-bind="editMode ? {} : { to: url }"
                :is-active="!editMode && isActive(url)"
                :tooltip="getDisplayName(item)"
                :class="[
                  'nav-row no-underline',
                  isCollapsed ? 'shortcut-button-collapsed' : 'shortcut-button',
                  editMode ? 'shortcut-button-editing' : '',
                ]"
                @click="!editMode && handleClick()"
                @contextmenu.prevent="openContextMenu($event, item)"
              >
                <img
                  v-if="thumbMap[item.uri]"
                  :src="thumbMap[item.uri]"
                  :class="[
                    'shortcut-thumb',
                    isCollapsed ? 'shortcut-thumb--collapsed' : '',
                    { 'shortcut-thumb--round': isArtist(item) },
                  ]"
                  :alt="getDisplayName(item)"
                />
                <component
                  :is="getFallbackIcon(item)"
                  v-else
                  :stroke-width="1.75"
                  :class="[
                    'shortcut-thumb shortcut-thumb--icon',
                    isCollapsed ? 'shortcut-thumb--collapsed' : '',
                    { 'shortcut-thumb--round': isArtist(item) },
                  ]"
                />
                <span v-if="!isCollapsed" class="shortcut-label">
                  <span class="shortcut-name">{{ getDisplayName(item) }}</span>
                  <span class="shortcut-type">{{ t(item.media_type) }}</span>
                </span>
              </SidebarMenuButton>
              <Button
                v-if="!isCollapsed"
                variant="ghost"
                size="icon"
                class="shortcut-action-btn absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                :class="
                  editMode
                    ? 'opacity-70'
                    : 'opacity-0 group-hover/menu-item:opacity-100'
                "
                :title="t('more_options')"
                @click.stop="openContextMenu($event, item)"
              >
                <EllipsisVertical class="h-4 w-4" />
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
          <!-- Floating ghost that follows the pointer while dragging -->
          <div
            v-if="isDragging && draggedItem"
            class="shortcut-ghost bg-popover text-popover-foreground"
            :style="{ top: `${ghostY}px`, height: `${dragRowHeight}px` }"
          >
            <GripVertical class="size-4 opacity-60 shrink-0" />
            <img
              v-if="thumbMap[draggedItem.uri]"
              :src="thumbMap[draggedItem.uri]"
              class="shortcut-thumb"
              :class="{ 'shortcut-thumb--round': isArtist(draggedItem) }"
              :alt="getDisplayName(draggedItem)"
            />
            <component
              :is="getFallbackIcon(draggedItem)"
              v-else
              :stroke-width="1.75"
              class="shortcut-thumb shortcut-thumb--icon"
              :class="{ 'shortcut-thumb--round': isArtist(draggedItem) }"
            />
            <span class="shortcut-label">
              <span class="shortcut-name">{{
                getDisplayName(draggedItem)
              }}</span>
              <span class="shortcut-type">{{ t(draggedItem.media_type) }}</span>
            </span>
          </div>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  </template>
</template>

<style scoped>
:deep(.shortcuts-group-collapsed[data-sidebar="group"]) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  align-items: start !important;
}

/* only the browser's own link colours are overruled here, so the row colours
   the sidebar sets on these links still apply, visited or not */
:deep(a),
:deep(a:visited) {
  text-decoration: none;
  color: inherit;
}

/* The row keeps the nav links' look (AppSidebar's .nav-row) and rhythm, a
   little taller for its second line. The thumbnail centres on the nav icons'
   axis and the name starts where their labels do; the right padding leaves
   room for the more button. */
:deep([data-sidebar="menu-button"].shortcut-button) {
  /* explicit height (not auto) so transition-[height] can animate */
  height: 2.5rem !important;
  padding: 0 2rem 0 0.3125rem !important;
  gap: 0.4375rem !important;
  align-items: center !important;
}

/* Make room for the drag handle on the left while editing */
:deep([data-sidebar="menu-button"].shortcut-button-editing) {
  margin-left: 1.5rem !important;
  cursor: default;
}

/* padding 0.125rem makes content area exactly 1.75rem = icon width → centered */
:deep([data-sidebar="menu-button"].shortcut-button-collapsed) {
  padding: 0.125rem !important;
  align-items: center !important;
}

/* cover art is shown whole and square with only a slight rounding, and the
   rail keeps the very same 28px tile, so nothing jumps as it collapses */
.shortcut-thumb {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.shortcut-thumb--collapsed {
  margin: 0;
}

.shortcut-thumb--round {
  border-radius: 50%;
}

/* with no picture to show, the item's type icon sits on a quiet tile of the
   same size, so the names still line up */
.shortcut-thumb--icon {
  padding: 0.3125rem;
  background-color: var(--sidebar-accent);
}

/* The fallback icon renders as a direct-child <svg>, which the menu button's
   own `[&>svg]:size-4` utility (meant for nav icons) shrinks. `!important` plus
   the extra class is what out-ranks that utility. */
:deep([data-sidebar="menu-button"] > svg.shortcut-thumb) {
  width: 1.75rem !important;
  height: 1.75rem !important;
  margin: 0 !important;
}

/* the loading placeholders take the shape of the tile they stand in for */
:deep([data-sidebar="menu-skeleton-icon"]) {
  width: 1.75rem !important;
  height: 1.75rem !important;
  border-radius: 4px !important;
}

.shortcut-label {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.shortcut-name {
  font-size: 0.8125rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* the type is metadata, so it recedes behind the name */
.shortcut-type {
  font-size: 0.71875rem;
  font-weight: 400;
  line-height: 1.25;
  color: var(--subtle-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* mdi-dots-vertical v-btn — ensure it appears above the RouterLink */
:deep(.shortcut-action-btn) {
  z-index: 1;
}

/* Clip the absolute-positioned action btn without forcing overflow-y to auto.
   `overflow-x: hidden` would silently flip overflow-y to auto and create a
   spurious vertical scrollbar inside the sidebar; `clip` is the only value
   that does not trigger that side-effect. */
:deep([data-sidebar="group-content"]) {
  overflow-x: clip;
}

/* ---- edit mode ---- */

.shortcut-item {
  user-select: none;
}

.shortcut-item-dragging {
  opacity: 0.35;
}

.shortcut-drag-handle {
  position: absolute;
  left: 0.25rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.125rem;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: grab;
  touch-action: none;
}

.shortcut-drag-handle:active {
  cursor: grabbing;
}

.shortcut-ghost {
  position: absolute;
  left: 0.25rem;
  right: 0.375rem;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0 0.5rem;
  border-radius: 9px;
  /* lifted off the rows it is dragged across */
  box-shadow:
    0 0 0 1px var(--sidebar-border),
    0 10px 24px -10px rgba(0, 0, 0, 0.45);
  opacity: 0.97;
  pointer-events: none;
  cursor: grabbing;
}
</style>

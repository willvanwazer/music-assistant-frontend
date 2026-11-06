<script setup lang="ts">
import { computed, markRaw, ref, type Component } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute, useRouter } from "vue-router";

const RouterLinkComponent = markRaw(RouterLink);

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useListDragReorder } from "@/composables/useListDragReorder";
import { Eye, EyeOff, GripVertical } from "@lucide/vue";
import NavSectionHeader from "./NavSectionHeader.vue";
import {
  setMenuItemHidden,
  setMenuItemsOrder,
  type MenuSectionId,
} from "./utils/getMenuItems";

interface NavItem {
  id?: string;
  title: string;
  url: string;
  icon?: Component;
  disabled?: boolean;
  hidden?: boolean;
  openInNewTab?: boolean;
  action?: () => void;
  shortcut?: string;
}

const props = defineProps<{
  items: NavItem[];
  label?: string;
  // Translated default section label (to detect when a rename is a no-op).
  defaultLabel?: string;
  labelHidden?: boolean;
  sectionId?: MenuSectionId;
  editMode?: boolean;
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { isMobile, setOpenMobile } = useSidebar();

const isActive = (url: string) =>
  !!url && (route.path === url || route.path.startsWith(url + "/"));

const itemActive = (item: NavItem) => !item.action && isActive(item.url);

const handleClick = (item: NavItem, event: Event) => {
  if (item.action) {
    event.preventDefault();
    item.action();
  }
  if (item.openInNewTab) {
    event.preventDefault();
    const resolved = router.resolve(item.url).href;
    const fullUrl = new URL(resolved, window.location.href).href;
    window.open(fullUrl, "_blank");
  }
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

// ---- edit mode: hide/show items --------------------------------------------

const toggleItemHidden = (item: NavItem) => {
  if (!item.id) return;
  setMenuItemHidden(item.id, !item.hidden);
};

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
  count: () => props.items.length,
  onCommit: (from, to) => {
    const ids = props.items
      .map((item) => item.id)
      .filter((id): id is string => !!id);
    if (ids.length !== props.items.length) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    setMenuItemsOrder(ids);
  },
});

const draggedItem = computed(() =>
  draggingIndex.value != null ? props.items[draggingIndex.value] : null,
);
</script>

<template>
  <SidebarGroup v-if="items.length > 0">
    <!-- Section header: inline rename + label visibility toggle in edit mode -->
    <NavSectionHeader
      v-if="sectionId"
      :section-id="sectionId"
      :label="label ?? ''"
      :default-label="defaultLabel ?? label ?? ''"
      :label-hidden="labelHidden"
      :edit-mode="editMode"
    />
    <SidebarGroupLabel v-else-if="label">{{ label }}</SidebarGroupLabel>

    <SidebarGroupContent class="flex flex-col gap-0.5">
      <!-- Edit mode: static rows with drag handle + visibility toggle -->
      <div v-if="editMode" ref="listEl" class="relative">
        <SidebarMenu>
          <SidebarMenuItem
            v-for="(item, index) in items"
            :key="item.id ?? item.title"
            :data-drag-index="index"
            class="mr-1.5 nav-edit-row"
            :class="{ 'nav-edit-row-dragging': draggingIndex === index }"
            :style="{
              transform: `translateY(${rowOffset(index)}px)`,
              transition:
                isDragging && draggingIndex !== index
                  ? 'transform 200ms ease-out'
                  : 'none',
            }"
          >
            <div
              class="nav-edit-row-inner"
              :class="{ 'nav-edit-row-off': item.hidden }"
            >
              <button
                class="nav-edit-drag-handle"
                :aria-label="t('queue_reorder')"
                @pointerdown.stop.prevent="startItemDrag($event, index)"
                @click.stop
              >
                <GripVertical class="size-4" />
              </button>
              <component
                :is="item.icon"
                v-if="item.icon"
                class="nav-edit-row-icon"
              />
              <span class="nav-edit-row-title">{{ item.title }}</span>
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 shrink-0"
                :title="t(item.hidden ? 'menu_item_show' : 'menu_item_hide')"
                @click.stop="toggleItemHidden(item)"
              >
                <Eye v-if="!item.hidden" class="size-4" />
                <EyeOff v-else class="size-4" />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <!-- Floating ghost that follows the pointer while dragging -->
        <div
          v-if="isDragging && draggedItem"
          class="nav-edit-ghost bg-popover text-popover-foreground"
          :style="{ top: `${ghostY}px`, height: `${dragRowHeight}px` }"
        >
          <GripVertical class="size-4 opacity-60" />
          <component
            :is="draggedItem.icon"
            v-if="draggedItem.icon"
            class="nav-edit-row-icon"
          />
          <span class="nav-edit-row-title">{{ draggedItem.title }}</span>
        </div>
      </div>

      <!-- Normal mode: navigation links -->
      <SidebarMenu v-else class="gap-0.5">
        <!-- the row gutter would skew the centred icon rail, so it lifts when
             collapsed -->
        <SidebarMenuItem
          v-for="item in items"
          :key="item.title"
          class="mr-1.5 group-data-[collapsible=icon]:mr-0"
        >
          <!-- the row's look (height, fill, colours, icon size) lives with
               the rest of the sidebar shell in AppSidebar -->
          <SidebarMenuButton
            :as="
              item.disabled || item.openInNewTab || item.action
                ? 'button'
                : RouterLinkComponent
            "
            v-bind="
              item.disabled || item.openInNewTab || item.action
                ? {}
                : { to: item.url }
            "
            :is-active="itemActive(item)"
            :tooltip="item.title"
            :disabled="item.disabled"
            :class="[
              'nav-row nav-link no-underline',
              item.disabled ? 'opacity-50 cursor-not-allowed' : '',
            ]"
            @click="(e: Event) => handleClick(item, e)"
          >
            <component
              :is="item.icon"
              v-if="item.icon"
              :stroke-width="itemActive(item) ? 2 : 1.75"
            />
            <span class="min-w-0 truncate">{{ item.title }}</span>
            <!-- a small bordered key cap, quieter than the row it sits in -->
            <Kbd
              v-if="item.shortcut"
              class="ml-auto h-[18px] shrink-0 rounded-[5px] border border-sidebar-foreground/15 bg-transparent px-1.5 text-[10.5px] font-semibold text-subtle-foreground group-data-[collapsible=icon]:hidden"
            >
              {{ item.shortcut }}
            </Kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>

<style scoped>
/* only the browser's own link colours are overruled here, so the row colours
   the sidebar sets on these links still apply, visited or not */
:deep(a),
:deep(a:hover),
:deep(a:visited) {
  text-decoration: none;
  color: inherit;
}

:deep([data-sidebar="menu-item"]) {
  display: flex !important;
  flex-direction: column !important;
}

/* ---- edit mode ---- */

.nav-edit-row {
  position: relative;
  user-select: none;
}

.nav-edit-row-dragging {
  opacity: 0.35;
}

/* the same rhythm and type as the links it stands in for */
.nav-edit-row-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2rem;
  margin-left: 0.5rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.84375rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.nav-edit-row-off {
  opacity: 0.4;
}

.nav-edit-drag-handle {
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

.nav-edit-drag-handle:active {
  cursor: grabbing;
}

.nav-edit-row-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.nav-edit-row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-edit-ghost {
  position: absolute;
  left: 0.25rem;
  right: 0.375rem;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.84375rem;
  font-weight: 500;
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

<template>
  <v-toolbar :color="color" class="header">
    <template v-if="showBack || icon" #prepend>
      <!-- below a section's own page the leading slot steps back up, where it
           would otherwise only show the section's icon -->
      <Button
        v-if="showBack"
        variant="ghost"
        size="icon"
        :title="$t('back')"
        :aria-label="$t('back')"
        @click="router.back()"
      >
        <ArrowLeft class="size-5" />
      </Button>
      <v-btn
        v-else
        :icon="typeof icon === 'string' ? icon : undefined"
        size="small"
        :disabled="iconAction == null"
        style="opacity: 0.8"
        @click="iconAction?.()"
      >
        <component :is="icon" v-if="typeof icon !== 'string'" class="w-6 h-6" />
      </v-btn>
    </template>

    <template #title>
      <div :class="['toolbar-title', { 'toolbar-title-wrapper': subtitle }]">
        <slot name="title">
          <button
            v-if="title || (store.mobileLayout && isDiscoverPage)"
            @click="emit('titleClicked')"
          >
            {{ title || (isDiscoverPage ? $t("discover") : "") }}
          </button>
        </slot>
        <span v-if="subtitle" class="toolbar-subtitle">{{ subtitle }}</span>
      </div>
    </template>

    <template v-if="$slots.append || menuItems?.length" #append>
      <slot name="append"></slot>
      <Button
        v-for="menuItem of directItems"
        :key="menuItem.label"
        variant="ghost"
        size="icon-lg"
        :title="menuItemLabel(menuItem)"
        :disabled="menuItem.disabled == true"
        @click="(e: MouseEvent) => onMenuItemClick(e, menuItem)"
      >
        <span class="relative inline-flex">
          <MenuItemIcon :icon="menuItem.icon" :size="22" />
          <span v-if="menuItem.active" :class="ACTIVE_DOT_CLASS"></span>
        </span>
      </Button>

      <!-- overflow menu with (remaining) items if on mobile -->
      <DropdownMenu v-if="overflowItems.length" v-model:open="overflowMenuOpen">
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-lg" :title="$t('menu')">
            <span class="relative inline-flex">
              <EllipsisVertical class="size-[22px]" />
              <span v-if="menuActive" :class="ACTIVE_DOT_CLASS"></span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-56">
          <template v-for="(menuItem, index) in overflowItems" :key="index">
            <DropdownMenuSub v-if="menuItem.subItems?.length">
              <DropdownMenuSubTrigger
                class="gap-3"
                :disabled="menuItem.disabled == true"
              >
                <span class="relative inline-flex">
                  <MenuItemIcon :icon="menuItem.icon" />
                  <span v-if="menuItem.active" :class="ACTIVE_DOT_CLASS"></span>
                </span>
                <span class="min-w-0 flex-1 truncate">{{
                  menuItemLabel(menuItem)
                }}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                align="start"
                :align-offset="-5"
                :side-offset="6"
                class="max-h-[70vh] overflow-y-auto"
              >
                <DropdownMenuItem
                  v-for="subItem of menuItem.subItems.filter((x) => !x.hide)"
                  :key="subItem.label"
                  :disabled="subItem.disabled === true"
                  class="gap-3"
                  @select="(e: Event) => onSubItemSelect(e, menuItem, subItem)"
                >
                  <MenuItemIcon :icon="subItem.icon" />
                  <span class="min-w-0 flex-1 truncate">{{
                    menuItemLabel(subItem)
                  }}</span>
                  <Check v-if="subItem.selected" class="ml-auto size-4" />
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              v-else
              :disabled="menuItem.disabled == true"
              class="gap-3"
              @select="(e: Event) => e.preventDefault()"
              @click="(e: MouseEvent) => onMenuItemClick(e, menuItem)"
            >
              <span class="relative inline-flex">
                <MenuItemIcon :icon="menuItem.icon" />
                <span v-if="menuItem.active" :class="ACTIVE_DOT_CLASS"></span>
              </span>
              <span class="min-w-0 flex-1 truncate">{{
                menuItemLabel(menuItem)
              }}</span>
            </DropdownMenuItem>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </v-toolbar>
</template>

<script setup lang="ts">
import MenuItemIcon from "@/components/MenuItemIcon.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  menuItemLabel,
  type ContextMenuItem,
} from "@/helpers/context_menu_item";
import { canGoBack } from "@/helpers/navigation";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { ArrowLeft, Check, EllipsisVertical } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import { getBreakpointValue } from "../plugins/breakpoint";

import type { Component } from "vue";
import { computed, ref } from "vue";

interface Props {
  color?: string;
  icon?: string | Component;
  title?: string;
  subtitle?: string;
  menuItems?: ToolBarMenuItem[];
  enforceOverflowMenu?: boolean;
  menuActive?: boolean;
  isDiscoverPage?: boolean;
  iconAction?: () => void;
}
const props = withDefaults(defineProps<Props>(), {
  color: "transparent",
  icon: undefined,
  title: undefined,
  subtitle: undefined,
  count: undefined,
  menuItems: undefined,
  enforceOverflowMenu: false,
  menuActive: false,
  iconAction: undefined,
});

const ACTIVE_DOT_CLASS =
  "bg-primary absolute -top-0.5 -right-0.5 size-1.5 rounded-full";

const route = useRoute();
const router = useRouter();

// A page below one of the main sections - a settings page, a folder inside
// Browse - offers a way back whenever the app has somewhere to go back to.
// Only a page's own toolbar qualifies: it leads with the section's icon and no
// action of its own. A details header brings its own back button, and the
// toolbars heading sections further down a page carry no icon at all.
const showBack = computed(() => {
  // the route is read first, so this re-evaluates on every navigation, by when
  // the history state checked below has moved on as well
  const browseFolder = route.query.path;
  const nested =
    route.path.split("/").filter(Boolean).length > 1 ||
    (typeof browseFolder === "string" &&
      browseFolder !== "" &&
      browseFolder !== "root");
  return (
    nested && !!props.icon && props.iconAction == null && canGoBack(router)
  );
});

const overflowMenuOpen = ref(false);

const directItems = computed(
  () =>
    props.menuItems?.filter(
      (x) =>
        !x.hide &&
        (x.overflowAllowed === false ||
          (!props.enforceOverflowMenu && getBreakpointValue("bp8"))),
    ) ?? [],
);

const overflowItems = computed(() =>
  !getBreakpointValue("bp8") || props.enforceOverflowMenu
    ? (props.menuItems?.filter(
        (x) => x.hide != true && x.overflowAllowed !== false,
      ) ?? [])
    : [],
);

const onSubItemSelect = (
  event: Event,
  parent: ToolBarMenuItem,
  subItem: ContextMenuItem,
) => {
  if (
    parent.closeOnContentClick === false ||
    subItem.close_on_click === false
  ) {
    event.preventDefault();
  }
  subItem.action?.();
};

const onMenuItemClick = (
  event: MouseEvent | KeyboardEvent,
  menuItem: ToolBarMenuItem,
) => {
  event.preventDefault();
  if (menuItem.subItems?.length) {
    // Open submenu via global context menu
    // Map closeOnContentClick to close_on_click on subItems if needed
    const items =
      menuItem.closeOnContentClick === false
        ? menuItem.subItems.map((item) => ({
            ...item,
            close_on_click: item.close_on_click ?? false,
          }))
        : menuItem.subItems;
    const posX = "clientX" in event ? event.clientX : 0;
    const posY = "clientY" in event ? event.clientY : 0;
    eventbus.emit("contextmenu", {
      items,
      posX,
      posY,
    });
  } else if (menuItem.action) {
    // Close overflow menu before executing action
    overflowMenuOpen.value = false;
    // Execute direct action
    menuItem.action();
  }
};

// emitters
const emit = defineEmits<{
  (e: "iconClicked"): void;
  (e: "titleClicked"): void;
}>();
</script>

<script lang="ts">
export interface ToolBarMenuItem extends ContextMenuItem {
  active?: boolean;
  subItems?: ContextMenuItem[];
  overflowAllowed?: boolean;
  closeOnContentClick?: boolean;
}
</script>

<style scoped>
.header.v-toolbar {
  height: 55px;
}

.header.v-toolbar :deep(.v-toolbar__content) {
  height: 55px !important;
  min-height: 55px !important;
  padding-top: 0;
  padding-bottom: 0;
  align-items: center;
  /* anchors the centred slot */
  position: relative;
}

.header.v-toolbar :deep(.v-toolbar-title) {
  margin-inline-start: 10px !important;
}

.header.v-toolbar :deep(.v-toolbar__prepend) {
  margin-inline-start: 12px !important;
  margin-inline-end: 0px !important;
}

.header.v-toolbar > .v-toolbar__content > .v-toolbar__append {
  margin-inline-end: 5px;
}

.header.v-toolbar-default > .v-toolbar__content > .v-toolbar__append {
  margin-inline-end: 10px;
}

/* Mobile branding on the left */
.toolbar-prepend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* the title names the page, or the section below it, in the display serif;
   everything around it (subtitle, trail, controls) stays in Inter. It never
   drops below the title size its host gives the toolbar, so a page that sets
   its section headings larger keeps them that way. */
.toolbar-title {
  font-family: var(--font-heading);
  font-size: max(1em, 1.375rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  font-optical-sizing: auto;
}

/* the default title is a button so it can be clicked, which must not fall back
   to the browser's own button face */
.toolbar-title button {
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
}

.toolbar-title-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1px;
  line-height: 1.2;
}

.toolbar-subtitle {
  font-family: var(--font-body);
  font-size: 0.71875rem;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.3;
  color: var(--muted-foreground);
}

@media (max-width: 600px) {
  .toolbar-title {
    font-size: max(1em, 1.25rem);
  }
}
</style>

<script setup lang="ts">
import NavMain from "@/components/navigation/NavMain.vue";
import NavShortcuts from "@/components/navigation/NavShortcuts.vue";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  commandCenterHotkeyLabel,
  useCommandCenter,
} from "@/composables/useCommandCenter";
import { eventbus } from "@/plugins/eventbus";
import { haState } from "@/plugins/homeassistant";
import { store } from "@/plugins/store";
import { Check } from "@lucide/vue";
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavHomeAssistant from "./NavHomeAssistant.vue";
import NavMobile from "./NavMobile.vue";
import {
  getMenuItems,
  resolveMenuConfig,
  type MenuGroup,
} from "./utils/getMenuItems";

const router = useRouter();
const { t } = useI18n();
const { toggleSidebar, setOpen, state, isMobile } = useSidebar();
const { open: openCommandCenter } = useCommandCenter();

const editMode = computed(() => store.navMenuEditMode);

const navItems = computed(() =>
  getMenuItems()
    // Edit mode lists every (available) item so hidden ones can be re-enabled.
    .filter((item) => editMode.value || !item.hidden)
    .map((item) => ({
      id: item.id,
      title: t(item.label),
      url: item.path,
      icon: item.icon,
      disabled: editMode.value ? undefined : item.disabled,
      hidden: item.hidden,
      group: item.group,
      action:
        item.action === "command-center"
          ? () => openCommandCenter()
          : undefined,
      shortcut:
        item.action === "command-center" && !isMobile.value
          ? commandCenterHotkeyLabel
          : undefined,
    })),
);

const discoverItems = computed(() =>
  navItems.value.filter((item) => item.group === "explore"),
);
const libraryItems = computed(() =>
  navItems.value.filter((item) => item.group === "library"),
);
const pluginItems = computed(() =>
  navItems.value.filter((item) => item.group === "plugins"),
);
const systemItems = computed(() =>
  navItems.value.filter((item) => item.group === "system"),
);

const DEFAULT_SECTION_LABELS: Record<MenuGroup, string> = {
  explore: "explore",
  library: "library",
  plugins: "plugins",
  system: "system",
};

const sections = computed(() => {
  const sectionConfigs = resolveMenuConfig().sections;
  const resolved = {} as Record<
    MenuGroup,
    { label: string; defaultLabel: string; labelHidden: boolean }
  >;
  for (const [group, labelKey] of Object.entries(DEFAULT_SECTION_LABELS)) {
    const cfg = sectionConfigs[group as MenuGroup] ?? {};
    const defaultLabel = t(labelKey);
    resolved[group as MenuGroup] = {
      label: cfg.label || defaultLabel,
      defaultLabel,
      labelHidden: !!cfg.hide_label,
    };
  }
  return resolved;
});

const collapsed = computed(() => state.value === "collapsed");

// Editing needs the full (labeled) menu, so pop the sidebar open when edit
// mode is entered from anywhere (profile menu, settings page shortcut), and
// treat collapsing to icon mode as leaving edit mode.
watch(editMode, (editing) => {
  if (editing && !isMobile.value) setOpen(true);
});
watch(collapsed, (isCollapsed) => {
  if (isCollapsed && store.navMenuEditMode) store.navMenuEditMode = false;
});

const handleOpenSidebar = () => {
  if (isMobile.value) {
    toggleSidebar();
  }
};

onMounted(() => {
  eventbus.on("mobile-sidebar-open", handleOpenSidebar);
});

onUnmounted(() => {
  eventbus.off("mobile-sidebar-open", handleOpenSidebar);
  store.navMenuEditMode = false;
});
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <div class="sidebar-header-row">
          <!-- collapsed, the 26px logo centres on a margin anchored off the
               rail's final width (less the header's 1rem side padding), so it
               holds still while the width animates; expanded, it centres on
               the same axis as the nav icons below it -->
          <div
            class="sidebar-header"
            :style="
              collapsed
                ? {
                    marginLeft:
                      'calc((var(--sidebar-width-icon) - 1rem - 26px) / 2)',
                  }
                : { marginLeft: '6px' }
            "
            @click="router.push('/')"
          >
            <img
              src="@/assets/icon.svg"
              alt="Music Assistant"
              class="sidebar-header-logo"
            />
            <div v-if="!collapsed" class="sidebar-header-title">
              Music <span class="sidebar-header-title-dim">Assistant</span>
            </div>
          </div>
        </div>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <NavMain
        :items="discoverItems"
        :label="sections.explore.label"
        :default-label="sections.explore.defaultLabel"
        :label-hidden="sections.explore.labelHidden"
        section-id="explore"
        :edit-mode="editMode"
        class="mt-1"
      />
      <NavMain
        :items="libraryItems"
        :label="sections.library.label"
        :default-label="sections.library.defaultLabel"
        :label-hidden="sections.library.labelHidden"
        section-id="library"
        :edit-mode="editMode"
      />
      <NavMain
        :items="pluginItems"
        :label="sections.plugins.label"
        :default-label="sections.plugins.defaultLabel"
        :label-hidden="sections.plugins.labelHidden"
        section-id="plugins"
        :edit-mode="editMode"
      />
      <NavMain
        :items="systemItems"
        :label="sections.system.label"
        :default-label="sections.system.defaultLabel"
        :label-hidden="sections.system.labelHidden"
        section-id="system"
        :edit-mode="editMode"
      />
      <NavShortcuts :edit-mode="editMode" />
    </SidebarContent>
    <!-- a hairline sets the account and the collapse control apart from the
         menu that scrolls above them -->
    <SidebarFooter class="border-t border-sidebar-border">
      <Button
        v-if="editMode"
        class="menu-edit-done"
        @click="store.navMenuEditMode = false"
      >
        <Check class="size-4" />
        {{ t("menu_edit_disable") }}
      </Button>
      <!-- Kiosk mode leaves no Home Assistant chrome on screen, so this is the
           only way back to it. -->
      <NavHomeAssistant v-if="haState.kioskModeEnabled" />
      <NavMobile v-if="isMobile" />
      <SidebarTrigger v-else />
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped>
.sidebar-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

/* the house mark in a single ink rather than the brand cyan, as on the sign-in
   screen: the chrome stays neutral and colour comes from the artwork. The bars
   are drawn in white over the house, so a greyscale curve keeps them where a
   mask would fill them in. */
.sidebar-header-logo {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  filter: grayscale(1) brightness(0.645) contrast(3.78);
}

/* a plain ancestor selector: :global(.dark) followed by more would compile to
   a bare .dark rule and filter the whole page */
.dark .sidebar-header-logo {
  filter: grayscale(1) invert(1) brightness(2.5) contrast(0.93);
}

/* the wordmark stays quiet: it signs the app, the page title names the place */
.sidebar-header-title {
  margin-left: 10px;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease;
}

.sidebar-header-title-dim {
  font-weight: 500;
  opacity: 0.55;
}

.sidebar-header {
  display: flex;
  align-items: center;
  margin: 8px 15px 10px 0;
  transition: opacity 0.3s ease;
  position: relative;
  cursor: pointer;
}

.menu-edit-done {
  width: 100%;
  border-radius: 999px;
}

/* the sidebar sits on its own surface, set off from the page by a hairline
   drawn inside its edge so the rail keeps its full width */
:deep([data-sidebar="sidebar"]) {
  box-shadow: inset -1px 0 0 var(--sidebar-border);
}

:deep([data-sidebar="group"]) {
  padding-left: 0 !important;
  padding-right: 0.5rem !important;
  padding-top: 0.125rem !important;
  padding-bottom: 0.125rem !important;
}

/* section headers are eyebrow labels. The text sits at the foot of its box, so
   the room opens up above a section rather than between the label and its
   rows, and it starts on the same line as the row icons below it */
:deep([data-sidebar="group-label"]) {
  height: 1.75rem !important;
  align-items: flex-end !important;
  padding-left: 1.125rem !important;
  padding-bottom: 0.3125rem !important;
  font-size: 0.6875rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase;
  color: var(--subtle-foreground) !important;
}

:deep([data-sidebar="menu-button"]) {
  margin-left: 0.5rem !important;
  margin-right: 0.5rem !important;
}

/* collapsed to the icon rail, the buttons (2rem wide) centre on a margin
   anchored off the rail's final width — which --sidebar-width-icon always
   holds, the scrollbar gutter's widening included — rather than the animating
   one, so they hold still through the collapse animation */
[data-collapsible="icon"] :deep([data-sidebar="menu-button"]) {
  margin-left: calc((var(--sidebar-width-icon) - 2rem) / 2) !important;
  margin-right: 0 !important;
}

/* ---- menu rows (NavMain links and pinned shortcuts) ---- */

/* a row reads quietly in the muted foreground and comes up to the full
   foreground under the pointer. The page you are on sits on the sidebar's
   accent fill with its icon picked out in the accent colour. */
:deep(.nav-row) {
  border-radius: 9px !important;
  font-weight: 500;
  color: var(--muted-foreground) !important;
  transition-property:
    width, height, padding, background-color, color !important;
}

:deep(.nav-row:hover) {
  background-color: color-mix(
    in oklab,
    var(--sidebar-foreground) 5%,
    transparent
  ) !important;
  color: var(--sidebar-foreground) !important;
}

:deep(.nav-row[data-active="true"]) {
  background-color: var(--sidebar-accent) !important;
  color: var(--sidebar-foreground) !important;
}

:deep(.nav-row[data-active="true"] > svg) {
  color: var(--sidebar-primary);
}

/* a main menu link: 34px tall around an 18px icon, a little shorter where the
   screen has no height to spare */
:deep(.nav-link) {
  height: 1.875rem !important;
  padding: 0 0.625rem !important;
  gap: 0.75rem !important;
  font-size: 0.84375rem !important;
}

:deep(.nav-link > svg) {
  width: 1.125rem !important;
  height: 1.125rem !important;
}

@media (min-height: 700px) {
  :deep(.nav-link) {
    height: 2.125rem !important;
  }
}

/* on the rail the link is the primitive's 2rem square again, and 7px of
   padding puts the 18px icon dead in its centre */
[data-collapsible="icon"] :deep(.nav-link) {
  width: 2rem !important;
  height: 2rem !important;
  padding: 7px !important;
}
</style>

<style>
[data-mobile="true"] [data-sidebar="footer"] [data-sidebar="menu-button"] {
  margin-left: 0 !important;
}
[data-mobile="true"]
  [data-sidebar="footer"]
  [data-sidebar="menu-button"]
  > svg {
  width: 1rem !important;
  height: 1rem !important;
}
</style>

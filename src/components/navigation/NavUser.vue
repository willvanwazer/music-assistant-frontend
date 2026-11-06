<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authManager } from "@/plugins/auth";
import { store } from "@/plugins/store";
import { LogOut, MoreVertical, Settings, SquarePen } from "@lucide/vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

const isMenuEditMode = computed(() => store.navMenuEditMode);

const router = useRouter();
const { isMobile, setOpenMobile } = useSidebar();

const displayName =
  store.currentUser?.display_name || store.currentUser?.username || "";
const username = store.currentUser?.username || "";
const initial = displayName ? displayName[0].toUpperCase() : "U";

const handleProfile = () => {
  setOpenMobile(false);
  router.push({ name: "profile" });
};

const handleEditMenu = () => {
  // Keep the sidebar (sheet on mobile) open: the menu itself is being edited.
  store.navMenuEditMode = !store.navMenuEditMode;
};

const handleLogout = () => {
  setOpenMobile(false);
  authManager.logout();
};
</script>

<template>
  <SidebarMenu class="w-full">
    <SidebarMenuItem class="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-8 w-8 shrink-0">
              <AvatarImage
                v-if="store.currentUser?.avatar_url"
                :src="store.currentUser.avatar_url"
                :alt="displayName"
              />
              <AvatarFallback
                class="bg-primary text-primary-foreground text-[11.5px] font-semibold"
              >
                {{ initial }}
              </AvatarFallback>
            </Avatar>
            <!-- only the avatar fits the collapsed rail, so the name and the
                 chevron hide the moment collapsing starts rather than linger
                 over the still-shrinking row -->
            <div
              class="grid min-w-0 flex-1 gap-0.5 text-left leading-tight group-data-[collapsible=icon]:hidden"
            >
              <span class="truncate text-[13px] font-semibold">
                {{ displayName }}
              </span>
              <span class="text-subtle-foreground truncate text-[11.5px]">
                {{ username }}
              </span>
            </div>
            <MoreVertical
              class="ml-auto size-4 shrink-0 text-subtle-foreground group-data-[collapsible=icon]:hidden"
            />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="z-[100001] w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="isMobile ? 4 : 15"
          align="end"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8">
                <AvatarImage
                  v-if="store.currentUser?.avatar_url"
                  :src="store.currentUser.avatar_url"
                  :alt="displayName"
                />
                <AvatarFallback
                  class="bg-primary text-primary-foreground text-[11.5px] font-semibold"
                >
                  {{ initial }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 gap-0.5 text-left leading-tight">
                <span class="truncate text-[13px] font-semibold">
                  {{ displayName }}
                </span>
                <span class="text-subtle-foreground truncate text-[11.5px]">
                  {{ username }}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleProfile">
            <Settings class="size-4" />
            {{ $t("auth.profile") }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleEditMenu">
            <SquarePen class="size-4" />
            {{ $t(isMenuEditMode ? "menu_edit_disable" : "menu_edit_enable") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="!store.isIngressSession"
            @click="handleLogout"
          >
            <LogOut class="size-4" />
            {{ $t("auth.logout") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Folder } from "@lucide/vue";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  usePlaylistFolders,
  changePlaylistFolder,
} from "@/composables/usePlaylistFolders";
import {
  PLAYLIST_DRAG_TYPE,
  playlistIdsFromDrop,
} from "@/helpers/playlistFolderDrag";
const { folders, canEdit } = usePlaylistFolders();
const pinned = computed(() => folders.value.filter((folder) => folder.pinned));
const route = useRoute();
const { setOpenMobile } = useSidebar();
function allowDrop(event: DragEvent) {
  if (canEdit.value && event.dataTransfer?.types.includes(PLAYLIST_DRAG_TYPE))
    event.preventDefault();
}
async function move(event: DragEvent, folderId: string) {
  if (!canEdit.value) return;
  const ids = playlistIdsFromDrop(event);
  if (ids.length)
    await changePlaylistFolder("move", {
      playlist_ids: ids,
      folder_id: folderId,
    });
}
</script>

<template>
  <SidebarGroup v-if="pinned.length">
    <SidebarGroupLabel>{{ $t("playlist_folders.title") }}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem
          v-for="folder in pinned"
          :key="folder.folder_id"
          @dragover="allowDrop"
          @drop.prevent="move($event, folder.folder_id)"
        >
          <SidebarMenuButton
            as-child
            :is-active="
              route.name === 'playlists' &&
              route.query.folder === folder.folder_id
            "
            :tooltip="folder.name"
          >
            <RouterLink
              :to="{ name: 'playlists', query: { folder: folder.folder_id } }"
              @click="setOpenMobile(false)"
              ><Folder /><span class="truncate">{{
                folder.name
              }}</span></RouterLink
            >
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>

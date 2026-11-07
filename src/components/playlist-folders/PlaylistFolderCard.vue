<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { Folder, EllipsisVertical, Pin, Pencil, Trash2 } from "@lucide/vue";
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  type PlaylistFolder,
  changePlaylistFolder,
} from "@/composables/usePlaylistFolders";
import {
  PLAYLIST_DRAG_TYPE,
  playlistIdsFromDrop,
} from "@/helpers/playlistFolderDrag";
import { eventbus } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";

const props = defineProps<{ folder: PlaylistFolder; canEdit: boolean }>();
const over = ref(false);
function dragOver(event: DragEvent) {
  if (!props.canEdit || !event.dataTransfer?.types.includes(PLAYLIST_DRAG_TYPE))
    return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  over.value = true;
}
async function drop(event: DragEvent) {
  over.value = false;
  if (!props.canEdit) return;
  const ids = playlistIdsFromDrop(event);
  if (ids.length)
    await changePlaylistFolder("move", {
      playlist_ids: ids,
      folder_id: props.folder.folder_id,
    });
}
function remove() {
  eventbus.emit("deleteConfirmationDialog", {
    title: $t("playlist_folders.delete"),
    message: $t("playlist_folders.delete_description"),
    onConfirm: async () => {
      await changePlaylistFolder("delete", {
        folder_id: props.folder.folder_id,
      });
    },
  });
}
</script>

<template>
  <article
    class="folder-card"
    :class="{ 'folder-card--over': over }"
    @dragover="dragOver"
    @dragleave="over = false"
    @drop.prevent="drop"
  >
    <RouterLink
      :to="{ name: 'playlists', query: { folder: folder.folder_id } }"
      class="folder-card__link"
    >
      <div class="folder-card__art" aria-hidden="true">
        <MediaItemThumb
          v-for="item in folder.preview"
          :key="item.uri"
          :item="item"
          :rounded="false"
        />
        <Folder
          v-if="!folder.preview.length"
          class="size-10 text-muted-foreground"
        />
      </div>
      <span class="font-display text-xl text-foreground">{{
        folder.name
      }}</span>
      <span class="text-sm text-muted-foreground">{{
        $t("playlist_folders.count", { count: folder.playlist_count })
      }}</span>
    </RouterLink>
    <DropdownMenu v-if="canEdit">
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          class="folder-card__menu"
          :aria-label="$t('playlist_folders.actions', { name: folder.name })"
          ><EllipsisVertical
        /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          @select="
            eventbus.emit('playlistFolderDialog', { mode: 'rename', folder })
          "
          ><Pencil />{{ $t("playlist_folders.rename") }}</DropdownMenuItem
        >
        <DropdownMenuItem
          @select="
            changePlaylistFolder('update', {
              folder_id: folder.folder_id,
              pinned: !folder.pinned,
            })
          "
          ><Pin />{{
            $t(
              folder.pinned ? "playlist_folders.unpin" : "playlist_folders.pin",
            )
          }}</DropdownMenuItem
        >
        <DropdownMenuItem class="text-destructive" @select="remove"
          ><Trash2 />{{ $t("playlist_folders.delete") }}</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenu>
  </article>
</template>

<style scoped>
.folder-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  transition: border-color 150ms;
}
.folder-card--over {
  border-color: var(--primary);
  outline: 2px solid var(--primary);
}
.folder-card__link {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 18px;
}
.folder-card__art {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  width: 100%;
  aspect-ratio: 1;
  gap: 3px;
  margin-bottom: 10px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--secondary);
}
.folder-card__art:has(> :nth-child(2):last-child) {
  grid-template-rows: 1fr;
}
.folder-card__art:has(> :only-child) {
  grid-template-rows: 1fr;
  grid-template-columns: 1fr;
  place-items: center;
}
.folder-card__menu {
  position: absolute;
  right: 8px;
  bottom: 14px;
}
.folder-card__link > span {
  padding-right: 24px;
  overflow-wrap: anywhere;
}
</style>

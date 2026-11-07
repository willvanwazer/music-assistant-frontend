<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FolderPlus } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  changePlaylistFolder,
  usePlaylistFolders,
} from "@/composables/usePlaylistFolders";
import {
  PLAYLIST_DRAG_TYPE,
  playlistIdsFromDrop,
} from "@/helpers/playlistFolderDrag";
import { eventbus } from "@/plugins/eventbus";
import PlaylistFolderCard from "./PlaylistFolderCard.vue";
const route = useRoute();
const router = useRouter();
const { folders, loading, error, canEdit, refresh } = usePlaylistFolders();
const active = computed(() =>
  typeof route.query.folder === "string" ? route.query.folder : "",
);
const selected = computed(() =>
  folders.value.find((folder) => folder.folder_id === active.value),
);
function navigate(folder?: string) {
  void router.push({ name: "playlists", query: folder ? { folder } : {} });
}
function allowDrop(event: DragEvent) {
  if (canEdit.value && event.dataTransfer?.types.includes(PLAYLIST_DRAG_TYPE))
    event.preventDefault();
}
async function unfile(event: DragEvent) {
  if (!canEdit.value) return;
  const ids = playlistIdsFromDrop(event);
  if (ids.length)
    await changePlaylistFolder("move", { playlist_ids: ids, folder_id: null });
}
</script>

<template>
  <section class="playlist-folders" :aria-label="$t('playlist_folders.title')">
    <div class="flex flex-wrap items-center gap-2">
      <Button
        :variant="!active ? 'default' : 'outline'"
        :aria-pressed="!active"
        @click="navigate()"
        >{{ $t("playlist_folders.all") }}</Button
      >
      <Button
        :variant="active === 'unfiled' ? 'default' : 'outline'"
        :aria-pressed="active === 'unfiled'"
        @click="navigate('unfiled')"
        @dragover="allowDrop"
        @drop.prevent="unfile"
        >{{ $t("playlist_folders.unfiled") }}</Button
      >
      <span v-if="selected" class="px-2 font-display text-xl">{{
        selected.name
      }}</span>
      <Button
        v-if="canEdit"
        variant="outline"
        class="ml-auto"
        :disabled="loading || error"
        @click="eventbus.emit('playlistFolderDialog', { mode: 'create' })"
        ><FolderPlus class="size-4" />{{
          $t("playlist_folders.create")
        }}</Button
      >
    </div>
    <div
      v-if="error"
      role="alert"
      class="mt-4 flex items-center gap-3 text-sm text-destructive"
    >
      {{ $t("playlist_folders.load_error") }}
      <Button variant="outline" @click="refresh">{{
        $t("playlist_folders.retry")
      }}</Button>
    </div>
    <p
      v-else-if="loading && !folders.length"
      role="status"
      class="mt-4 text-sm text-muted-foreground"
    >
      {{ $t("loading") }}
    </p>
    <p
      v-else-if="active && active !== 'unfiled' && !selected"
      role="status"
      class="mt-4 text-sm text-muted-foreground"
    >
      {{ $t("playlist_folders.not_found") }}
    </p>
    <template v-else-if="!active">
      <div v-if="folders.length" class="folder-grid">
        <PlaylistFolderCard
          v-for="folder in folders"
          :key="folder.folder_id"
          :folder="folder"
          :can-edit="canEdit"
        />
      </div>
      <p v-else class="mt-4 text-sm text-muted-foreground">
        {{ $t("playlist_folders.empty") }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.playlist-folders {
  margin: 8px 24px 24px;
}
.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
@media (max-width: 600px) {
  .playlist-folders {
    margin-inline: 16px;
  }
  .folder-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>

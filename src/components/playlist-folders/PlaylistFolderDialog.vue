<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { store } from "@/plugins/store";
import { eventbus, type PlaylistFolderDialogEvent } from "@/plugins/eventbus";
import {
  changePlaylistFolder,
  usePlaylistFolders,
} from "@/composables/usePlaylistFolders";

const { folders, loading, error, refresh } = usePlaylistFolders();
const request = ref<PlaylistFolderDialogEvent>();
const open = ref(false);
const name = ref("");
const destination = ref("__choose");
const busy = ref(false);
watch(open, (value) => {
  store.dialogActive = value;
});
function show(event: PlaylistFolderDialogEvent) {
  request.value = event;
  name.value = event.folder?.name || "";
  destination.value = "__choose";
  open.value = true;
  void refresh();
}
async function save() {
  if (!request.value || busy.value) return;
  busy.value = true;
  const { mode, folder, playlistIds } = request.value;
  const result = await changePlaylistFolder(
    mode === "rename" ? "update" : mode,
    mode === "move"
      ? { playlist_ids: playlistIds, folder_id: destination.value || null }
      : {
          name: name.value.trim(),
          ...(folder ? { folder_id: folder.folder_id } : {}),
        },
  );
  busy.value = false;
  if (result.ok) open.value = false;
}
onMounted(() => eventbus.on("playlistFolderDialog", show));
onUnmounted(() => {
  eventbus.off("playlistFolderDialog", show);
  if (open.value) store.dialogActive = false;
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{
          $t(`playlist_folders.${request?.mode || "create"}`)
        }}</DialogTitle>
        <DialogDescription>{{
          $t("playlist_folders.personal_description")
        }}</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="save">
        <template v-if="request?.mode === 'move'">
          <label for="playlist-folder-destination" class="text-sm">{{
            $t("playlist_folders.destination")
          }}</label>
          <select
            id="playlist-folder-destination"
            v-model="destination"
            class="w-full rounded-xl border border-border bg-secondary p-3 text-foreground"
            :disabled="busy || loading || error"
          >
            <option value="__choose" disabled>
              {{ $t("playlist_folders.choose") }}
            </option>
            <option value="">{{ $t("playlist_folders.unfiled") }}</option>
            <option
              v-for="folder in folders"
              :key="folder.folder_id"
              :value="folder.folder_id"
            >
              {{ folder.name }}
            </option>
          </select>
          <p v-if="error" role="alert" class="text-sm text-destructive">
            {{ $t("playlist_folders.load_error") }}
          </p>
          <Button
            v-if="error"
            type="button"
            variant="outline"
            @click="refresh"
            >{{ $t("playlist_folders.retry") }}</Button
          >
        </template>
        <template v-else>
          <label for="playlist-folder-name" class="text-sm">{{
            $t("playlist_folders.name")
          }}</label>
          <Input
            id="playlist-folder-name"
            v-model="name"
            autofocus
            maxlength="100"
            required
            :disabled="busy"
          />
        </template>
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            :disabled="busy"
            @click="open = false"
            >{{ $t("cancel") }}</Button
          >
          <Button
            type="submit"
            :disabled="
              busy ||
              (request?.mode === 'move'
                ? destination === '__choose' || loading || error
                : !name.trim())
            "
            >{{ $t("settings.save") }}</Button
          >
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { toast } from "vue-sonner";
import api from "@/plugins/api";
import {
  EventType,
  type Playlist,
  type EventMessage,
} from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { $t } from "@/plugins/i18n";

export interface PlaylistFolder {
  folder_id: string;
  name: string;
  pinned: boolean;
  playlist_count: number;
  playlist_ids: string[];
  preview: Playlist[];
}

const folders = ref<PlaylistFolder[]>([]);
const loading = ref(false);
const error = ref(false);
const revision = ref(0);
let owner: string | undefined;
let pending: Promise<void> | undefined;
let generation = 0;

export async function refreshPlaylistFolders(): Promise<void> {
  const userId = store.currentUser?.user_id;
  if (owner !== userId) {
    owner = userId;
    folders.value = [];
    error.value = false;
    pending = undefined;
    loading.value = false;
    generation++;
  }
  if (!userId) return;
  if (pending) return pending;
  const current = ++generation;
  loading.value = true;
  pending = (async () => {
    try {
      const result = await api.sendCommand<PlaylistFolder[]>(
        "music/playlist_folders/list",
        undefined,
        { suppressGlobalError: true },
      );
      if (current !== generation) return;
      if (JSON.stringify(folders.value) !== JSON.stringify(result)) {
        folders.value = result;
        revision.value++;
      }
      error.value = false;
    } catch {
      if (current === generation) error.value = true;
    } finally {
      if (current === generation) {
        loading.value = false;
        pending = undefined;
      }
    }
  })();
  return pending;
}

export async function changePlaylistFolder<T>(
  command: "create" | "update" | "delete" | "move",
  args: Record<string, unknown>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const value = await api.sendCommand<T>(
      `music/playlist_folders/${command}`,
      args,
      { suppressGlobalError: true },
    );
    // A load already in progress may predate this write. Refresh after it settles.
    await pending;
    await refreshPlaylistFolders();
    toast.success($t(`playlist_folders.${command}_success`));
    return { ok: true, value };
  } catch (err) {
    toast.error($t("playlist_folders.save_error"), {
      description: err instanceof Error ? err.message : undefined,
    });
    return { ok: false };
  }
}

export function usePlaylistFolders() {
  const canEdit = computed(
    () => !!store.currentUser && store.currentUser.role !== "guest",
  );
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const refreshVisible = () => {
    if (document.visibilityState !== "hidden") void refreshPlaylistFolders();
  };
  watch(
    () => store.currentUser?.user_id,
    () => void refreshPlaylistFolders(),
  );
  onMounted(() => {
    void refreshPlaylistFolders();
    unsubscribe = api.subscribe_multi(
      [
        EventType.MEDIA_ITEM_UPDATED,
        EventType.MEDIA_ITEM_DELETED,
        EventType.CONNECTED,
      ],
      (event: EventMessage) => {
        if (
          event.event === EventType.CONNECTED ||
          event.object_id ===
            `playlist_folders://${store.currentUser?.user_id}` ||
          event.object_id?.startsWith("library://playlist/")
        ) {
          void (async () => {
            await pending;
            await refreshPlaylistFolders();
          })();
        }
      },
    );
    window.addEventListener("focus", refreshVisible);
    timer = setInterval(refreshVisible, 60000);
  });
  onUnmounted(() => {
    unsubscribe?.();
    clearInterval(timer);
    window.removeEventListener("focus", refreshVisible);
  });
  return {
    folders,
    loading,
    error,
    revision,
    canEdit,
    refresh: refreshPlaylistFolders,
  };
}

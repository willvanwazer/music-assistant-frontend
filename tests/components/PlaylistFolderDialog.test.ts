import PlaylistFolderDialog from "@/components/playlist-folders/PlaylistFolderDialog.vue";
import { eventbus } from "@/plugins/eventbus";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  change: vi.fn(),
  refresh: vi.fn(),
  store: { dialogActive: false },
}));
vi.mock("@/plugins/store", () => ({ store: mocks.store }));
vi.mock("@/composables/usePlaylistFolders", async () => {
  const { ref } = await import("vue");
  return {
    changePlaylistFolder: mocks.change,
    usePlaylistFolders: () => ({
      folders: ref([{ folder_id: "dinner", name: "Dinner" }]),
      loading: ref(false),
      error: ref(false),
      refresh: mocks.refresh,
    }),
  };
});
const passthrough = { template: "<div><slot /></div>" };
function mountDialog() {
  return mount(PlaylistFolderDialog, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        Dialog: {
          props: ["open"],
          template: '<div v-if="open" class="folder-dialog"><slot /></div>',
        },
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        Button: { template: "<button><slot /></button>" },
        Input: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });
}
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.change.mockResolvedValue({ ok: true });
  mocks.store.dialogActive = false;
});
describe("playlist folder dialog", () => {
  it("creates a trimmed name and suppresses background shortcuts until closed", async () => {
    const wrapper = mountDialog();
    eventbus.emit("playlistFolderDialog", { mode: "create" });
    await flushPromises();
    expect(mocks.store.dialogActive).toBe(true);
    await wrapper.get("input").setValue("  Dinner  ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(mocks.change).toHaveBeenCalledWith("create", { name: "Dinner" });
    expect(wrapper.find(".folder-dialog").exists()).toBe(false);
    expect(mocks.store.dialogActive).toBe(false);
  });
  it("moves multiple playlists using the mobile-friendly picker and can return them to Unfiled", async () => {
    const wrapper = mountDialog();
    for (const destination of ["dinner", ""]) {
      eventbus.emit("playlistFolderDialog", {
        mode: "move",
        playlistIds: ["42", "57"],
      });
      await flushPromises();
      expect(
        wrapper.get('button[type="submit"]').attributes("disabled"),
      ).toBeDefined();
      await wrapper.get("select").setValue(destination);
      await wrapper.get("form").trigger("submit");
      await flushPromises();
      expect(mocks.change).toHaveBeenLastCalledWith("move", {
        playlist_ids: ["42", "57"],
        folder_id: destination || null,
      });
    }
  });
  it("preserves the input and dialog when the server rejects a save", async () => {
    mocks.change.mockResolvedValue({ ok: false });
    const wrapper = mountDialog();
    eventbus.emit("playlistFolderDialog", { mode: "create" });
    await flushPromises();
    await wrapper.get("input").setValue("Dinner");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get("input").element.value).toBe("Dinner");
    expect(wrapper.find(".folder-dialog").exists()).toBe(true);
    wrapper.unmount();
    expect(mocks.store.dialogActive).toBe(false);
  });
});

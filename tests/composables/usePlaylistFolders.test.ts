import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, reactive } from "vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import {
  changePlaylistFolder,
  usePlaylistFolders,
} from "@/composables/usePlaylistFolders";
import { EventType } from "@/plugins/api/interfaces";

const mocks = vi.hoisted(() => ({
  sendCommand: vi.fn(),
  subscribe: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
const state = reactive({ currentUser: { user_id: "user-0", role: "admin" } });
vi.mock("@/plugins/api", () => ({
  default: { sendCommand: mocks.sendCommand, subscribe_multi: mocks.subscribe },
}));
vi.mock("@/plugins/store", () => ({
  get store() {
    return state;
  },
}));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));
vi.mock("vue-sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
const Probe = defineComponent({
  setup: usePlaylistFolders,
  template:
    '<div><span v-for="folder in folders" :key="folder.folder_id">{{folder.name}}</span><b v-if="error">error</b></div>',
});
const folder = (name: string) => ({
  folder_id: name,
  name,
  pinned: false,
  playlist_count: 0,
  playlist_ids: [],
  preview: [],
});
let sequence = 0;
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  state.currentUser = { user_id: `user-${++sequence}`, role: "admin" };
  mocks.sendCommand.mockResolvedValue([]);
  mocks.subscribe.mockReturnValue(vi.fn());
});

describe("account-scoped playlist folders", () => {
  it("shares an in-flight load across the page and sidebar", async () => {
    mocks.sendCommand.mockResolvedValue([folder("Dinner")]);
    const page = mount(Probe);
    const sidebar = mount(Probe);
    await flushPromises();
    expect(mocks.sendCommand).toHaveBeenCalledTimes(1);
    expect(page.text()).toContain("Dinner");
    expect(sidebar.text()).toContain("Dinner");
  });
  it("discards an old account's response after switching users", async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.sendCommand.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const page = mount(Probe);
    mocks.sendCommand.mockResolvedValue([folder("New account")]);
    state.currentUser = { user_id: "new-account", role: "admin" };
    await flushPromises();
    resolveOld([folder("Private old account")]);
    await flushPromises();
    expect(page.text()).toContain("New account");
    expect(page.text()).not.toContain("Private old account");
  });
  it("refreshes on another client's mutation for the same account only", async () => {
    const page = mount(Probe);
    await flushPromises();
    const listener = mocks.subscribe.mock.calls[0][1];
    listener({
      event: EventType.MEDIA_ITEM_UPDATED,
      object_id: "playlist_folders://someone-else",
    });
    expect(mocks.sendCommand).toHaveBeenCalledTimes(1);
    mocks.sendCommand.mockResolvedValue([folder("Synced folder")]);
    listener({
      event: EventType.MEDIA_ITEM_UPDATED,
      object_id: `playlist_folders://${state.currentUser.user_id}`,
    });
    await flushPromises();
    expect(page.text()).toContain("Synced folder");
  });
  it("reports rejected writes without announcing success", async () => {
    mount(Probe);
    await flushPromises();
    mocks.sendCommand.mockRejectedValueOnce(
      new Error("Folder name already exists"),
    );
    expect(await changePlaylistFolder("create", { name: "Dinner" })).toEqual({
      ok: false,
    });
    expect(mocks.error).toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("exposes a load failure and reloads after a successful write", async () => {
    mocks.sendCommand.mockRejectedValueOnce(new Error("offline"));
    const page = mount(Probe);
    await flushPromises();
    expect(page.text()).toContain("error");
    mocks.sendCommand
      .mockResolvedValueOnce({ folder_id: "Dinner" })
      .mockResolvedValueOnce([folder("Dinner")]);
    expect((await changePlaylistFolder("create", { name: "Dinner" })).ok).toBe(
      true,
    );
    expect(page.text()).toContain("Dinner");
    expect(page.text()).not.toContain("error");
    expect(mocks.success).toHaveBeenCalledOnce();
  });
});

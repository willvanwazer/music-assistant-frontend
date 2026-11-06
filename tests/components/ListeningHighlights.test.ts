import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import ListeningHighlights from "@/components/discover/ListeningHighlights.vue";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    providers: {
      pocketcasts: {
        domain: "pocketcasts",
        available: true,
        instance_id: "pocketcasts",
      },
    },
    getRecentlyPlayedAlbumsAndPlaylists: vi.fn(),
    browse: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
}));
vi.mock("@/plugins/api", () => ({ default: apiMock }));
vi.mock("@/plugins/store", () => ({
  store: { currentUser: { user_id: "will", provider_filter: [] } },
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/helpers/utils", () => ({ panelViewItemResponsive: () => 5 }));
vi.mock("@/plugins/breakpoint", () => ({ getBreakpointValue: () => false }));
vi.mock("@/components/discover/EditorialShelf.vue", () => ({
  default: {
    props: ["title"],
    template:
      '<section><h2>{{ title }}</h2><slot name="actions" /><slot /></section>',
  },
}));
vi.mock("@/components/discover/EditorialMediaCard.vue", () => ({
  default: {
    props: ["item"],
    template:
      '<div class="media-card">{{ item.name }}<slot name="subtitle" /></div>',
  },
}));
vi.mock("@/components/discover/EditorialCardSkeleton.vue", () => ({
  default: { template: "<div />" },
}));
enableAutoUnmount(afterEach);

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getRecentlyPlayedAlbumsAndPlaylists.mockResolvedValue([]);
  apiMock.browse.mockResolvedValue([]);
});
const render = () =>
  mount(ListeningHighlights, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { Button: { template: "<button><slot /></button>" } },
    },
  });

describe("permanent listening highlights", () => {
  it("keeps recent listening above Podcasts and both podcast shelves visible when empty", async () => {
    const wrapper = render();
    await flushPromises();
    const text = wrapper.text();
    expect(text.indexOf("listening_home.recent_title")).toBeLessThan(
      text.indexOf("podcasts"),
    );
    expect(text).toContain("listening_home.up_next");
    expect(text).toContain("listening_home.active_podcasts");
    expect(text).toContain("listening_home.queue_empty");
    expect(apiMock.browse).toHaveBeenCalledWith("pocketcasts://up_next");
    expect(apiMock.browse).toHaveBeenCalledWith("pocketcasts://in_progress");
  });
  it("keeps listening history usable when the podcast service fails", async () => {
    apiMock.getRecentlyPlayedAlbumsAndPlaylists.mockResolvedValue([
      { uri: "library://album/1", name: "A favorite album" },
    ]);
    apiMock.browse.mockRejectedValue(new Error("Offline"));
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain("A favorite album");
    expect(wrapper.text()).toContain("listening_home.queue_error");
    expect(wrapper.text()).toContain("listening_home.progress_error");
  });
});

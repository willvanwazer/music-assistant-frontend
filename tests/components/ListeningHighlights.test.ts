import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import ListeningHighlights from "@/components/discover/ListeningHighlights.vue";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    providers: {
      spotify: {
        domain: "spotify",
        available: true,
        instance_id: "spotify--test",
      },
      overcast_mac: {
        domain: "overcast_mac",
        available: true,
        instance_id: "overcast_mac",
      },
      pocketcasts: {
        domain: "pocketcasts",
        available: false,
        instance_id: "pocketcasts",
      },
    },
    getRecommendationItems: vi.fn(),
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
vi.mock("@/helpers/utils", () => ({
  panelViewItemResponsive: () => 5,
  shelfTilesPerView: () => 5.5,
  formatDuration: (seconds: number) => `${seconds}s`,
}));
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
  apiMock.getRecommendationItems.mockResolvedValue([]);
});
const render = (section: "all" | "recent" | "podcasts" = "all") =>
  mount(ListeningHighlights, {
    props: { section },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { Button: { template: "<button><slot /></button>" } },
    },
  });

describe("permanent listening highlights", () => {
  it("merges Spotify containers into one shelf and removes duplicate local albums", async () => {
    const album = {
      uri: "library://album/1",
      name: "Same album",
      media_type: "album",
    };
    apiMock.getRecentlyPlayedAlbumsAndPlaylists.mockResolvedValue([album]);
    apiMock.getRecommendationItems.mockResolvedValue([
      album,
      {
        uri: "spotify://playlist/2",
        name: "Spotify mix",
        media_type: "playlist",
      },
      { uri: "spotify://track/3", name: "Hidden track", media_type: "track" },
    ]);
    const wrapper = render("recent");
    await flushPromises();
    expect(wrapper.findAll("h2")).toHaveLength(1);
    expect(wrapper.findAll(".media-card").map((card) => card.text())).toEqual([
      "Same album",
      "Spotify mix",
    ]);
    expect(apiMock.getRecommendationItems).toHaveBeenCalledWith(
      "spotify--test",
      "recently_played",
    );
  });
  it("renders local history while Spotify is still loading", async () => {
    let resolveSpotify!: (items: unknown[]) => void;
    apiMock.getRecommendationItems.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSpotify = resolve;
        }),
    );
    apiMock.getRecentlyPlayedAlbumsAndPlaylists.mockResolvedValue([
      { uri: "library://album/1", name: "Local album", media_type: "album" },
    ]);
    const wrapper = render("recent");
    await flushPromises();
    expect(wrapper.text()).toContain("Local album");
    resolveSpotify([]);
    await flushPromises();
  });
  it("loads each separately positioned section without duplicate requests", async () => {
    const recent = render("recent");
    await flushPromises();
    expect(recent.text()).not.toContain("listening_home.up_next");
    expect(apiMock.browse).not.toHaveBeenCalled();
    const podcasts = render("podcasts");
    await flushPromises();
    expect(podcasts.text()).not.toContain("recently_played");
    expect(apiMock.getRecentlyPlayedAlbumsAndPlaylists).toHaveBeenCalledTimes(
      1,
    );
    expect(apiMock.browse).toHaveBeenCalledTimes(2);
  });
  it("keeps recent listening above Podcasts and both podcast shelves visible when empty", async () => {
    const wrapper = render();
    await flushPromises();
    const text = wrapper.text();
    expect(text.indexOf("recently_played")).toBeLessThan(
      text.indexOf("podcasts"),
    );
    expect(text).toContain("listening_home.up_next");
    expect(text).toContain("listening_home.continue_listening");
    expect(text).toContain("listening_home.queue_empty");
    expect(apiMock.browse).toHaveBeenCalledWith("overcast_mac://up_next");
    expect(apiMock.browse).toHaveBeenCalledWith("overcast_mac://in_progress");
    expect(apiMock.browse).not.toHaveBeenCalledWith("pocketcasts://up_next");
  });
  it("shows started episodes separately with their saved playback progress", async () => {
    apiMock.browse.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("in_progress")
          ? ["First episode", "Second episode"].map((name, i) => ({
              uri: `pocketcasts://podcast_episode/${i}`,
              name,
              media_type: "podcast_episode",
              podcast: { name: "Same show", uri: "pocketcasts://podcast/show" },
              resume_position_ms: 120000,
              duration: 600,
            }))
          : [],
      ),
    );
    const wrapper = render();
    await flushPromises();
    expect(wrapper.findAll(".media-card").map((card) => card.text())).toEqual([
      expect.stringContaining("First episodeSame show"),
      expect.stringContaining("Second episodeSame show"),
    ]);
    expect(wrapper.findAll("progress")).toHaveLength(2);
    expect(wrapper.find("progress").attributes("value")).toBe("120");
    expect(wrapper.find("progress").attributes("max")).toBe("600");
  });
  it("keeps listening history usable when the podcast service fails", async () => {
    apiMock.getRecentlyPlayedAlbumsAndPlaylists.mockResolvedValue([
      {
        uri: "library://album/1",
        name: "A favorite album",
        media_type: "album",
      },
    ]);
    apiMock.browse.mockRejectedValue(new Error("Offline"));
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain("A favorite album");
    expect(wrapper.emitted("catalogItems")?.at(-1)).toEqual([
      [
        {
          uri: "library://album/1",
          name: "A favorite album",
          media_type: "album",
        },
      ],
    ]);
    expect(wrapper.text()).toContain("listening_home.queue_error");
    expect(wrapper.text()).toContain("listening_home.progress_error");
  });
});

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const { mockUpdateUser, mockGetItemByUri, storeMock } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockGetItemByUri: vi.fn(),
  storeMock: {
    currentUser: {
      user_id: "user-1",
      preferences: {} as Record<string, unknown>,
    },
  },
}));

vi.mock("@/plugins/api", () => ({
  api: {
    updateUser: mockUpdateUser,
    getItemByUri: mockGetItemByUri,
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));

import {
  HOME_PINS_PREFERENCE_KEY,
  getHomePinMoveAvailability,
  getHomePinUris,
  isPinnedToHome,
  moveHomePin,
  pinToHome,
  unpinFromHome,
  useHomePins,
} from "@/composables/useHomePins";
import { MediaType, type ItemMapping } from "@/plugins/api/interfaces";

const mapping = (id: string): ItemMapping =>
  ({
    item_id: id,
    provider: "library",
    media_type: MediaType.PLAYLIST,
    name: `Playlist ${id}`,
    uri: `library://playlist/${id}`,
  }) as ItemMapping;

describe("home pins", () => {
  beforeEach(() => {
    storeMock.currentUser.preferences = {};
    mockUpdateUser.mockReset();
    mockGetItemByUri.mockReset();
  });

  it("pins newest first and ignores duplicates", async () => {
    await pinToHome(mapping("1"));
    await pinToHome(mapping("2"));
    await pinToHome(mapping("1"));
    expect(getHomePinUris()).toEqual([
      "library://playlist/2",
      "library://playlist/1",
    ]);
    expect(isPinnedToHome(mapping("1"))).toBe(true);
  });

  it("moves and unpins", async () => {
    storeMock.currentUser.preferences = {
      [HOME_PINS_PREFERENCE_KEY]: [
        "library://playlist/1",
        "library://playlist/2",
      ],
    };
    expect(getHomePinMoveAvailability(mapping("1"))).toEqual({
      canMoveLeft: false,
      canMoveRight: true,
    });
    await moveHomePin(mapping("1"), "right");
    expect(getHomePinUris()).toEqual([
      "library://playlist/2",
      "library://playlist/1",
    ]);
    await unpinFromHome(mapping("2"));
    expect(getHomePinUris()).toEqual(["library://playlist/1"]);
  });

  it("resolves pinned items in pin order and skips failures", async () => {
    storeMock.currentUser.preferences = {
      [HOME_PINS_PREFERENCE_KEY]: [
        "library://playlist/2",
        "library://playlist/gone",
        "library://playlist/1",
      ],
    };
    mockGetItemByUri.mockImplementation(async (uri: string) => {
      if (uri.endsWith("gone")) throw new Error("offline");
      return mapping(uri.split("/").pop()!);
    });
    let items: ReturnType<typeof useHomePins>["items"] | undefined;
    mount(
      defineComponent({
        setup() {
          items = useHomePins().items;
          return () => h("div");
        },
      }),
    );
    await flushPromises();
    expect(items!.value.map((i) => i.item_id)).toEqual(["2", "1"]);
    // the failed pin is kept
    expect(getHomePinUris()).toHaveLength(3);
  });
});

import { expect, it, vi } from "vitest";
import { useCurrentItemFavorite } from "@/composables/useCurrentItemFavorite";
import { EventType, type EventMessage } from "@/plugins/api/interfaces";

const mocks = vi.hoisted(() => ({ subscribe: vi.fn() }));
vi.mock("@/plugins/api", () => ({ default: { subscribe: mocks.subscribe } }));
vi.mock("@/plugins/eventbus", () => ({ eventbus: { emit: vi.fn() } }));
vi.mock("@/plugins/store", () => ({
  store: {
    curQueueItem: {
      queue_item_id: "current",
      media_item: {
        uri: "library://track/1",
        media_type: "track",
        favorite: false,
      },
    },
  },
}));

it("ignores folder invalidations and still handles favorite updates", () => {
  const favorite = useCurrentItemFavorite();
  const listener = mocks.subscribe.mock.calls[0][1] as (
    event: EventMessage,
  ) => void;
  for (const data of [null, {}]) {
    expect(() =>
      listener({
        event: EventType.MEDIA_ITEM_UPDATED,
        object_id: "playlist_folders://will",
        data,
      } as EventMessage),
    ).not.toThrow();
    expect(favorite.isFavorite.value).toBe(false);
  }
  listener({
    event: EventType.MEDIA_ITEM_UPDATED,
    object_id: "library://track/1",
    data: { uri: "library://track/1", favorite: true },
  } as EventMessage);
  expect(favorite.isFavorite.value).toBe(true);
});

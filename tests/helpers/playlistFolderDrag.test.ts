import { describe, expect, it, vi } from "vitest";
import {
  PLAYLIST_DRAG_TYPE,
  playlistIdsFromDrop,
  startPlaylistDrag,
} from "@/helpers/playlistFolderDrag";

describe("playlist folder drag payloads", () => {
  const drop = (payload: string) =>
    ({ dataTransfer: { getData: () => payload } }) as unknown as DragEvent;
  it("accepts and deduplicates library playlist IDs", () => {
    expect(playlistIdsFromDrop(drop('["12","4","12"]'))).toEqual(["12", "4"]);
  });
  it.each([
    "null",
    "{}",
    "bad json",
    "[]",
    "[12]",
    '["spotify-id"]',
    '["0"]',
    JSON.stringify(Array(501).fill("1")),
  ])("rejects an invalid payload: %s", (payload) => {
    expect(playlistIdsFromDrop(drop(payload))).toEqual([]);
  });
  it("creates a move payload only for library items", () => {
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    const event = { dataTransfer } as unknown as DragEvent;
    startPlaylistDrag(event, { provider: "spotify", item_id: "12" });
    expect(dataTransfer.setData).not.toHaveBeenCalled();
    startPlaylistDrag(event, { provider: "library", item_id: "12" });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      PLAYLIST_DRAG_TYPE,
      '["12"]',
    );
    expect(dataTransfer.effectAllowed).toBe("move");
  });
});

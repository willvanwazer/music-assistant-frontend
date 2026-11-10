import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./index";
import { MediaType } from "./interfaces";

describe("recent listening containers", () => {
  afterEach(() => vi.restoreAllMocks());
  it("requests started albums and playlists, including albums reached through individual tracks", async () => {
    const spy = vi.spyOn(api, "sendCommand").mockResolvedValue([]);
    await api.getRecentlyPlayedAlbumsAndPlaylists();
    expect(spy).toHaveBeenCalledWith(
      "music/recently_played_items",
      {
        limit: 20,
        media_types: [MediaType.ALBUM, MediaType.PLAYLIST],
        fully_played_only: false,
        user_initiated_only: false,
      },
      { suppressGlobalError: true },
    );
  });
});

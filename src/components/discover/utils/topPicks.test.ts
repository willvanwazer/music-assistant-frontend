import { describe, expect, it } from "vitest";
import {
  MediaType,
  type Album,
  type RecommendationFolder,
} from "@/plugins/api/interfaces";
import { topPickItems } from "./topPicks";

const now = Date.parse("2026-11-06T12:00:00Z");
const imported = { item_id: "recently_added_albums" } as RecommendationFolder;
const album = (release_date?: string, year?: number) =>
  ({
    media_type: MediaType.ALBUM,
    metadata: { release_date },
    year,
  }) as Album;

describe("Top picks release recency", () => {
  it("excludes old albums and unknown dates even when imported today", () => {
    expect(
      topPickItems(
        imported,
        [album("1987-03-09"), album(undefined, 2026), album("2026")],
        now,
      ),
    ).toEqual([]);
  });
  it("uses a 90-day release window and excludes future releases", () => {
    const recent = album("2026-10-01");
    expect(
      topPickItems(
        imported,
        [album("2026-07-01"), recent, album("2026-12-01")],
        now,
      ),
    ).toEqual([recent]);
  });
  it("keeps older favorites and listening history under their actual recommendation reason", () => {
    const old = album("1987-03-09");
    expect(
      topPickItems(
        { item_id: "recently_played" } as RecommendationFolder,
        [old],
        now,
      ),
    ).toEqual([old]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { storeMock, mockSetUserPreference } = vi.hoisted(() => ({
  storeMock: {
    currentUser: null as { preferences?: Record<string, unknown> } | null,
  },
  mockSetUserPreference: vi.fn(),
}));

vi.mock("@/plugins/store", () => ({
  store: storeMock,
}));

vi.mock("@/composables/userPreferences", () => ({
  setUserPreference: mockSetUserPreference,
}));

import {
  DISCOVER_ROWS_LAYOUT_VERSION,
  DISCOVER_ROWS_PREFERENCE_KEY,
  GENRES_ROW_ID,
  IN_PROGRESS_ROW_ID,
  PINNED_ROW_ID,
  PLAYERS_ROW_ID,
  PODCASTS_ROW_ID,
  RECENTLY_PLAYED_ROW_ID,
  TOP_PICKS_ROW_ID,
  defaultDiscoverRowOrder,
  discoverRowItems,
  isDefaultHiddenSpokenRow,
  isSpokenWordRow,
  resolveDiscoverRowsConfig,
  setDiscoverRowHidden,
  setDiscoverRowsOrder,
  type DiscoverRowsConfig,
} from "@/components/discover/utils/discoverRows";
import {
  MediaType,
  type MediaItemTypeOrItemMapping,
} from "@/plugins/api/interfaces";

const ROW_A = "library://folder/in_progress";
const ROW_B = "library://folder/recently_played";
const ROW_C = "spotify--abc://folder/made_for_you";
const ROW_D = "spotify--abc://folder/new_releases";

// Default order as HomeWidgetRows builds it: well-known rows first, then the
// remaining server rows, genres pinned last.
const AVAILABLE = [
  PLAYERS_ROW_ID,
  TOP_PICKS_ROW_ID,
  ROW_A,
  ROW_B,
  ROW_C,
  ROW_D,
  GENRES_ROW_ID,
];

function setPreferences(preferences: Record<string, unknown>) {
  storeMock.currentUser = { preferences };
}

function lastWrittenConfig(): DiscoverRowsConfig {
  const call = mockSetUserPreference.mock.calls.at(-1);
  expect(call?.[0]).toBe(DISCOVER_ROWS_PREFERENCE_KEY);
  return call?.[1] as DiscoverRowsConfig;
}

describe("discoverRows (discover.rows preference)", () => {
  beforeEach(() => {
    mockSetUserPreference.mockReset();
    mockSetUserPreference.mockImplementation(
      async (key: string, value: unknown) => {
        // emulate the optimistic local update of setUserPreference
        if (storeMock.currentUser) {
          storeMock.currentUser.preferences = {
            ...storeMock.currentUser.preferences,
            [key]: value,
          };
        }
      },
    );
    setPreferences({});
  });

  describe("resolveDiscoverRowsConfig", () => {
    it("returns the default order with nothing hidden without preferences", () => {
      const { order, hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(order).toEqual(AVAILABLE);
      expect(hidden.size).toBe(0);
    });

    it("applies the saved order and visibility", () => {
      const saved = [
        TOP_PICKS_ROW_ID,
        ROW_B,
        PLAYERS_ROW_ID,
        GENRES_ROW_ID,
        ROW_D,
        ROW_C,
        ROW_A,
      ];
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: [PLAYERS_ROW_ID, ROW_C],
          order: saved,
        },
      });
      const { order, hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(order).toEqual(saved);
      expect(hidden).toEqual(new Set([PLAYERS_ROW_ID, ROW_C]));
    });

    it("slots rows the user never ordered after their preceding default sibling", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          // user moved genres to the top, never saw ROW_D
          order: [
            GENRES_ROW_ID,
            PLAYERS_ROW_ID,
            TOP_PICKS_ROW_ID,
            ROW_A,
            ROW_B,
            ROW_C,
          ],
        },
      });
      const { order } = resolveDiscoverRowsConfig(AVAILABLE);
      // ROW_D's default position is right after ROW_C
      expect(order).toEqual([
        GENRES_ROW_ID,
        PLAYERS_ROW_ID,
        TOP_PICKS_ROW_ID,
        ROW_A,
        ROW_B,
        ROW_C,
        ROW_D,
      ]);
    });

    it("drops unavailable rows from the resolved order and hidden set", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: ["offline://folder/gone"],
          order: ["offline://folder/gone", ROW_B, ROW_A],
        },
      });
      const { order, hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(order).not.toContain("offline://folder/gone");
      expect(order).toContain(ROW_A);
      expect(hidden.size).toBe(0);
    });

    it("drops a saved order from an older layout but keeps visibility", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          hidden: [ROW_C],
          order: [GENRES_ROW_ID, ROW_D, ROW_C],
        },
      });
      const { order, hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(order).toEqual(AVAILABLE);
      expect(hidden).toEqual(new Set([ROW_C]));
    });

    it("writes the current layout version", async () => {
      await setDiscoverRowHidden(ROW_A, true);
      expect(lastWrittenConfig().version).toBe(DISCOVER_ROWS_LAYOUT_VERSION);
    });

    it("prefers the unified preference over legacy keys", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: { hidden: [], order: [] },
        discoverPlayersEnabled: false,
      });
      const { hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(hidden.size).toBe(0);
    });
  });

  describe("legacy preference fallback", () => {
    it("maps the legacy enabled flags to hidden rows", () => {
      setPreferences({
        discoverPlayersEnabled: false,
        discoverGenresEnabled: false,
      });
      const { hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(hidden).toEqual(new Set([PLAYERS_ROW_ID, GENRES_ROW_ID]));
    });

    it("maps legacy row settings to visibility and keeps the default order", () => {
      setPreferences({
        discoverRowSettings: {
          [ROW_C]: { position: 0, enabled: true },
          [ROW_A]: { position: 1, enabled: false },
        },
      });
      const { order, hidden } = resolveDiscoverRowsConfig(AVAILABLE);
      expect(order).toEqual(AVAILABLE);
      expect(hidden).toEqual(new Set([ROW_A]));
    });

    it("snapshots the legacy settings into the new format on first write", async () => {
      setPreferences({ discoverTopPicksEnabled: false });
      await setDiscoverRowHidden(ROW_A, true);
      expect(lastWrittenConfig().hidden).toEqual([TOP_PICKS_ROW_ID, ROW_A]);
    });
  });

  describe("setDiscoverRowHidden", () => {
    it("adds and removes a row from the hidden list", async () => {
      await setDiscoverRowHidden(ROW_B, true);
      expect(lastWrittenConfig().hidden).toEqual([ROW_B]);

      await setDiscoverRowHidden(ROW_B, false);
      expect(lastWrittenConfig().hidden).toEqual([]);
    });

    it("keeps hidden entries of currently unavailable rows", async () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: ["offline://folder/gone"],
          order: [],
        },
      });
      await setDiscoverRowHidden(ROW_B, true);
      expect(lastWrittenConfig().hidden).toEqual([
        "offline://folder/gone",
        ROW_B,
      ]);
    });
  });

  describe("setDiscoverRowsOrder", () => {
    it("persists the new order of the available rows", async () => {
      const reordered = [
        TOP_PICKS_ROW_ID,
        PLAYERS_ROW_ID,
        ROW_A,
        ROW_B,
        ROW_C,
        ROW_D,
        GENRES_ROW_ID,
      ];
      await setDiscoverRowsOrder(reordered, AVAILABLE);
      expect(lastWrittenConfig().order).toEqual(reordered);
    });

    it("keeps unavailable rows in their saved slots", async () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: [],
          // an offline provider's row sits between two available rows
          order: [ROW_A, "offline://folder/gone", ROW_B],
        },
      });
      const available = [ROW_A, ROW_B];
      await setDiscoverRowsOrder([ROW_B, ROW_A], available);
      expect(lastWrittenConfig().order).toEqual([
        ROW_B,
        "offline://folder/gone",
        ROW_A,
      ]);
    });

    it("ignores an order containing unknown rows", async () => {
      await setDiscoverRowsOrder(["bogus://row", ROW_A], [ROW_A]);
      expect(mockSetUserPreference).not.toHaveBeenCalled();
    });
  });

  describe("resolveDiscoverRowsConfig — default-off rows", () => {
    it("hides a default-off row when the user has no config", () => {
      const { hidden } = resolveDiscoverRowsConfig(["a", "b"], ["b"]);
      expect(hidden.has("b")).toBe(true);
      expect(hidden.has("a")).toBe(false);
    });

    it("shows a default-off row once the user opted it in (shown)", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: [],
          shown: ["b"],
          order: [],
        },
      });
      const { hidden } = resolveDiscoverRowsConfig(["a", "b"], ["b"]);
      expect(hidden.has("b")).toBe(false);
    });

    it("hides a normal row the user explicitly hid", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: ["a"],
          shown: [],
          order: [],
        },
      });
      const { hidden } = resolveDiscoverRowsConfig(["a", "b"], []);
      expect(hidden.has("a")).toBe(true);
    });

    it("keeps a default-off row in order so it stays openable in edit mode", () => {
      const { order } = resolveDiscoverRowsConfig(["a", "b"], ["b"]);
      expect(order).toContain("b");
    });

    it("treats hidden as authoritative when a row is in both hidden and shown", () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: ["a"],
          shown: ["a"],
          order: [],
        },
      });
      const { hidden } = resolveDiscoverRowsConfig(["a"], ["a"]);
      expect(hidden.has("a")).toBe(true);
    });
  });

  describe("setDiscoverRowHidden — hidden/shown bookkeeping", () => {
    it("hiding adds to hidden and clears shown; showing does the reverse", async () => {
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: [],
          shown: ["b"],
          order: [],
        },
      });
      await setDiscoverRowHidden("b", true);
      expect(mockSetUserPreference).toHaveBeenLastCalledWith(
        DISCOVER_ROWS_PREFERENCE_KEY,
        expect.objectContaining({ hidden: ["b"], shown: [] }),
      );
      setPreferences({
        [DISCOVER_ROWS_PREFERENCE_KEY]: {
          version: DISCOVER_ROWS_LAYOUT_VERSION,
          hidden: ["b"],
          shown: [],
          order: [],
        },
      });
      await setDiscoverRowHidden("b", false);
      expect(mockSetUserPreference).toHaveBeenLastCalledWith(
        DISCOVER_ROWS_PREFERENCE_KEY,
        expect.objectContaining({ hidden: [], shown: ["b"] }),
      );
    });
  });
});

describe("spoken-word rows", () => {
  const domains: Record<string, string> = {
    "abs--1": "audiobookshelf",
    "podcastfeed--2": "podcastfeed",
    "spotify--abc": "spotify",
  };
  const domainOf = (id: string) => domains[id];
  const folder = (provider: string, item_id: string) => ({
    provider,
    item_id,
    uri: `${provider}://folder/${item_id}`,
  });

  it("classifies audiobook and podcast providers and the in-progress row", () => {
    expect(isSpokenWordRow(folder("abs--1", "recently-added"), domainOf)).toBe(
      true,
    );
    expect(isSpokenWordRow(folder("podcastfeed--2", "x"), domainOf)).toBe(true);
    expect(isSpokenWordRow(folder("spotify--abc", "x"), domainOf)).toBe(false);
    expect(isSpokenWordRow(folder("library", "in_progress"), domainOf)).toBe(
      true,
    );
    expect(
      isSpokenWordRow(folder("library", "recently_played"), domainOf),
    ).toBe(false);
    // unknown instance: falls back to the id's domain prefix
    expect(isSpokenWordRow(folder("audible--z", "x"), domainOf)).toBe(true);
  });

  it("hides all audiobook shelves, including continue listening, by default", () => {
    expect(
      isDefaultHiddenSpokenRow(
        folder("abs--1", "continue-listening"),
        domainOf,
      ),
    ).toBe(true);
    for (const shelf of [
      "recently-added",
      "discover",
      "listen-again",
      "browse",
    ])
      expect(isDefaultHiddenSpokenRow(folder("abs--1", shelf), domainOf)).toBe(
        true,
      );
    expect(
      isDefaultHiddenSpokenRow(folder("podcastfeed--2", "x"), domainOf),
    ).toBe(false);
    for (const provider of ["audible--1", "storytel--1"]) {
      expect(
        isDefaultHiddenSpokenRow(
          folder(provider, "continue-listening"),
          domainOf,
        ),
      ).toBe(true);
    }
  });

  it("keeps books and podcasts out of shared music recommendations", () => {
    const items = [
      MediaType.ALBUM,
      MediaType.AUDIOBOOK,
      MediaType.PODCAST_EPISODE,
      MediaType.PLAYLIST,
      MediaType.PODCAST,
      MediaType.TRACK,
    ].map((media_type) => ({ media_type }) as MediaItemTypeOrItemMapping);
    for (const provider of ["library", "spotify--abc"]) {
      expect(
        discoverRowItems(folder(provider, "recently_played"), items, domainOf),
      ).toEqual([items[0], items[3], items[5]]);
    }
  });

  it("retains podcast progress below music without audiobook progress", () => {
    const book = {
      media_type: MediaType.AUDIOBOOK,
    } as MediaItemTypeOrItemMapping;
    const episode = {
      media_type: MediaType.PODCAST_EPISODE,
    } as MediaItemTypeOrItemMapping;
    for (const row of [
      folder("library", "in_progress"),
      folder("podcastfeed--2", "up_next"),
    ]) {
      expect(discoverRowItems(row, [book, episode], domainOf)).toEqual([
        episode,
      ]);
    }
  });

  it("preserves audiobook content only on explicitly enabled audiobook shelves", () => {
    const book = {
      media_type: MediaType.AUDIOBOOK,
    } as MediaItemTypeOrItemMapping;
    const row = folder("abs--1", "continue-listening");
    setPreferences({});
    const defaultHidden = isDefaultHiddenSpokenRow(row, domainOf)
      ? [row.uri]
      : [];
    expect(
      resolveDiscoverRowsConfig([row.uri], defaultHidden).hidden.has(row.uri),
    ).toBe(true);
    setPreferences({ [DISCOVER_ROWS_PREFERENCE_KEY]: { shown: [row.uri] } });
    expect(
      resolveDiscoverRowsConfig([row.uri], defaultHidden).hidden.has(row.uri),
    ).toBe(false);
    expect(discoverRowItems(row, [book], domainOf)).toEqual([book]);
  });

  it("orders music above podcasts and audiobooks", () => {
    const order = defaultDiscoverRowOrder({
      hasPlayers: true,
      hasPinned: true,
      hasTopPicks: true,
      hasGenres: true,
      folders: [
        { uri: IN_PROGRESS_ROW_ID, spokenWord: true },
        { uri: "abs--1://folder/continue-listening", spokenWord: true },
        { uri: ROW_C, spokenWord: false },
        {
          uri: "spotify--abc://folder/recently_played",
          spokenWord: false,
          recentlyPlayed: true,
        },
        {
          uri: RECENTLY_PLAYED_ROW_ID,
          spokenWord: false,
          recentlyPlayed: true,
        },
      ],
    });
    expect(order).toEqual([
      PLAYERS_ROW_ID,
      PINNED_ROW_ID,
      TOP_PICKS_ROW_ID,
      ROW_C,
      GENRES_ROW_ID,
      PODCASTS_ROW_ID,
      IN_PROGRESS_ROW_ID,
      "abs--1://folder/continue-listening",
    ]);
  });
});

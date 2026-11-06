import PlayerBarPlayerButton from "@/layouts/default/PlayerOSD/PlayerBarPlayerButton.vue";
import { store } from "@/plugins/store";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/plugins/store", async () => {
  const { reactive } = await vi.importActual<typeof import("vue")>("vue");
  return {
    store: reactive({
      activePlayer: undefined,
      showPlayersMenu: false,
    }),
  };
});

vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
}));

interface TestStore {
  activePlayer?: {
    name: string;
    player_id?: string;
    type?: string;
    group_members?: string[];
  };
  showPlayersMenu: boolean;
}

const testStore = store as unknown as TestStore;

let wrapper: VueWrapper | undefined;

function mountPlayerButton() {
  wrapper = mount(PlayerBarPlayerButton, {
    global: { stubs: { PlayerIcon: true } },
  });
  return wrapper.get("#player-select-button");
}

describe("PlayerBarPlayerButton", () => {
  beforeEach(() => {
    testStore.activePlayer = undefined;
    testStore.showPlayersMenu = false;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("announces the player list panel it opens", async () => {
    testStore.activePlayer = { name: "Kitchen" };
    const button = mountPlayerButton();

    expect(button.attributes("aria-haspopup")).toBe("dialog");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(button.attributes("aria-label")).toBe(
      "tooltip.select_player: Kitchen",
    );
    // a button that opens a panel reports its state through aria-expanded alone
    expect(button.attributes("aria-pressed")).toBeUndefined();
    expect(button.text()).toContain("Kitchen");

    await button.trigger("click");

    expect(testStore.showPlayersMenu).toBe(true);
    expect(button.attributes("aria-expanded")).toBe("true");
  });

  // the mouse that clicked the panel shut is still on the button, and no second
  // pointerenter is coming to say so
  it("keeps the hover color when a mouse clicks the panel closed", async () => {
    const button = mountPlayerButton();

    await button.trigger("pointerenter", { pointerType: "mouse" });
    await button.trigger("click");
    await button.trigger("click");

    expect(testStore.showPlayersMenu).toBe(false);
    expect(button.attributes("data-suppress-hover")).toBe("false");
  });

  // the name says which room the bar controls; the count says how many more
  // are playing along with it
  it("counts the rooms synced to the active one beside its name", () => {
    testStore.activePlayer = {
      name: "Kitchen",
      player_id: "kitchen",
      type: "player",
      group_members: ["kitchen", "office", "den"],
    };
    const button = mountPlayerButton();

    expect(button.get(".player-bar-action-label").text()).toBe("Kitchen");
    expect(button.get(".player-bar-player-count").text()).toBe("+2");
  });

  it("adds no count to a group player, whose name already covers its rooms", () => {
    testStore.activePlayer = {
      name: "Downstairs",
      player_id: "downstairs",
      type: "group",
      group_members: ["kitchen", "office"],
    };
    const button = mountPlayerButton();

    expect(button.find(".player-bar-player-count").exists()).toBe(false);
  });

  it("names the empty selection when no player is active", () => {
    const button = mountPlayerButton();

    expect(button.attributes("aria-label")).toBe(
      "tooltip.select_player: no_player",
    );
    expect(button.text()).toContain("no_player");
  });
});

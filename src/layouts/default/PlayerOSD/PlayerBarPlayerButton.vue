<template>
  <Button
    id="player-select-button"
    variant="ghost"
    :class="[
      navigation
        ? 'player-control-button mobile-navigation-item min-w-0 flex-1 px-1'
        : 'player-control-button player-bar-action player-bar-player-button h-9 min-w-0 gap-2 rounded-full px-3',
    ]"
    :data-active="store.showPlayersMenu"
    :data-suppress-hover="suppressHover"
    :aria-label="playerSelectLabel"
    :aria-expanded="store.showPlayersMenu"
    aria-haspopup="dialog"
    @click="togglePlayersMenu"
    @pointerenter="onPointerEnter"
  >
    <span
      :class="navigation ? 'mobile-navigation-icon' : 'player-bar-action-icon'"
    >
      <PlayerIcon
        :icon="store.activePlayer?.icon"
        :size="navigation ? 28 : 18"
        :stroke-width="navigation ? 1.4 : 1.8"
        :class="navigation ? 'size-7' : 'size-[18px]'"
      />
    </span>
    <span
      :class="
        navigation ? 'mobile-navigation-label' : 'player-bar-action-label'
      "
    >
      {{ playerName }}
    </span>
    <!-- the bar's pill says how many rooms are playing along with this one,
         and that it opens upwards into the room list -->
    <template v-if="!navigation">
      <span
        v-if="joinedRoomCount > 0"
        class="player-bar-player-count"
        aria-hidden="true"
      >
        +{{ joinedRoomCount }}
      </span>
      <ChevronUp
        class="player-bar-player-chevron size-3.5"
        :stroke-width="2"
        aria-hidden="true"
      />
    </template>
  </Button>
</template>

<script setup lang="ts">
import PlayerIcon from "@/components/PlayerIcon.vue";
import { Button } from "@/components/ui/button";
import { usePopoutTriggerHover } from "@/composables/usePopoutTriggerHover";
import { PlayerType } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { ChevronUp } from "@lucide/vue";
import { computed } from "vue";

const { suppressHover, onPointerEnter } = usePopoutTriggerHover(
  () => store.showPlayersMenu,
);
const playerName = computed(() => store.activePlayer?.name || $t("no_player"));
const playerSelectLabel = computed(
  () => `${$t("tooltip.select_player")}: ${playerName.value}`,
);

// Rooms synced to this one, which its name alone does not say. A group player
// is named for the rooms in it, so it has nothing to add. Counted here rather
// than through helpers/players, which would pull the router into the mobile
// navigation this button also sits in.
const joinedRoomCount = computed(() => {
  const player = store.activePlayer;
  if (!player?.group_members?.length || player.type === PlayerType.GROUP) {
    return 0;
  }
  return new Set(
    player.group_members.filter((playerId) => playerId !== player.player_id),
  ).size;
});

withDefaults(
  defineProps<{
    navigation?: boolean;
  }>(),
  {
    navigation: false,
  },
);

function togglePlayersMenu() {
  store.showPlayersMenu = !store.showPlayersMenu;
}
</script>

<style scoped>
.player-bar-player-count {
  flex: none;
  color: var(--subtle-foreground);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.player-bar-player-chevron {
  flex: none;
  color: var(--muted-foreground);
}
</style>

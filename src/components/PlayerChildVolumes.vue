<template>
  <div class="player-child-volumes">
    <Separator class="mt-2 mb-1.5" />
    <!-- one line per member: who it is, then its own slider and level -->
    <div
      v-for="player in players"
      :key="player.player_id"
      class="player-child-volume grid grid-cols-[30px_minmax(0,6.5rem)_minmax(0,1fr)] items-center gap-x-2"
      :class="{ 'opacity-50': player.powered === false }"
    >
      <span
        class="player-child-volume-icon flex h-6 w-[30px] shrink-0 items-center justify-center"
      >
        <PlayerIcon
          :icon="player.icon"
          :size="18"
          class="text-subtle-foreground"
        />
      </span>
      <span class="min-w-0">
        <span class="block truncate text-[12.5px] leading-4 font-semibold">
          {{ player.name }}
        </span>
        <span
          v-if="player.device_info?.model"
          class="text-subtle-foreground block truncate text-[11px] leading-4"
        >
          {{ player.device_info.model }}
        </span>
      </span>
      <PlayerVolume :player="player" :allow-wheel="allowWheel" width="100%" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayerIcon from "@/components/PlayerIcon.vue";
import { Separator } from "@/components/ui/separator";
import PlayerVolume from "@/layouts/default/PlayerOSD/PlayerVolume.vue";
import type { Player } from "@/plugins/api/interfaces";

defineProps<{
  players: Player[];
  allowWheel?: boolean;
}>();
</script>

<style scoped>
/* a player card pads its volume row in to make room for the step buttons
   either side of it; the member rows below span the full width again */
.player-child-volumes {
  margin-inline: calc(-1 * var(--player-card-volume-gutter, 0px));
}
</style>

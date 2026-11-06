<template>
  <!-- Header -->
  <v-container>
    <div v-if="props.playerId">
      <!-- Settable options -->
      <div v-if="playerOptionsSettable.length > 0">
        <v-card
          class="options-group mx-auto my-6"
          variant="flat"
          min-width="100%"
          :title="$t('player_options.settable', [playerName])"
        >
          <div class="options-rows">
            <div
              v-for="option in playerOptionsSettable"
              :key="option.key"
              class="option-row"
            >
              <PlayerOptionField
                :player-option="option"
                :player-id="props.playerId"
              />
            </div>
          </div>
        </v-card>
      </div>

      <!-- Read-only options -->
      <div v-if="playerOptionsReadOnly.length > 0">
        <v-card
          class="options-group mx-auto my-6"
          variant="flat"
          min-width="100%"
          :title="$t('player_options.read_only', [playerName])"
        >
          <div class="options-rows">
            <div
              v-for="option in playerOptionsReadOnly"
              :key="option.key"
              class="option-row"
            >
              <PlayerOptionField
                :player-option="option"
                :player-id="props.playerId"
              />
            </div>
          </div>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import api from "@/plugins/api";
import {
  EventType,
  PlayerOption,
  PlayerOptionType,
} from "@/plugins/api/interfaces";
import { onBeforeUnmount, computed, ref, watch } from "vue";
import PlayerOptionField from "./PlayerOptionField.vue";
import { $t } from "@/plugins/i18n";

// props
const props = defineProps<{
  playerId?: string;
}>();

// global refs
const playerName = ref<string>();
const playerOptions = ref<PlayerOption[]>([]);
const playerOptionsSettable = computed(() => {
  return playerOptions.value.filter((x) => !x.read_only);
});
const playerOptionsReadOnly = computed(() => {
  return playerOptions.value.filter((x) => x.read_only);
});

// Full load on entry
watch(
  () => props.playerId,
  async (val) => {
    if (val) {
      const player = await api.getPlayer(val);
      playerName.value = player.name;

      // sort for more consistency in UI experience
      const arrBool: PlayerOption[] = [];
      const arrNumber: PlayerOption[] = [];
      const arrString: PlayerOption[] = [];
      const arrSelect: PlayerOption[] = [];
      const arrSensor: PlayerOption[] = [];

      player.options.forEach((option) => {
        if (option.read_only) {
          arrSensor.push(option);
        } else if (option.options && option.options.length > 0) {
          arrSelect.push(option);
        } else if (option.type === PlayerOptionType.STRING) {
          arrString.push(option);
        } else if (option.type === PlayerOptionType.BOOLEAN) {
          arrBool.push(option);
        } else {
          arrNumber.push(option);
        }
      });

      playerOptions.value = [
        arrBool.sort((a, b) => a.key.localeCompare(b.key)),
        arrNumber.sort((a, b) => a.key.localeCompare(b.key)),
        arrString.sort((a, b) => a.key.localeCompare(b.key)),
        arrSelect.sort((a, b) => a.key.localeCompare(b.key)),
        arrSensor.sort((a, b) => a.key.localeCompare(b.key)),
      ].flat();
    }
  },
  { immediate: true },
);

// subscribe to option updates
const unsub = api.subscribe(
  EventType.PLAYER_OPTIONS_UPDATED,
  // data: [old , new ]
  (evt: { data: [PlayerOption[], PlayerOption[]] }) => {
    evt.data[1].forEach((updatedOption) => {
      const optionIndex = playerOptions.value.findIndex(
        (prevOption) => prevOption.key === updatedOption.key,
      );
      if (optionIndex === -1) {
        // option not yet present
        playerOptions.value.push(updatedOption);
        return;
      }
      playerOptions.value[optionIndex] = updatedOption;
    });
  },
  props.playerId,
);
onBeforeUnmount(unsub);
</script>

<style scoped>
/* a flat group: serif heading, options divided by hairlines */
.options-group {
  background: var(--card) !important;
  border: 1px solid var(--border);
  border-radius: 14px !important;
  box-shadow: none !important;
}

.options-group :deep(.v-card-item) {
  padding: 16px 20px 6px;
}

.options-group :deep(.v-card-title) {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.2;
  white-space: normal;
}

.option-row {
  padding: 12px 20px;
}

.option-row + .option-row {
  border-top: 1px solid var(--border);
}

.option-row :deep(.v-input__details:not(:has(.v-messages__message))) {
  display: none;
}

.option-row :deep(.v-field) {
  border-radius: 10px;
}

/* a switch reads as a setting: label left, control right */
.option-row :deep(.v-switch .v-selection-control) {
  flex-direction: row-reverse;
  justify-content: space-between;
  gap: 12px;
}

.option-row :deep(.v-selection-control .v-label) {
  flex: 1;
  min-width: 0;
  padding-inline-start: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--foreground);
  opacity: 1;
  white-space: normal;
}
</style>

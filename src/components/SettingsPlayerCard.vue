<template>
  <v-card
    class="flex-fill player-card"
    variant="flat"
    :class="{
      'player-disabled': !playerConfig.enabled,
      'player-unavailable': !isAvailable,
      'player-needs-setup': playerConfig.enabled && needsSetup,
    }"
    @click="handleClick"
  >
    <div class="card-content">
      <div class="card-header">
        <div class="player-icon-wrapper">
          <PlayerIcon :icon="player?.icon" :size="24" />
        </div>
        <div class="player-info">
          <div class="player-name">{{ playerName }}</div>
          <div class="provider-name">{{ providerName }}</div>
        </div>
        <v-btn
          icon="mdi-dots-vertical"
          size="small"
          variant="text"
          class="menu-btn"
          @click.stop="handleMenu"
        />
      </div>

      <!-- Player needs setup warning -->
      <div
        v-if="playerConfig.enabled && needsSetup"
        class="player-warning-card"
      >
        <div class="player-warning-inline">
          <v-icon icon="mdi-alert-circle" size="16" color="warning" />
          <span class="player-warning-text">{{
            $t("settings.player_needs_setup")
          }}</span>
        </div>
        <v-btn
          size="small"
          color="warning"
          variant="flat"
          block
          class="player-setup-btn mt-2"
          @click.stop="handleSetup"
        >
          {{ $t("settings.start_setup") }}
        </v-btn>
      </div>

      <div class="card-footer">
        <div class="protocol-chips">
          <ProtocolChip
            v-for="protocol in outputProtocols"
            :key="protocol.output_protocol_id"
            :protocol="protocol"
          />
        </div>
        <div class="status-icons">
          <v-icon
            v-if="!playerConfig.enabled"
            icon="mdi-cancel"
            size="16"
            color="grey"
            :title="$t('settings.player_disabled')"
          />
          <v-icon
            v-else-if="needsSetup"
            icon="mdi-alert-circle"
            size="16"
            color="warning"
            :title="$t('settings.player_needs_setup')"
          />
          <v-icon
            v-else-if="!isAvailable"
            icon="mdi-timer-sand"
            size="16"
            color="grey"
            :title="$t('settings.player_not_available')"
          />
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import ProtocolChip from "@/components/ProtocolChip.vue";
import PlayerIcon from "@/components/PlayerIcon.vue";
import { api } from "@/plugins/api";
import { PlayerConfig } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { computed } from "vue";

const props = defineProps<{
  playerConfig: PlayerConfig;
}>();

const emit = defineEmits<{
  (e: "click", playerConfig: PlayerConfig): void;
  (e: "menu", event: Event, playerConfig: PlayerConfig): void;
  (e: "setup", playerConfig: PlayerConfig): void;
}>();

const player = computed(() => api.players[props.playerConfig.player_id]);
const isAvailable = computed(() => player.value?.available ?? false);
const needsSetup = computed(() => player.value?.needs_setup ?? false);
const providerDomain = computed(
  () =>
    api.getProviderManifest(props.playerConfig.provider)?.domain ||
    props.playerConfig.provider,
);
const providerName = computed(() => {
  if (player.value?.device_info) {
    return `${player.value.device_info.manufacturer} / ${player.value.device_info.model}`;
  }
  return (
    api.getProviderManifest(props.playerConfig.provider)?.name ||
    props.playerConfig.provider
  );
});

const playerName = computed(() => {
  return (
    props.playerConfig.name ||
    player.value?.name ||
    props.playerConfig.default_name ||
    props.playerConfig.player_id
  );
});

const outputProtocols = computed(() => {
  // all output methods for this player, native included
  return player.value?.output_protocols || [];
});

const handleClick = () => {
  emit("click", props.playerConfig);
};

const handleMenu = (event: Event) => {
  emit("menu", event, props.playerConfig);
};

const handleSetup = () => {
  emit("setup", props.playerConfig);
};
</script>

<style scoped>
/* a flat tile in the players grid: hairline edge, no lift */
.player-card {
  background: var(--card) !important;
  border: 1px solid var(--border);
  border-radius: 14px !important;
  box-shadow: none !important;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.player-card:hover {
  border-color: color-mix(in oklab, var(--foreground) 16%, transparent);
}

.player-card :deep(.v-card__overlay) {
  display: none;
}

.player-disabled {
  opacity: 0.6;
}

.player-unavailable {
  opacity: 0.7;
}

.player-needs-setup {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-warning)) !important;
}

.player-warning-card {
  background: color-mix(in oklab, rgb(var(--v-theme-warning)) 9%, transparent);
  border-radius: 10px;
  margin: 10px 0 0 0;
  padding: 10px 12px;
}

.player-warning-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-warning));
}

.player-warning-text {
  font-size: 0.8125rem;
  font-weight: 500;
}

.player-setup-btn {
  border-radius: 999px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.card-content {
  display: flex;
  flex-direction: column;
  padding: 16px 16px 14px;
  height: 100%;
  min-height: 120px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--secondary);
  color: var(--foreground);
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-name {
  font-size: 0.78125rem;
  color: var(--muted-foreground);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-btn {
  flex-shrink: 0;
  align-self: flex-start;
  margin: -4px -8px 0 0;
  color: var(--muted-foreground);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
}

.protocol-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
}

.status-icons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>

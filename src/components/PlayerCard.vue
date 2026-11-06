<template>
  <Card
    v-hold="onHold"
    :class="cardClasses"
    @click.capture="swallowClickAfterHold"
    @contextmenu.prevent.stop="openPlayerMenu"
    @touchstart.passive="onTouchStart"
  >
    <!-- the artwork's own colour, washed in from the cover side: the only
         colour a card carries. The card isolates, so this sits above its
         surface and below everything else. -->
    <div
      v-if="artworkTint"
      aria-hidden="true"
      class="player-card-tint pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-[0.16] [--player-card-tint:var(--player-card-tint-light)] dark:opacity-[0.22] dark:[--player-card-tint:var(--player-card-tint-dark)]"
      :style="artworkTint"
    ></div>
    <Badge
      v-if="showSelectedIndicator && isActive"
      as="span"
      class="selected-player-badge absolute -top-2 left-3.5 z-10 h-[18px] rounded-full px-2 py-0 text-[10.5px] leading-none font-semibold tracking-[0.06em] uppercase shadow-none"
    >
      {{ $t("player_tip.selected_player") }}
    </Badge>
    <div class="flex min-w-0 items-center gap-2">
      <div class="relative flex min-w-0 flex-1 items-center gap-3.5">
        <button
          type="button"
          class="player-select-action focus-visible:ring-ring absolute inset-0 z-0 rounded-[10px] text-left outline-none focus-visible:ring-2"
          :disabled="
            (!player.available && !player.needs_setup) || isInformationalSource
          "
          @click="emit('click', player)"
        >
          <span class="sr-only">
            {{
              player.needs_setup
                ? $t("configure_player")
                : isInformationalSource
                  ? $t("player_type.source")
                  : $t("tooltip.select_player")
            }}:
            {{ accessiblePlayerLabel }}
            <template v-if="player.needs_setup">
              . {{ $t("settings.setup_required") }}
            </template>
            <template v-else-if="playerStatus">
              . {{ $t(playerStatus) }}
            </template>
          </span>
        </button>

        <!-- the cover, whole and square; an idle player shows its device on a
             rounded tile instead -->
        <div
          class="player-card-art pointer-events-none relative z-[1] flex size-14 shrink-0 items-center justify-center overflow-hidden"
          :class="
            artworkUrl
              ? 'bg-secondary rounded-[4px] shadow-[0_10px_22px_-12px_rgba(0,0,0,0.6)]'
              : 'bg-secondary text-subtle-foreground rounded-xl'
          "
        >
          <img
            v-if="artworkUrl"
            :src="artworkUrl"
            alt=""
            class="size-full object-cover"
            loading="lazy"
            @error="artworkFailed = true"
          />
          <PlayerIcon
            v-else
            :icon="player.icon"
            :grouped="
              player.type === PlayerType.PLAYER &&
              player.group_members.some(
                (playerId) => playerId !== player.player_id,
              )
            "
            :size="24"
          />
        </div>

        <div
          class="player-card-main pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col justify-center"
        >
          <PlayerCardTitle
            :player-name="cardPlayerName"
            :member-names="displayedGroupMemberNames"
            :member-layout="groupMemberLayout"
          >
            <PlayerDeviceBadge v-if="isBuiltinPlayer(player)" />
          </PlayerCardTitle>
          <div class="player-card-media-row min-w-0">
            <Badge
              v-if="player.needs_setup"
              variant="secondary"
              class="mt-1 gap-1 text-[10.5px]"
              :style="{ color: 'rgb(var(--v-theme-warning))' }"
            >
              <TriangleAlert class="size-3" />
              {{ $t("settings.setup_required") }}
            </Badge>
            <p
              v-if="player.type === PlayerType.SOURCE"
              class="text-muted-foreground mt-0.5 truncate text-[12.5px] leading-[18px]"
            >
              {{ $t("player_type.source") }}
            </p>

            <p
              v-if="stateKey === 'off'"
              class="player-card-status mt-1 leading-[18px]"
            >
              <span
                class="text-subtle-foreground ring-foreground/15 inline-flex h-[18px] items-center rounded-full px-[7px] text-[10.5px] font-semibold ring-1 ring-inset"
              >
                {{ $t("off") }}
              </span>
            </p>
            <p
              v-else-if="stateKey"
              class="player-card-status text-muted-foreground mt-0.5 truncate text-[12.5px] leading-[18px] first-letter:uppercase"
            >
              {{ $t(stateKey) }}
            </p>
            <!-- the selector sums the media up on one status line -->
            <p
              v-else-if="detailedLayout && hasMediaDetails"
              class="player-card-status text-muted-foreground mt-0.5 truncate text-[12.5px] leading-[18px]"
            >
              <template v-if="player.playback_state === PlaybackState.PAUSED">
                <span class="inline-block first-letter:uppercase">
                  {{ $t("state.paused") }}
                </span>
                ·
              </template>
              <span
                v-if="player.current_media?.title"
                class="text-foreground font-semibold"
              >
                {{ player.current_media.title }}
              </span>
              <template v-if="player.current_media?.title && statusByline">
                ·
              </template>
              {{ statusByline }}
            </p>
            <!-- elsewhere the playing track is named in the display serif -->
            <template v-else-if="hasMediaDetails">
              <p
                v-if="player.current_media?.title"
                class="player-card-track ma-display mt-0.5 truncate text-base leading-snug"
              >
                {{ player.current_media.title }}
              </p>
              <p
                v-if="mediaByline"
                class="text-muted-foreground truncate text-[12.5px] leading-[18px]"
              >
                {{ mediaByline }}
              </p>
            </template>

            <p
              v-if="detailedLayout && deviceDetails"
              class="player-card-device text-subtle-foreground mt-px truncate text-[11.5px] leading-4"
            >
              {{ deviceDetails }}
            </p>
          </div>
        </div>
      </div>

      <div class="player-card-actions flex shrink-0 items-center gap-0.5">
        <Button
          v-if="showsPowerAction"
          variant="ghost"
          size="icon"
          :class="ringedActionClass"
          :disabled="!player.available"
          :aria-label="$t('tooltip.toggle_power')"
          @click.stop="api.playerCommandPowerToggle(player.player_id)"
        >
          <Power class="size-4" />
        </Button>

        <Button
          v-if="canPlayPause"
          variant="ghost"
          :size="showsPowerAction ? 'icon-sm' : 'icon'"
          :class="showsPowerAction ? quietActionClass : ringedActionClass"
          :disabled="!player.available || playActionInProgress"
          :aria-label="
            player.playback_state === PlaybackState.PLAYING
              ? $t('pause')
              : $t('play')
          "
          @click.stop="api.playerCommandPlayPause(player.player_id)"
        >
          <Spinner v-if="playActionInProgress" class="size-4" />
          <Pause
            v-else-if="player.playback_state === PlaybackState.PLAYING"
            class="size-4"
          />
          <Play v-else class="size-4" />
        </Button>

        <Button
          v-if="showGroupControl"
          data-player-group-control
          variant="ghost"
          size="icon-sm"
          :class="quietActionClass"
          :disabled="!player.available || !canEditGroupMembers"
          :aria-label="`${$t('tooltip.group_members')}: ${groupMemberCount}`"
          :aria-controls="groupControlsExpanded ? groupControlsId : undefined"
          :aria-expanded="groupControlsExpanded"
          @click.stop="toggleMemberControls"
        >
          <PlayerGroupIcon
            :count="groupMemberCount"
            outset-count
            class="size-5"
          />
        </Button>

        <Button
          v-if="showMenuButton"
          variant="ghost"
          size="icon-sm"
          :class="quietActionClass"
          :disabled="!player.available"
          :aria-label="$t('tooltip.more_options')"
          @click.stop="openPlayerMenu"
        >
          <EllipsisVertical class="size-5" />
        </Button>
      </div>
    </div>

    <!-- the volume sits under the text, clear of the cover column; on a phone
         it takes the full width -->
    <div
      v-if="showVolumeControl || showMemberControls"
      class="player-card-volume relative mt-2.5"
      :class="{ 'pl-[70px]': !store.mobileLayout }"
      :style="{
        '--player-card-volume-gutter': showVolumeSteps
          ? largeVolumeSteps
            ? '48px'
            : '36px'
          : '0px',
      }"
    >
      <VolumeControl
        :id="showMemberControls ? groupControlsId : undefined"
        class="px-(--player-card-volume-gutter)"
        :player="player"
        :show-member-controls="player.available && showMemberControls"
        :show-child-volumes="player.available && showChildVolumes"
        :show-volume-control="showVolumeControl && player.powered !== false"
        :allow-wheel="false"
        @toggle-child-volumes="emit('toggle-child-volumes', player)"
      />
      <!-- step buttons for the slider's first row, which is a fixed 40px tall:
           a slider alone is hard to land on an exact level. The gutter they
           stand in is padded into the row above; the member lists below cancel
           it again. -->
      <div
        v-if="showVolumeSteps"
        class="pointer-events-none absolute top-0 right-0 flex h-10 items-center justify-between"
        :class="store.mobileLayout ? 'left-0' : 'left-[70px]'"
      >
        <button
          v-for="step in VOLUME_STEPS"
          :key="step.delta"
          type="button"
          class="player-card-volume-step text-muted-foreground hover:text-foreground focus-visible:ring-ring pointer-events-auto grid shrink-0 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40"
          :class="
            largeVolumeSteps
              ? 'bg-secondary size-11'
              : 'ring-foreground/15 hover:bg-foreground/5 size-7 ring-1 ring-inset'
          "
          :disabled="!canStepVolume"
          :aria-label="$t(step.label)"
          @click.stop="stepVolume(step.delta)"
        >
          <component
            :is="step.icon"
            :class="largeVolumeSteps ? 'size-4' : 'size-3.5'"
          />
        </button>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import PlayerCardTitle from "@/components/PlayerCardTitle.vue";
import PlayerDeviceBadge from "@/components/PlayerDeviceBadge.vue";
import PlayerGroupIcon from "@/components/PlayerGroupIcon.vue";
import PlayerIcon from "@/components/PlayerIcon.vue";
import VolumeControl from "@/components/VolumeControl.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useActiveSource } from "@/composables/activeSource";
import {
  getEventPosition,
  useHoldToOpenMenu,
} from "@/composables/useHoldToOpenMenu";
import { getPlayerMenuItems } from "@/helpers/player_menu_items";
import {
  canEditPlayerGroup,
  getPlayerGroupMemberCount,
  isBuiltinPlayer,
} from "@/helpers/players";
import { isQueueEnded } from "@/helpers/queue_position";
import { getMediaImageUrl, getPlayerName } from "@/helpers/utils";
import api from "@/plugins/api";
import { resolvePlayerQueue } from "@/plugins/api/helpers";
import {
  PlaybackState,
  type Player,
  PLAYER_CONTROL_NONE,
  PlayerFeature,
  PlayerType,
} from "@/plugins/api/interfaces";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import {
  EllipsisVertical,
  Minus,
  Pause,
  Play,
  Plus,
  Power,
  TriangleAlert,
} from "@lucide/vue";
import { computed, onBeforeUnmount, ref, toRef, watch } from "vue";

export interface Props {
  player: Player;
  showVolumeControl?: boolean;
  showMenuButton?: boolean;
  showChildVolumes?: boolean;
  showMemberControls?: boolean;
  showGroupControls?: boolean;
  showGroupMemberNames?: boolean;
  groupMemberLayout?: "subtitle" | "subtitle-list" | "title-list";
  stackMediaDetails?: boolean;
  allowPowerControl?: boolean;
  showDisabledGroupControl?: boolean;
  groupControlExpanded?: boolean;
  groupControlsId?: string;
  showSelectedIndicator?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  groupMemberLayout: "subtitle",
  groupControlsId: undefined,
});
const emit = defineEmits<{
  (event: "click", player: Player): void;
  (event: "toggle-child-volumes", player: Player): void;
  (event: "toggle-member-controls", player: Player, trigger: HTMLElement): void;
}>();

// the slider moves in steps of 2, so a press lands on the next notch either way
const VOLUME_STEP = 2;
const VOLUME_STEPS = [
  { delta: -VOLUME_STEP, icon: Minus, label: "tooltip.volume_down" },
  { delta: VOLUME_STEP, icon: Plus, label: "tooltip.volume_up" },
] as const;
// how long a press keeps building on the level it sent rather than on the one
// the server reports back, which lags a burst of presses
const VOLUME_STEP_SETTLE_MS = 1000;

const artworkFailed = ref(false);
const { activeSource } = useActiveSource(toRef(props, "player"));

const playerQueue = computed(() => resolvePlayerQueue(props.player));

const isActive = computed(
  () => props.player.player_id === store.activePlayerId,
);

// The selector asks for the detailed layout: its cards are zones in a list,
// summing the media up on one status line over the device it plays through.
// Elsewhere (the home shelf) a card names the playing track in the serif.
const detailedLayout = computed(() => props.stackMediaDetails === true);

// a set-up audio input can't be selected for playback; its row only informs
const isInformationalSource = computed(
  () => props.player.type === PlayerType.SOURCE && !props.player.needs_setup,
);

const cardClasses = computed(() => [
  "relative isolate gap-0 p-3.5 shadow-none transition-[background-color,border-color,box-shadow] duration-150",
  detailedLayout.value
    ? // a zone has no surface of its own until it is hovered or selected
      "rounded-2xl border-transparent bg-transparent hover:bg-foreground/5"
    : "rounded-[14px] hover:bg-secondary",
  isActive.value && "border-primary",
  isActive.value && detailedLayout.value && "bg-card hover:bg-card",
  // with the border underneath it, reads as one accent ring around the zone
  props.showSelectedIndicator &&
    isActive.value &&
    "ring-primary/50 pt-4 ring-1",
  !props.player.needs_setup && props.player.powered === false && "opacity-60",
  !props.player.available && !props.player.needs_setup && "opacity-40",
]);

const artworkUrl = computed(() => {
  if (
    artworkFailed.value ||
    props.player.powered === false ||
    !props.player.current_media?.image_url ||
    (props.player.playback_state !== PlaybackState.PLAYING &&
      props.player.playback_state !== PlaybackState.PAUSED)
  ) {
    return undefined;
  }
  return getMediaImageUrl(props.player.current_media.image_url);
});

function paletteColor(color: [number, number, number] | null | undefined) {
  return color ? `rgb(${color[0]} ${color[1]} ${color[2]})` : undefined;
}

// Paired the way the player bar pairs them: the shade meant for a dark
// background washes the light theme, the one meant for a light background the
// dark theme. Only while playing, so a paused room settles back to neutral.
const artworkTint = computed(() => {
  if (
    !artworkUrl.value ||
    props.player.playback_state !== PlaybackState.PLAYING
  ) {
    return undefined;
  }
  const palette = props.player.current_media?.palette;
  const lightTheme = paletteColor(palette?.on_dark);
  const darkTheme = paletteColor(palette?.on_light);
  if (!lightTheme && !darkTheme) return undefined;
  return {
    "--player-card-tint-light": lightTheme ?? darkTheme,
    "--player-card-tint-dark": darkTheme ?? lightTheme,
  };
});

const mediaByline = computed(() =>
  [props.player.current_media?.artist, props.player.current_media?.album]
    .filter(Boolean)
    .join(" • "),
);

// one line has room for the artist, or whatever names the stream without one
const statusByline = computed(
  () => props.player.current_media?.artist || props.player.current_media?.album,
);

const hasMediaDetails = computed(
  () =>
    props.player.powered !== false &&
    Boolean(props.player.current_media?.title || mediaByline.value),
);

// what the card says in place of media it has nothing of; a player awaiting
// setup or an audio input already says what it is
const stateKey = computed(() => {
  if (props.player.needs_setup || props.player.type === PlayerType.SOURCE) {
    return undefined;
  }
  if (props.player.powered === false) return "off";
  if (!props.player.available) return "settings.player_status.unavailable";
  if (hasMediaDetails.value) return undefined;
  if (props.player.playback_state === PlaybackState.PLAYING) {
    return "state.playing";
  }
  if (props.player.playback_state === PlaybackState.PAUSED) {
    return "state.paused";
  }
  return playerStatus.value ?? "state.idle";
});

// the protocol a player is reached over: the output it is playing through, or
// the provider that brings it in
const protocolName = computed(() => {
  const activeProtocol = props.player.output_protocols?.find(
    (protocol) =>
      !protocol.is_native &&
      protocol.output_protocol_id === props.player.active_output_protocol,
  );
  return activeProtocol?.name ?? api.getProviderName(props.player.provider);
});

const deviceDetails = computed(() => {
  const parts: string[] = [];
  for (const part of [props.player.device_info?.model, protocolName.value]) {
    const label = part?.trim();
    if (
      label &&
      !parts.some(
        (existing) =>
          existing.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    ) {
      parts.push(label);
    }
  }
  return parts.join(" · ");
});

const canPlayPause = computed(
  () => activeSource.value?.can_play_pause === true,
);

const showsPowerAction = computed(
  () =>
    props.player.power_control !== PLAYER_CONTROL_NONE &&
    props.allowPowerControl === true &&
    !props.player.powered,
);

// the zone's one primary action - power while it is off, play/pause otherwise -
// is a round button in a hairline ring that inverts under the pointer
const ringedActionClass =
  "ring-foreground/15 hover:bg-foreground hover:text-background dark:hover:bg-foreground size-[38px] ring-1 ring-inset";
const quietActionClass = "text-muted-foreground hover:text-foreground";

const playActionInProgress = computed(
  () =>
    api.queues[props.player.player_id]?.extra_attributes
      ?.play_action_in_progress === true,
);

const canEditGroupMembers = computed(
  () => props.showGroupControls && canEditPlayerGroup(props.player),
);
const showGroupControl = computed(
  () =>
    props.showGroupControls &&
    (canEditGroupMembers.value || props.showDisabledGroupControl === true),
);
const groupControlsExpanded = computed(
  () => props.groupControlExpanded ?? props.showMemberControls === true,
);

const groupMemberCount = computed(() =>
  getPlayerGroupMemberCount(props.player),
);

const groupMemberNames = computed(() => {
  if (!props.showGroupMemberNames) return [];

  const childNames = [...new Set(props.player.group_members)]
    .filter((playerId) => playerId !== props.player.player_id)
    .map((playerId) => api.players[playerId])
    .filter(
      (member): member is Player =>
        Boolean(member) &&
        (props.player.type === PlayerType.GROUP || member.available),
    )
    .map((member) => member.name);

  if (childNames.length === 0 || props.player.type === PlayerType.GROUP) {
    return childNames;
  }
  return [props.player.name, ...childNames];
});

const cardPlayerName = computed(() =>
  props.groupMemberLayout === "subtitle-list" &&
  groupMemberNames.value.length > 0
    ? props.player.name
    : getPlayerName(props.player, 27),
);

const displayedGroupMemberNames = computed(() => {
  if (
    props.groupMemberLayout === "subtitle-list" &&
    props.player.type !== PlayerType.GROUP
  ) {
    return groupMemberNames.value.slice(1);
  }
  return groupMemberNames.value;
});

const accessibleGroupMemberNames = computed(() =>
  props.player.type !== PlayerType.GROUP &&
  props.groupMemberLayout !== "subtitle-list"
    ? displayedGroupMemberNames.value.slice(1)
    : displayedGroupMemberNames.value,
);

const accessiblePlayerLabel = computed(() =>
  [
    props.player.name,
    ...accessibleGroupMemberNames.value,
    props.player.current_media?.title,
    mediaByline.value,
  ]
    .filter(Boolean)
    .join(". "),
);

const playerStatus = computed(() => {
  if (mediaByline.value) return undefined;
  if (isQueueEnded(playerQueue.value)) return "queue_ended";
  if (playerQueue.value?.items === 0) return "queue_empty";
  return undefined;
});

// --- Volume steps ---
// They drive the same level the slider beside them does, through the same
// commands: the group's while the player leads a group, its own otherwise.

const usesGroupVolume = computed(() =>
  props.player.type === PlayerType.GROUP
    ? props.player.group_members.length > 0
    : props.player.group_members.some(
        (playerId) => playerId !== props.player.player_id,
      ),
);

const currentVolume = computed(() =>
  Math.round(
    (usesGroupVolume.value
      ? props.player.group_volume
      : props.player.volume_level) ?? 0,
  ),
);

const volumeMuted = computed(() =>
  usesGroupVolume.value
    ? props.player.group_volume_muted === true
    : props.player.volume_muted === true,
);

// the slider row only renders for a powered player
const showVolumeSteps = computed(
  () => props.showVolumeControl === true && props.player.powered !== false,
);

// a muted slider is locked, and the steps follow it rather than unmute by stealth
const canStepVolume = computed(
  () =>
    props.player.available &&
    props.player.supported_features.includes(PlayerFeature.VOLUME_SET) &&
    !volumeMuted.value,
);

// a finger needs the full 44px target
const largeVolumeSteps = computed(
  () => store.mobileLayout === true || store.isTouchscreen === true,
);

let pendingVolume: number | undefined;
let pendingVolumeTimeout: ReturnType<typeof setTimeout> | undefined;

function stepVolume(delta: number) {
  if (!canStepVolume.value) return;
  const volume = Math.min(
    100,
    Math.max(0, (pendingVolume ?? currentVolume.value) + delta),
  );
  pendingVolume = volume;
  clearTimeout(pendingVolumeTimeout);
  pendingVolumeTimeout = setTimeout(() => {
    pendingVolume = undefined;
  }, VOLUME_STEP_SETTLE_MS);
  if (usesGroupVolume.value) {
    api.playerCommandGroupVolume(props.player.player_id, volume);
  } else {
    void api.playerCommandVolumeSet(props.player.player_id, volume);
  }
}

onBeforeUnmount(() => clearTimeout(pendingVolumeTimeout));

watch(
  () => props.player.current_media?.image_url,
  () => {
    artworkFailed.value = false;
  },
);

watch(
  () => props.player.player_id,
  () => {
    pendingVolume = undefined;
  },
);

function openPlayerMenu(event: Event) {
  event.stopPropagation();
  if (!props.player.available) return;
  const position = getEventPosition(event);
  eventbus.emit("contextmenu", {
    items: getPlayerMenuItems(props.player, playerQueue.value, {
      context: "player",
    }),
    posX: position.x,
    posY: position.y,
  });
}

function toggleMemberControls(event: MouseEvent) {
  const trigger = event.currentTarget;
  if (trigger instanceof HTMLElement) {
    emit("toggle-member-controls", props.player, trigger);
  }
}

const { onHold, onTouchStart, swallowClickAfterHold } =
  useHoldToOpenMenu(openPlayerMenu);
</script>

<style scoped>
.player-card-tint {
  background: radial-gradient(
    circle at 20% 50%,
    var(--player-card-tint),
    transparent 70%
  );
  filter: saturate(1.4);
}
</style>

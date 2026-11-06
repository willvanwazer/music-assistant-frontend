<template>
  <EditorialMediaCard
    fluid
    class="lib-card"
    :class="{ 'lib-card--round': item.media_type === MediaType.ARTIST }"
    :item="item"
    :is-available="isAvailable"
    :is-selected="isSelected"
    :show-checkboxes="showCheckboxes"
    :is-playing="isPlaying"
    :disable-play-button="disablePlayButton"
    :parent-item="parentItem"
    :sort-by="sortBy"
    @select="(i, selected) => emit('select', i as MediaItemType, selected)"
  >
    <template v-if="showActions" #actions>
      <div class="panel-item-actions" @click.stop>
        <v-icon
          v-if="
            'metadata' in item && parseBool(item.metadata.explicit || false)
          "
          size="18"
          icon="mdi-alpha-e-box"
          class="panel-item-explicit"
        />
        <!-- hi-res: a micro tag on the cover, its details on hover -->
        <span v-if="HiResDetails && !showCheckboxes" class="lib-card__hires">
          {{ $t("streamdetails.audio_processing.quality.hi_res") }}
          <v-tooltip activator="parent" location="bottom">
            {{ HiResDetails }}
          </v-tooltip>
        </span>
        <!-- disc/track number-->
        <span
          v-if="showTrackNumber && 'track_number' in item && item.track_number"
          class="track-no"
        >
          <v-icon size="14" icon="mdi-music-circle-outline" />
          <span v-if="item.disc_number">{{ item.disc_number }}/</span
          >{{ item.track_number }}
        </span>
        <!-- position-->
        <span v-else-if="'position' in item && item.position" class="track-no">
          <v-icon size="14" icon="mdi-music-circle-outline" />
          {{ item.position }}
        </span>
        <v-spacer />
        <FavouriteButton
          v-if="getBreakpointValue('bp3') && 'favorite' in item"
          :item="item"
          class="panel-item-fav"
        />
        <!-- the menu: a small round button in the cover's top corner -->
        <MAButton
          variant="list"
          icon="mdi-dots-vertical"
          class="lib-card__more"
          :aria-label="$t('tooltip.show_context_menu')"
          @click.stop="onMenu"
        />
      </div>
    </template>
  </EditorialMediaCard>
</template>

<script setup lang="ts">
import MAButton from "@/components/Button.vue";
import EditorialMediaCard from "@/components/discover/EditorialMediaCard.vue";
import FavouriteButton from "@/components/FavoriteButton.vue";
import { handleMenuBtnClick } from "@/helpers/media_item_actions";
import { parseBool } from "@/helpers/parse";
import {
  ContentType,
  MediaType,
  type MediaItemType,
} from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { computed } from "vue";

export interface Props {
  item: MediaItemType;
  size?: number;
  isSelected: boolean;
  showCheckboxes?: boolean;
  showMediaType?: boolean;
  showActions?: boolean;
  showTrackNumber?: boolean;
  isAvailable?: boolean;
  isPlaying?: boolean;
  disablePlayButton?: boolean;
  parentItem?: MediaItemType;
  sortBy?: string;
}
const compProps = withDefaults(defineProps<Props>(), {
  size: 200,
  showCheckboxes: false,
  showActions: false,
  showTrackNumber: false,
  showMediaType: false,
  isAvailable: true,
  disablePlayButton: false,
  parentItem: undefined,
  sortBy: undefined,
});

const emit = defineEmits<{
  (e: "select", item: MediaItemType, selected: boolean): void;
}>();

// computed: hi-res audio details (kHz/bit-depth) for lossless formats
const HiResDetails = computed(() => {
  if (!("provider_mappings" in compProps.item)) return "";
  for (const prov of compProps.item.provider_mappings) {
    if (prov.audio_format.content_type == undefined) continue;
    if (
      ![
        ContentType.DSF,
        ContentType.FLAC,
        ContentType.AIFF,
        ContentType.WAV,
      ].includes(prov.audio_format.content_type)
    )
      continue;
    if (
      prov.audio_format.sample_rate > 48000 ||
      prov.audio_format.bit_depth > 16
    ) {
      return `${prov.audio_format.sample_rate / 1000}kHz ${
        prov.audio_format.bit_depth
      } bits`;
    }
  }
  return "";
});

const onMenu = function (evt: MouseEvent) {
  handleMenuBtnClick(
    compProps.item,
    evt.clientX,
    evt.clientY,
    compProps.parentItem,
    true,
    compProps.sortBy,
  );
};
</script>

<style scoped>
/* In a library grid the card is just the cover and the text beneath it: no
   padding of its own, so the grid's gaps set the rhythm. The card is the
   container its corner overlays are measured against. */
.lib-card.ed-card {
  --ed-card-pad: 0px;
  --lib-card-inset: 8px;
  container-type: inline-size;
}

/* people are round portraits, with the corners pulled inside the circle */
.lib-card--round.ed-card {
  --lib-card-inset: calc(14.6cqw - 12px);
}

.lib-card--round.ed-card :deep(.ed-card__art) {
  border-radius: 50%;
}

/* a quiet row under the text: explicit flag, track number, favourite */
.panel-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  margin-top: 4px;
  color: var(--subtle-foreground);
}

.panel-item-explicit {
  color: var(--subtle-foreground);
}

.track-no {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--subtle-foreground);
}

.panel-item-fav {
  width: 16px;
  height: 16px;
}

/* corner overlays sit on the cover, which is square from the card's top */
.lib-card__hires {
  position: absolute;
  top: var(--lib-card-inset);
  left: var(--lib-card-inset);
  z-index: 4;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  /* on the artwork, so white on a dark scrim */
  color: #fff;
  background: rgb(0 0 0 / 0.55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.lib-card.ed-card :deep(.lib-card__more) {
  position: absolute;
  top: var(--lib-card-inset);
  right: var(--lib-card-inset);
  z-index: 4;
  width: 30px;
  height: 30px;
  min-width: 0;
  padding: 0;
  border-radius: 50%;
  color: #fff;
  background: rgb(0 0 0 / 0.45);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  opacity: 1;
}

.lib-card.ed-card :deep(.lib-card__more .v-icon) {
  font-size: 18px;
}

/* with a pointer the menu button and an unset heart wait for the hover;
   a touch screen keeps them in view */
@media (hover: hover) {
  .lib-card.ed-card :deep(.lib-card__more) {
    opacity: 0;
    transition: opacity 0.18s ease;
  }

  .lib-card.ed-card:hover :deep(.lib-card__more),
  .lib-card.ed-card:focus-within :deep(.lib-card__more) {
    opacity: 1;
  }

  .lib-card.ed-card :deep(.panel-item-fav:not(.favorite-icon--on)) {
    opacity: 0;
  }

  .lib-card.ed-card:hover :deep(.panel-item-fav:not(.favorite-icon--on)),
  .lib-card.ed-card :deep(.panel-item-fav:focus-visible) {
    opacity: 0.7;
  }

  .lib-card.ed-card :deep(.panel-item-fav:hover) {
    opacity: 1;
  }
}
</style>

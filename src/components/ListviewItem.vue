<!-- eslint-disable vue/no-template-shadow -->
<template>
  <ListItem
    link
    :show-menu-btn="showMenu"
    :class="{
      unavailable: !isAvailable,
      'listitem-selecting': showCheckboxes,
      'album-track-row': albumTrackView,
      'listview-row': true,
      'listview-row--playing': isPlaying,
      'listview-row--round': item.media_type == MediaType.ARTIST,
    }"
    @click.stop="onClick"
    @menu.stop="onMenu"
  >
    <template #prepend>
      <div v-if="showCheckboxes" class="flex items-center space-x-2 checkbox">
        <Checkbox
          :id="`listviewitem-checkbox-${item.item_id}`"
          :model-value="isSelected"
          @click.stop
          @update:model-value="
            (x: boolean | 'indeterminate') => {
              if (x != 'indeterminate') emit('select', item, x);
            }
          "
        />
        <label :for="`listviewitem-checkbox-${item.item_id}`">
          <ListviewItemTitle
            :display-name="displayName"
            :item="item"
            :show-checkboxes="showCheckboxes"
            :is-playing="isPlaying"
          />
        </label>
      </div>
      <div v-else class="listitem-prepend">
        <!-- ===== TOUCH (phone/tablet): number / art stay on the left; play moves to the right (see #append) ===== -->
        <template v-if="isTouch">
          <!-- album view: the playing track shows the equaliser in its place -->
          <div
            v-if="albumTrackView && isPlaying"
            class="track-number track-number--playing"
          >
            <NowPlayingBadge :show-badge="false" />
            <span class="sr-only">{{ $t("now_playing") }}</span>
          </div>
          <div
            v-else-if="
              albumTrackView &&
              showTrackNumber &&
              'track_number' in item &&
              item.track_number
            "
            class="track-number"
          >
            {{ item.track_number }}
          </div>
          <div
            v-else-if="!albumTrackView"
            class="media-thumb listitem-media-thumb"
          >
            <div
              v-if="
                item.media_type == MediaType.COLLECTION && item != undefined
              "
            >
              <MediaCollectionThumb
                size="44"
                :item="item as MediaCollection<MediaItemType>"
                :thumb-offset="5"
              />
            </div>
            <div v-else>
              <MediaItemThumb
                size="44"
                :item="isAvailable ? item : undefined"
                alt=""
              />
            </div>
          </div>
        </template>
        <!-- ===== DESKTOP (hover-capable): blue play reveals on hover ===== -->
        <!-- the click lives on the (always hit-testable) slot, not on the
             hover-revealed disc: gating clicks on :hover-driven pointer-events
             drops them whenever the browser invalidates the hover chain (e.g.
             a row re-render under a stationary mouse), sending the click to
             the row instead -->
        <template v-else>
          <!-- album view: track number that swaps to the play on hover; the
               playing track shows the equaliser in its place -->
          <div
            v-if="albumTrackView"
            class="track-number-play"
            :class="{ 'is-playable': item.is_playable }"
            @click="onPlayAreaClick"
          >
            <div v-if="isPlaying" class="track-number track-number--playing">
              <NowPlayingBadge :show-badge="false" />
              <span class="sr-only">{{ $t("now_playing") }}</span>
            </div>
            <div
              v-else-if="
                showTrackNumber && 'track_number' in item && item.track_number
              "
              class="track-number"
            >
              {{ item.track_number }}
            </div>
            <span v-if="item.is_playable" class="listitem-play-blue">
              <Play :size="16" fill="currentColor" :stroke-width="0" />
            </span>
          </div>
          <!-- other rows: blue play overlays the art on hover -->
          <div v-else class="listitem-thumb-area">
            <div
              class="media-thumb listitem-media-thumb"
              :class="{ 'is-playable': item.is_playable }"
              @click="onPlayAreaClick"
            >
              <div
                v-if="
                  item.media_type == MediaType.COLLECTION && item != undefined
                "
              >
                <MediaCollectionThumb
                  size="44"
                  :item="item as MediaCollection<MediaItemType>"
                  :thumb-offset="5"
                />
              </div>
              <div v-else>
                <MediaItemThumb
                  size="44"
                  :item="isAvailable ? item : undefined"
                  alt=""
                />
              </div>
              <span v-if="item.is_playable" class="listitem-play-blue">
                <Play :size="16" fill="currentColor" :stroke-width="0" />
              </span>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- title -->
    <template v-if="!showCheckboxes" #title>
      <ListviewItemTitle
        :display-name="displayName"
        :item="item"
        :show-checkboxes="showCheckboxes"
        :is-playing="isPlaying"
      />
    </template>

    <!-- subtitle -->
    <template #subtitle>
      <!-- album track view: only show collaborating artist(s), if any -->
      <template v-if="albumTrackView">
        <div v-if="collabArtists" class="ma-line-clamp-1">
          {{ $t("with_artists", { artists: collabArtists }) }}
        </div>
      </template>
      <!-- track: artists(s) + album (check for provider_mappings to filter out ItemMapping) -->
      <div
        v-else-if="
          item.media_type == MediaType.TRACK && 'provider_mappings' in item
        "
        class="ma-line-clamp-1"
      >
        <v-item-group>
          <v-item v-if="'artists' in item">
            {{ getArtistsString(item.artists, 2) }}
          </v-item>
          <v-item v-if="showAlbum && 'album' in item && item.album">
            • {{ item.album.name
            }}<span v-if="'year' in item.album && item.album.year">
              • {{ item.album.year }}</span
            >
          </v-item>
          <v-item
            v-if="showDiscNumber && 'disc_number' in item && item.disc_number"
          >
            <v-icon style="margin-left: 5px" icon="md:album" />
            {{ item.disc_number }}
          </v-item>
        </v-item-group>
      </div>

      <!-- album: albumtype + artists + year -->
      <div v-else-if="item.media_type == MediaType.ALBUM && 'year' in item">
        <span v-if="item.album_type != AlbumType.UNKNOWN"
          >{{ $t("album_type." + item.album_type) }} •
        </span>
        <span>{{ getArtistsString(item.artists) }}</span>
        <span v-if="item.year"> • {{ item.year }}</span>
      </div>
      <!-- track/album fallback: artist present -->
      <div v-else-if="'artists' in item && item.artists">
        {{ getArtistsString(item.artists) }}
      </div>
      <!-- playlist owner -->
      <div v-else-if="'owner' in item && item.owner">
        {{ item.owner }}
      </div>
      <!-- audiobook author(s) -->
      <div v-else-if="'authors' in item && item.authors">
        {{ getAuthorsNarratorsArray(item.authors).join(" / ") }}
      </div>
      <!-- audiobook publisher -->
      <div v-else-if="'publisher' in item && item.publisher">
        {{ item.publisher }}
      </div>
      <div v-else-if="item.media_type == MediaType.COLLECTION">
        {{ $t("collection") }}
      </div>
      <!-- description -->
      <div
        v-else-if="
          'metadata' in item &&
          item.metadata?.description &&
          [MediaType.RADIO, MediaType.PLAYLIST].includes(item.media_type)
        "
      >
        {{ truncateString(item.metadata.description, 150) }}
      </div>
      <!-- media type label -->
      <div v-else-if="!('provider_mappings' in item)">
        {{ $t(item.media_type) }}
      </div>
    </template>

    <!-- actions -->
    <template #append>
      <!-- Now Playing Badge (the album view shows it in the number's place) -->
      <NowPlayingBadge
        v-if="isPlaying && !albumTrackView"
        :show-badge="getBreakpointValue('bp7')"
      />
      <!-- hi res: a micro tag, its details on hover -->
      <span
        v-if="HiResDetails && getBreakpointValue('bp3')"
        class="listitem-hires"
      >
        {{ $t("streamdetails.audio_processing.quality.hi_res") }}
        <v-tooltip activator="parent" location="bottom">
          {{ HiResDetails }}
        </v-tooltip>
      </span>

      <!-- track duration (laid out last, right-aligned); phones keep it too,
           as a track list without lengths reads as unfinished -->
      <span
        v-if="showDuration && 'duration' in item && item.duration"
        class="track-duration"
      >
        {{ formatDuration(item.duration) }}
      </span>

      <!-- provider icon -->
      <provider-icon
        v-if="getBreakpointValue('bp2') && showProvider"
        :domain="getListItemProviderIconDomain(item)"
        :size="20"
        class="mx-[10px]"
      />

      <!-- fully played or in progress icon -->
      <!-- only used for podcast-episodes and audiobook-chapters -->
      <v-icon
        v-if="'fully_played' in item && item.fully_played"
        :title="$t('item_fully_played')"
        size="small"
        class="listitem-status-icon"
        >mdi-check</v-icon
      >
      <v-icon
        v-else-if="'resume_position_ms' in item && item.resume_position_ms"
        :title="$t('item_in_progress')"
        size="small"
        class="listitem-status-icon"
        >mdi-clock-fast</v-icon
      >

      <!-- favorite (heart) icon -->
      <div
        v-if="
          getBreakpointValue('bp3') &&
          'favorite' in item &&
          showFavorite &&
          item.media_type != MediaType.COLLECTION &&
          !$vuetify.display.mobile
        "
        class="favorite-button-wrapper"
      >
        <FavouriteButton :item="item" />
      </div>

      <!-- touch devices: play button on the right, just left of the ⋮ menu, so
           tapping the album art never triggers (possibly remote) playback -->
      <v-btn
        v-if="isTouch && item.is_playable"
        icon
        variant="text"
        size="small"
        class="listitem-mobile-play"
        :disabled="disablePlayButton"
        @click.stop="onPlayClick"
      >
        <span class="listitem-play-blue-mobile">
          <Play :size="11" fill="currentColor" :stroke-width="0" />
        </span>
      </v-btn>
    </template>
  </ListItem>
</template>

<script setup lang="ts">
import FavouriteButton from "@/components/FavoriteButton.vue";
import ListItem from "@/components/ListItem.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import {
  handleMediaItemClick,
  handleMenuBtnClick,
  handlePlayBtnClick,
} from "@/helpers/media_item_actions";
import {
  formatDuration,
  getArtistsString,
  getAuthorsNarratorsArray,
  truncateString,
} from "@/helpers/utils";
import { getListItemProviderIconDomain } from "@/plugins/api/helpers";
import {
  AlbumType,
  ContentType,
  MediaType,
  type MediaCollection,
  type MediaItemType,
} from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { useMediaQuery } from "@vueuse/core";
import { Play } from "@lucide/vue";
import { computed } from "vue";
import { VTooltip } from "vuetify/components";
import MediaItemThumb from "./MediaItemThumb.vue";
import ProviderIcon from "./ProviderIcon.vue";

import { Checkbox } from "@/components/ui/checkbox";
import ListviewItemTitle from "./ListviewItemTitle.vue";
import MediaCollectionThumb from "./MediaCollectionThumb.vue";

// properties
export interface Props {
  item: MediaItemType;
  albumTrackView?: boolean;
  showTrackNumber?: boolean;
  showDiscNumber?: boolean;
  showProvider?: boolean;
  showAlbum?: boolean;
  showMenu?: boolean;
  showFavorite?: boolean;
  showDuration?: boolean;
  isSelected: boolean;
  isDisabled?: boolean;
  isAvailable?: boolean;
  isPlaying?: boolean;
  showCheckboxes?: boolean;
  showDetails?: boolean;
  disablePlayButton?: boolean;
  parentItem?: MediaItemType;
  sortBy?: string;
}

// touch devices (phones + tablets like iPad) can't hover, so they get an
// explicit play button; only hover-capable desktops use the hover-reveal play.
const isTouch = useMediaQuery("(hover: none)");

const displayName = computed(() => compProps.item.name);

const compProps = withDefaults(defineProps<Props>(), {
  albumTrackView: false,
  showTrackNumber: true,
  showDiscNumber: true,
  showProvider: true,
  showAlbum: true,
  showMenu: true,
  showFavorite: false,
  showDuration: true,
  showCheckboxes: false,
  disablePlayButton: false,
  isDisabled: false,
  isAvailable: true,
  parentItem: undefined,
  sortBy: undefined,
});

// computed properties
const collabArtists = computed(() => {
  if (!("artists" in compProps.item) || !compProps.item.artists) return "";
  const albumArtists =
    compProps.parentItem && "artists" in compProps.parentItem
      ? compProps.parentItem.artists
      : [];
  const albumNames = new Set(albumArtists.map((a) => a.name.toLowerCase()));
  const collab = compProps.item.artists.filter(
    (a) => !albumNames.has(a.name.toLowerCase()),
  );
  return collab.map((a) => a.name).join(" | ");
});

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

// emits
const emit = defineEmits<{
  (e: "select", item: MediaItemType, selected: boolean): void;
}>();

const onMenu = function (evt: Event) {
  const mouseEvt = evt as MouseEvent;
  handleMenuBtnClick(
    compProps.item,
    mouseEvt.clientX,
    mouseEvt.clientY,
    compProps.parentItem,
    true,
    compProps.sortBy,
  );
};

const onClick = function (evt: Event) {
  if (compProps.showCheckboxes) return;
  const mouseEvt = evt as MouseEvent;
  handleMediaItemClick(
    compProps.item,
    mouseEvt.clientX,
    mouseEvt.clientY,
    compProps.parentItem,
  );
};

// non-playable rows fall through to the row click (navigation)
const onPlayAreaClick = function (evt: PointerEvent) {
  if (!compProps.item.is_playable) return;
  evt.stopPropagation();
  onPlayClick(evt);
};

const onPlayClick = function (evt: PointerEvent) {
  if (compProps.showCheckboxes) return;
  handlePlayBtnClick(
    compProps.item,
    evt.clientX,
    evt.clientY,
    compProps.parentItem,
    undefined,
    compProps.sortBy,
  );
};
</script>

<style scoped>
/* ----------------------------------------------------------------- row */

/* ~54px rows with a soft corner; the hover is vuetify's faint overlay */
.list-item-main.listview-row {
  min-height: 54px;
  padding: 5px 4px 5px 10px !important;
  margin-right: 0 !important;
  border-radius: 9px !important;
}

/* the playing row: a soft wash of the accent (its title turns accent too) */
.list-item-main.listview-row--playing {
  background: color-mix(in oklab, var(--primary) 14%, transparent);
}

.list-item-main.listitem-selecting {
  padding: 7px 0 !important;
}

.checkbox {
  margin-left: 20px;
}

.unavailable {
  opacity: 0.3;
}

.listview-row :deep(.v-list-item-subtitle) {
  margin-top: 2px;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--subtle-foreground);
  opacity: 1;
}

.listitem-prepend {
  display: flex;
  align-items: center;
}

/* ------------------------------------------------------ number and art */

/* the number column: right-aligned, tabular, quiet */
.track-number {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 24px;
  /* spacing after the number so the title isn't cramped on mobile;
     desktop resets this to 0 via .track-number-play > .track-number */
  margin-right: 16px;
  font-size: 13px;
  color: var(--subtle-foreground);
  font-variant-numeric: tabular-nums;
  transition: opacity 0.18s ease;
}

.track-number--playing :deep(.now-playing-icon) {
  margin: 0;
}

/* album view: track number and play button share one slot */
.track-number-play {
  display: flex;
  align-items: center;
}

/* other rows: album art with the outline play to its right on touch */
.listitem-thumb-area {
  display: flex;
  align-items: center;
}

.listitem-media-thumb {
  position: relative;
}

.listview-row .listitem-media-thumb {
  width: 44px;
  height: 44px;
  margin-right: 12px;
}

/* covers keep a small radius; people are round */
.listview-row .listitem-media-thumb :deep(.v-img) {
  border-radius: 3px !important;
  transition: filter 0.15s ease;
}

.listview-row--round .listitem-media-thumb :deep(.v-img) {
  border-radius: 50% !important;
}

/* accent play button: desktop hover only */
.listitem-play-blue {
  display: none;
}

/* mobile: tighten the gap between the play button and the ⋮ menu */
.listitem-mobile-play {
  margin-right: -10px;
}

/* mobile: small accent play disc on the right, sized to match the old icon */
.listitem-play-blue-mobile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-foreground);
}

@media (hover: hover) {
  /* the disc is purely visual; its parent slot handles the click */
  .listitem-play-blue {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: var(--primary);
    color: var(--primary-foreground);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease;
  }

  .track-number-play.is-playable,
  .listitem-media-thumb.is-playable {
    cursor: pointer;
  }

  /* album view: overlay the number and the play in one cell. The extra right
     margin (more breathing room for the title) is desktop-only and exclusive
     to this view, where the prepend is just the narrow slot. */
  .track-number-play {
    display: grid;
    place-items: center end;
    min-width: 28px;
    margin-right: 14px;
  }

  .track-number-play > .track-number,
  .track-number-play > .listitem-play-blue {
    grid-area: 1 / 1;
  }

  .track-number-play > .track-number {
    margin-right: 0;
  }

  /* in the number column the play is a plain glyph, like the number it
     replaces */
  .track-number-play > .listitem-play-blue {
    justify-self: center;
    background: transparent;
    color: var(--foreground);
  }

  .list-item-main:hover .track-number-play.is-playable > .track-number {
    opacity: 0;
  }

  /* other rows: the play overlays the dimmed album art on row hover */
  .listitem-media-thumb .listitem-play-blue {
    position: absolute;
    inset: 0;
    margin: auto;
    z-index: 1;
  }

  .list-item-main:hover .listitem-media-thumb.is-playable :deep(.v-img) {
    filter: brightness(0.45);
  }

  .list-item-main:hover .listitem-play-blue {
    opacity: 1;
  }
}

.album-track-row :deep(.v-list-item__content) {
  margin-bottom: 1px;
}

/* ------------------------------------------------------------- append */

.listview-row :deep(.v-list-item__append) {
  gap: 2px;
  color: var(--subtle-foreground);
}

.favorite-button-wrapper {
  margin-inline: 8px;
}

.listview-row :deep(.v-list-item__append > .button--icon) {
  color: var(--muted-foreground);
}

/* the duration closes the row, after the hover actions, so it lines up */
.track-duration {
  order: 10;
  min-width: 40px;
  margin-left: 4px;
  margin-right: 10px;
  text-align: right;
  font-size: 13px;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* the artwork is the only colour in a list: a source badge on every row would
   repeat its brand colour all the way down, so it rests in grey and takes its
   colour back on the row being pointed at */
.listview-row :deep(.v-list-item__append .provider-icon-wrapper) {
  filter: grayscale(1);
  opacity: 0.6;
  transition:
    filter 150ms ease,
    opacity 150ms ease;
}

.listview-row:hover :deep(.v-list-item__append .provider-icon-wrapper) {
  filter: none;
  opacity: 1;
}

/* a touch screen shows the row menu all the time, so the duration sits before
   it rather than after it */
@media (hover: none) {
  .track-duration {
    order: 0;
    margin-right: 0;
  }
}

.listitem-status-icon {
  margin-inline: 4px;
  color: var(--subtle-foreground);
}

/* hi-res as a micro tag in the quality colour */
.listitem-hires {
  flex: none;
  margin-inline: 8px;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--quality-hires);
  box-shadow: inset 0 0 0 1px
    color-mix(in oklab, var(--quality-hires) 45%, transparent);
}

/* with a pointer, the menu and an unset heart wait for the row's hover or
   focus; a touch screen keeps them in view */
@media (hover: hover) {
  .listview-row :deep(.v-list-item__append > .button--icon),
  .listview-row
    .favorite-button-wrapper
    :deep(.favorite-icon:not(.favorite-icon--on)) {
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .list-item-main.listview-row:hover
    :deep(.v-list-item__append > .button--icon),
  .list-item-main.listview-row:focus-within
    :deep(.v-list-item__append > .button--icon) {
    opacity: 1;
  }

  .list-item-main.listview-row:hover
    .favorite-button-wrapper
    :deep(.favorite-icon:not(.favorite-icon--on)),
  .list-item-main.listview-row:focus-within
    .favorite-button-wrapper
    :deep(.favorite-icon:not(.favorite-icon--on)) {
    opacity: 0.7;
  }

  .listview-row .favorite-button-wrapper :deep(.favorite-icon:hover) {
    opacity: 1;
  }
}

.dimmed {
  opacity: 0.3;
}

.hidden {
  opacity: 0;
}
</style>

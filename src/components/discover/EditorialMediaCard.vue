<template>
  <div
    v-hold="onHold"
    class="ed-card ma-tap"
    role="button"
    tabindex="0"
    :class="{
      'ed-card--unavailable': !isAvailable,
      'ed-card--fluid': fluid,
      'ed-card--disabled': disabled,
      'ed-card--round': isArtist,
    }"
    @click="onClick"
    @keydown.enter.self="onClick"
    @keydown.space.self.prevent="onClick"
    @contextmenu.prevent="onMenu"
    @touchstart.passive="holdFired = false"
  >
    <div class="ed-card__art" :style="getStyle">
      <img
        v-if="artImage && props.item.media_type != MediaType.COLLECTION"
        class="ed-card__img"
        :class="{
          'ed-card__img--genre': isGenre,
          'ed-card__img--provider': !art.image,
        }"
        loading="lazy"
        :src="artImage"
        alt=""
      />
      <MediaCollectionThumb
        v-else-if="props.item.media_type == MediaType.COLLECTION"
        :item="props.item as MediaCollection<MediaItemType>"
        :thumb-offset="22"
      />
      <span v-else-if="art.initials" class="ed-card__initials">{{
        art.initials
      }}</span>
      <ProviderIcon
        v-if="providerDomain"
        class="ed-card__provider"
        :domain="providerDomain"
        :size="20"
      />
      <NowPlayingBadge
        v-if="isPlaying"
        :show-badge="false"
        :icon-style="
          isArtist
            ? 'position: absolute; right: 50%; bottom: 10%; transform: translateX(50%); z-index: 2'
            : 'position: absolute; right: 6px; bottom: 6px; z-index: 2'
        "
      />
      <div
        v-if="showCheckboxes"
        class="ed-card__select"
        :class="{ 'ed-card__select--on': isSelected }"
      >
        <v-icon
          size="30"
          :icon="
            isSelected
              ? 'mdi-check-circle'
              : 'mdi-checkbox-blank-circle-outline'
          "
        />
      </div>
      <span v-if="showPlay" class="ed-card__play" @click.stop="onPlay">
        <Play
          :size="18"
          fill="currentColor"
          :stroke-width="0"
          class="ed-card__play-icon"
        />
      </span>
    </div>
    <div class="ed-card__meta">
      <div
        class="ed-card__title"
        :class="{ 'ed-card__title--playing': isPlaying }"
      >
        {{ displayName }}
      </div>
      <div class="ed-card__sub">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>

    <slot name="actions"></slot>
  </div>
</template>

<script setup lang="ts">
import {
  itemArtwork,
  placeholderBackground,
} from "@/components/discover/editorialArtwork";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import { useProviderIcon } from "@/composables/useProviderIcon";
import {
  handleMediaItemClick,
  handleMenuBtnClick,
  handlePlayBtnClick,
} from "@/helpers/media_item_actions";
import {
  getArtistsString,
  getAuthorsNarratorsArray,
  getBrowseFolderName,
} from "@/helpers/utils";
import {
  getListItemProviderIconDomain,
  getProviderRootDomain,
} from "@/plugins/api/helpers";
import {
  type Album,
  type BrowseFolder,
  type ItemMapping,
  type MediaItemType,
  MediaType,
  type MediaCollection,
  type Track,
} from "@/plugins/api/interfaces";
import { Play } from "@lucide/vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import MediaCollectionThumb from "../MediaCollectionThumb.vue";

interface Props {
  item: MediaItemType | ItemMapping;
  showProviderOnCover?: boolean;
  isAvailable?: boolean;
  fluid?: boolean;
  isSelected?: boolean;
  showCheckboxes?: boolean;
  isPlaying?: boolean;
  disablePlayButton?: boolean;
  disabled?: boolean;
  parentItem?: MediaItemType;
  sortBy?: string;
}
const props = withDefaults(defineProps<Props>(), {
  showProviderOnCover: false,
  isAvailable: true,
  fluid: false,
  isSelected: false,
  showCheckboxes: false,
  isPlaying: false,
  disablePlayButton: false,
  disabled: false,
  parentItem: undefined,
  sortBy: undefined,
});

const emit = defineEmits<{
  (e: "select", item: MediaItemType | ItemMapping, selected: boolean): void;
}>();

const { t } = useI18n();

const art = computed(() => itemArtwork(props.item, 320));

const isGenre = computed(() => props.item.media_type === MediaType.GENRE);
// people are shown as round portraits; every other cover stays square
const isArtist = computed(() => props.item.media_type === MediaType.ARTIST);

// provider entries in the browse root show the provider icon
const { iconDataUri: providerRootIcon } = useProviderIcon(() =>
  getProviderRootDomain(props.item),
);
const artImage = computed(() => art.value.image ?? providerRootIcon.value);

const getStyle = computed(() => {
  if (props.item.media_type == MediaType.COLLECTION) return {};
  // a logo needs a plain backdrop rather than the banner artwork
  if (!art.value.image && providerRootIcon.value)
    return { background: placeholderBackground };
  return { background: art.value.gradient };
});

const isPlayable = computed(() => props.item.is_playable !== false);
const showPlay = computed(
  () => isPlayable.value && props.isAvailable && !props.showCheckboxes,
);

// Provider badge on the cover — always for playlists (to show the source),
// otherwise only when the consumer opts in via showProviderOnCover.
const providerDomain = computed<string | undefined>(() => {
  const it = props.item;
  if (!("provider_mappings" in it)) return undefined;
  if (!props.showProviderOnCover && it.media_type !== MediaType.PLAYLIST) {
    return undefined;
  }
  return getListItemProviderIconDomain(it);
});

const displayName = computed(() => {
  const it = props.item;
  if (it.media_type === MediaType.FOLDER) {
    return getBrowseFolderName(it as BrowseFolder);
  }
  let name = it.name;
  if ("version" in it && it.version) name += ` - ${it.version}`;
  return name;
});

const subtitle = computed(() => {
  const it = props.item as Partial<
    Album &
      Track & {
        authors?: string[];
        publisher?: string;
        owner?: string;
      }
  >;
  if (it.artists?.length) return getArtistsString(it.artists, 1);
  if (it.authors?.length)
    return getAuthorsNarratorsArray(it.authors).join(" / ");
  if (it.publisher) return it.publisher;
  if (it.owner) return it.owner;
  return t(props.item.media_type);
});

// Set while a long-press opened the context menu, so the click that fires on
// finger-lift does not also navigate. Reset on the next touchstart.
const holdFired = ref(false);

const onClick = (e: MouseEvent | KeyboardEvent) => {
  if (props.disabled) return;
  if (holdFired.value) {
    holdFired.value = false;
    return;
  }
  if (props.showCheckboxes) {
    emit("select", props.item, !props.isSelected);
    return;
  }
  const x = "clientX" in e ? e.clientX : 0;
  const y = "clientY" in e ? e.clientY : 0;
  handleMediaItemClick(props.item, x, y, props.parentItem);
};
// Long-press on touch devices: open the same context menu as right-click.
const onHold = (e: TouchEvent) => {
  if (props.disabled || props.showCheckboxes) return;
  holdFired.value = true;
  const touch = e.touches?.[0];
  handleMenuBtnClick(
    props.item,
    touch?.clientX ?? 0,
    touch?.clientY ?? 0,
    props.parentItem,
    true,
    props.sortBy,
  );
};
const onPlay = (e: MouseEvent) => {
  if (props.showCheckboxes || props.disablePlayButton) return;
  handlePlayBtnClick(
    props.item,
    e.clientX,
    e.clientY,
    props.parentItem,
    undefined,
    props.sortBy,
  );
};
const onMenu = (e: MouseEvent) => {
  if (props.showCheckboxes) return;
  handleMenuBtnClick(
    props.item,
    e.clientX,
    e.clientY,
    props.parentItem,
    true,
    props.sortBy,
  );
};
</script>

<style scoped>
/* Liner Notes card: a whole, square cover with a soft shadow and the text
   beneath it. The cover lifts on hover and reveals the accent play button;
   nothing is ever stamped over the art. */
.ed-card {
  --ed-card-pad: 8px;
  --ed-art-size: var(--ed-tile-art, 168px);
  --ed-art-radius: 4px;
  --ed-art-shadow: 0 14px 28px -12px rgba(20, 20, 50, 0.35);
  --ed-art-shadow-lift: 0 22px 34px -14px rgba(20, 20, 50, 0.42);
  position: relative;
  flex: 0 0 auto;
  width: calc(var(--ed-art-size) + 2 * var(--ed-card-pad));
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: var(--ed-card-pad);
  border-radius: var(--ed-card-pad);
  color: var(--foreground);
  scroll-snap-align: start;
  outline: none;
}
.dark .ed-card {
  --ed-art-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.7);
  --ed-art-shadow-lift: 0 22px 36px -14px rgba(0, 0, 0, 0.75);
}
.ed-card:focus-visible {
  box-shadow: 0 0 0 2px var(--ring);
}
.ed-card--fluid {
  width: 100%;
}
.ed-card--fluid .ed-card__art {
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
}
.ed-card--fluid .ed-card__meta {
  width: 100%;
}
.ed-card--unavailable {
  opacity: 0.3;
}
.ed-card--disabled {
  pointer-events: none;
}
.ed-card__art {
  position: relative;
  container-type: inline-size;
  width: var(--ed-art-size);
  height: var(--ed-art-size);
  border-radius: var(--ed-art-radius);
  overflow: hidden;
  background: var(--secondary);
  box-shadow: var(--ed-art-shadow);
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
/* a faint hairline keeps dark covers from bleeding into a dark page */
.ed-card__art::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px
    color-mix(in oklab, var(--foreground) 7%, transparent);
  pointer-events: none;
}
/* a soft shade under the play button, only while it shows */
.ed-card__art::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.42), transparent 48%);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}
/* people are round portraits */
.ed-card--round .ed-card__art {
  --ed-art-radius: 50%;
}
.ed-card--round .ed-card__meta {
  text-align: center;
}
/* keep corner overlays inside the circle */
.ed-card--round .ed-card__provider {
  top: 12%;
  left: 12%;
}
.ed-card--round .ed-card__select {
  padding: 14%;
}
.ed-card__initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-size: 34cqw;
  font-weight: 500;
  letter-spacing: -0.01em;
  /* sits on the banner artwork, so white is the art's own ink */
  color: rgba(255, 255, 255, 0.94);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  user-select: none;
}
.ed-card__provider {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
}
.ed-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* Genre icons render in white over the banner background (same treatment as
   the "Browse by genre" tiles on the home screen). */
.ed-card__img--genre {
  object-fit: contain;
  padding: 18%;
  filter: brightness(0) invert(1);
}
/* Inset the logo and keep wide wordmarks whole instead of cropped. */
.ed-card__img--provider {
  object-fit: contain;
  padding: 18%;
}
.ed-card__select {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  z-index: 3;
  color: #fff;
  transition: background 0.15s ease;
}
.ed-card__select--on {
  background: rgba(0, 0, 0, 0.45);
}
/* subtle grey ring on the outside so the white unselected circle stays visible on light thumbs */
.ed-card__select:not(.ed-card__select--on) .v-icon {
  position: relative;
}
.ed-card__select:not(.ed-card__select--on) .v-icon::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 83%;
  height: 83%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(192, 192, 192, 0.85);
  pointer-events: none;
}
.ed-card__play {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition:
    opacity 0.18s ease,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
  z-index: 4;
}
/* a round portrait keeps the button inside its circle */
.ed-card--round .ed-card__play {
  right: 50%;
  bottom: 12%;
  transform: translate(50%, 6px);
}
.ed-card__play-icon {
  margin-left: 2px;
  /* guarantee a solid white triangle regardless of lucide's default fill */
  fill: currentColor;
  stroke: none;
}
.ed-card:hover .ed-card__art {
  transform: translateY(-3px);
  box-shadow: var(--ed-art-shadow-lift);
}
.ed-card:hover .ed-card__art::before,
.ed-card:focus-visible .ed-card__art::before {
  opacity: 1;
}
.ed-card:hover .ed-card__play,
.ed-card:focus-visible .ed-card__play {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}
.ed-card--round:hover .ed-card__play,
.ed-card--round:focus-visible .ed-card__play {
  transform: translateX(50%);
}
.ed-card__play:hover {
  filter: brightness(1.08);
}
/* Touch devices: no hover-revealed play button — tap goes straight to the
   content and long-press opens the context menu instead. */
@media (hover: none) {
  .ed-card__play,
  .ed-card__art::before {
    display: none;
  }
  .ed-card:hover .ed-card__art {
    transform: none;
    box-shadow: var(--ed-art-shadow);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ed-card__art,
  .ed-card__play {
    transition: none;
  }
  .ed-card:hover .ed-card__art {
    transform: none;
  }
}
.ma-tap:active {
  transform: scale(0.97);
}
.ed-card__meta {
  position: relative;
  width: var(--ed-art-size);
  margin-top: 11px;
}
.ed-card__title {
  font-size: 13.5px;
  line-height: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-card__title--playing {
  color: var(--primary);
}
.ed-card__sub {
  font-size: 12.5px;
  line-height: 16px;
  color: var(--muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

@media (max-width: 500px) {
  .ed-card {
    --ed-card-pad: 4px;
  }
  .ed-card__meta {
    margin-top: 8px;
  }
  .ed-card__sub {
    margin-top: 0;
  }
  .ed-card__play {
    width: 36px;
    height: 36px;
    right: 8px;
    bottom: 8px;
  }
}
</style>

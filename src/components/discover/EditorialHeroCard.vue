<template>
  <button
    v-hold="onHold"
    type="button"
    class="ed-hero ma-tap"
    :class="{ 'ed-hero--large': large, 'ed-hero--round': isArtist }"
    @click="onClick"
    @contextmenu.prevent="onMenu"
    @touchstart.passive="holdFired = false"
  >
    <!-- the whole cover, never cropped and never written on -->
    <div class="ed-hero__art" :style="{ background: art.gradient }">
      <img
        v-if="art.image"
        class="ed-hero__img"
        loading="lazy"
        :src="art.image"
        alt=""
      />
      <span v-else-if="art.initials" class="ed-hero__initials">{{
        art.initials
      }}</span>
      <span class="ed-hero__play" @click.stop="onPlay">
        <Play
          :size="large ? 20 : 18"
          fill="currentColor"
          :stroke-width="0"
          class="ed-hero__play-icon"
        />
      </span>
    </div>
    <!-- beneath the cover, or beside it for the lead pick -->
    <div class="ed-hero__content">
      <div v-if="large" class="ed-hero__kind">{{ kind }}</div>
      <div class="ed-hero__title">{{ item.name }}</div>
      <div v-if="subtitleLine" class="ed-hero__subtitle">
        {{ subtitleLine }}
      </div>
      <div class="ed-hero__tag">
        <Sparkles :size="large ? 12 : 11" />
        <span>{{ tag }}</span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { itemArtwork } from "@/components/discover/editorialArtwork";
import {
  handleMediaItemClick,
  handleMenuBtnClick,
  handlePlayBtnClick,
} from "@/helpers/media_item_actions";
import { getArtistsString } from "@/helpers/utils";
import {
  type Album,
  type ItemMapping,
  type MediaItemType,
  MediaType,
  type Track,
} from "@/plugins/api/interfaces";
import { Play, Sparkles } from "@lucide/vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

interface Props {
  item: MediaItemType | ItemMapping;
  tag?: string;
  large?: boolean;
}
const props = defineProps<Props>();
const { t } = useI18n();

// the square cover (not the wide fanart), so it can be shown whole
const art = computed(() => itemArtwork(props.item, props.large ? 480 : 320));
const kind = computed(() => t(props.item.media_type));
const tag = computed(() => props.tag || t("recently_played"));
const isArtist = computed(() => props.item.media_type === MediaType.ARTIST);

const subtitle = computed(() => {
  const it = props.item as Partial<Album & Track & { owner?: string }>;
  if (it.artists?.length) return getArtistsString(it.artists, 1);
  if (it.owner) return it.owner;
  return undefined;
});
// The lead names its kind above the title; a small card falls back to it so
// the line beneath the title is never empty.
const subtitleLine = computed(
  () => subtitle.value ?? (props.large ? undefined : kind.value),
);

// Set while a long-press opened the context menu, so the click that fires on
// finger-lift does not also navigate. Reset on the next touchstart.
const holdFired = ref(false);

const onClick = (e: MouseEvent) => {
  if (holdFired.value) {
    holdFired.value = false;
    return;
  }
  handleMediaItemClick(props.item, e.clientX, e.clientY);
};
const onPlay = (e: MouseEvent) =>
  handlePlayBtnClick(props.item, e.clientX, e.clientY);
const onMenu = (e: MouseEvent) =>
  handleMenuBtnClick(props.item, e.clientX, e.clientY);
// Long-press on touch devices: open the same context menu as right-click.
const onHold = (e: TouchEvent) => {
  holdFired.value = true;
  const touch = e.touches?.[0];
  handleMenuBtnClick(props.item, touch?.clientX ?? 0, touch?.clientY ?? 0);
};
</script>

<style scoped>
/* A pick on the "Top picks" band. The band is an accent-derived surface that
   stays dark in both themes, so the text here is white. Sizes come from the
   band: --ed-hero-art for a card's cover, --ed-lead-art for the lead's. */
.ed-hero {
  --ed-art: var(--ed-hero-art, 168px);
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: var(--ed-art);
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
  scroll-snap-align: start;
  outline: none;
}
.ed-hero:focus-visible {
  box-shadow: 0 0 0 2px #fff;
}
.ed-hero--large {
  --ed-art: var(--ed-lead-art, 232px);
  flex-direction: row;
  align-items: stretch;
  gap: 20px;
  width: auto;
}
.ma-tap:active {
  transform: scale(0.985);
}

.ed-hero__art {
  position: relative;
  flex: none;
  width: var(--ed-art);
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 14px 26px -12px rgba(0, 0, 0, 0.6);
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.ed-hero__art::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.ed-hero__art::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.42), transparent 48%);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}
.ed-hero--round .ed-hero__art {
  border-radius: 50%;
}
.ed-hero__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ed-hero__initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-size: calc(var(--ed-art) * 0.34);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.94);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  user-select: none;
}

.ed-hero__content {
  min-width: 0;
  margin-top: 11px;
}
.ed-hero--large .ed-hero__content {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  width: clamp(160px, 16vw, 240px);
  margin-top: 0;
  padding-bottom: 4px;
}
.ed-hero__kind {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
  margin-bottom: 8px;
}
.ed-hero__title {
  font-size: 13.5px;
  line-height: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-hero--large .ed-hero__title {
  font-family: var(--font-heading);
  font-size: 28px;
  line-height: 1.08;
  font-weight: 500;
  letter-spacing: -0.012em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.ed-hero__subtitle {
  margin-top: 1px;
  font-size: 12.5px;
  line-height: 16px;
  color: rgba(255, 255, 255, 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-hero--large .ed-hero__subtitle {
  margin-top: 8px;
  font-size: 14px;
  line-height: 18px;
  color: rgba(255, 255, 255, 0.78);
}
/* why it was picked: a caption under the text, never a chip on the art */
.ed-hero__tag {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin-top: 3px;
  font-size: 11px;
  line-height: 15px;
  color: rgba(255, 255, 255, 0.58);
}
.ed-hero__tag svg {
  flex-shrink: 0;
}
.ed-hero__tag span {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-hero--large .ed-hero__tag {
  margin-top: 12px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.66);
}

.ed-hero__play {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
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
}
.ed-hero--large .ed-hero__play {
  width: 46px;
  height: 46px;
  right: 12px;
  bottom: 12px;
}
.ed-hero--round .ed-hero__play {
  right: 50%;
  bottom: 12%;
  transform: translate(50%, 6px);
}
.ed-hero__play-icon {
  margin-left: 2px;
  fill: currentColor;
  stroke: none;
}
.ed-hero:hover .ed-hero__art {
  transform: translateY(-3px);
  box-shadow: 0 22px 34px -14px rgba(0, 0, 0, 0.7);
}
.ed-hero:hover .ed-hero__art::before,
.ed-hero:focus-visible .ed-hero__art::before {
  opacity: 1;
}
.ed-hero:hover .ed-hero__play,
.ed-hero:focus-visible .ed-hero__play {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}
.ed-hero--round:hover .ed-hero__play,
.ed-hero--round:focus-visible .ed-hero__play {
  transform: translateX(50%);
}
.ed-hero__play:hover {
  filter: brightness(1.08);
}
/* Touch devices: no hover-revealed play button — tap goes straight to the
   content and long-press opens the context menu instead. */
@media (hover: none) {
  .ed-hero__play,
  .ed-hero__art::before {
    display: none;
  }
  .ed-hero:hover .ed-hero__art {
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ed-hero__art,
  .ed-hero__play {
    transition: none;
  }
  .ed-hero:hover .ed-hero__art {
    transform: none;
  }
}

@media (max-width: 600px) {
  .ed-hero--large {
    gap: 14px;
  }
  .ed-hero--large .ed-hero__content {
    width: 140px;
  }
  .ed-hero--large .ed-hero__title {
    font-size: 22px;
  }
  .ed-hero--large .ed-hero__subtitle {
    font-size: 13px;
  }
}
</style>

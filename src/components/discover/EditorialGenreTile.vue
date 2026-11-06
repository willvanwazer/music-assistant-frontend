<template>
  <button class="ed-genre ma-tap" @click="onClick">
    <!-- Roon-style duotone: the picture in greyscale under an accent-tinted
         multiply layer. A genre's own photo when it has one, otherwise a
         per-genre crop of the banner artwork as texture. -->
    <img
      class="ed-genre__bg"
      :class="{ 'ed-genre__bg--banner': !photo }"
      :style="bannerStyle"
      loading="lazy"
      :src="photo ?? genreBanner"
      alt=""
      aria-hidden="true"
    />
    <span class="ed-genre__tint" aria-hidden="true"></span>
    <span class="ed-genre__content">
      <img
        v-if="iconImage"
        class="ed-genre__icon"
        loading="lazy"
        :src="iconImage"
        alt=""
        aria-hidden="true"
      />
      <span class="ed-genre__name">{{ displayName }}</span>
      <span v-if="countLabel" class="ed-genre__count">{{ countLabel }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { itemArtwork } from "@/components/discover/editorialArtwork";
import { handleMediaItemClick } from "@/helpers/media_item_actions";
import { getImageThumbForItem } from "@/helpers/utils";
import { ImageType, type Genre } from "@/plugins/api/interfaces";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

interface Props {
  item: Genre;
  // media counts for this genre by type (album, track, ...), when known
  counts?: Record<string, number>;
}
const props = defineProps<Props>();
const { t } = useI18n();

const genreBanner = new URL("@/assets/logo/banner-no-logo.png", import.meta.url)
  .href;

// a genre's thumb is its icon; only fanart is a photograph to tint
const photo = computed(() =>
  getImageThumbForItem(props.item, ImageType.FANART, 600),
);
const iconImage = computed(() => itemArtwork(props.item, 320).image);
const displayName = computed(() => props.item.name);

// A stable per-genre crop of the banner, so a row of tiles reads as varied
// texture rather than the same picture eight times.
const bannerStyle = computed(() => {
  if (photo.value) return undefined;
  let hash = 0;
  for (const ch of props.item.name || props.item.item_id) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return {
    objectPosition: `${hash % 101}% ${(hash >>> 8) % 101}%`,
    "--ed-genre-zoom": String(1.5 + ((hash >>> 16) % 6) / 10),
  };
});

const countLabel = computed(() => {
  const albums = props.counts?.album ?? 0;
  if (albums > 0)
    return t("listening_home.genre_albums", albums, {
      named: { count: albums.toLocaleString() },
    });
  const tracks = props.counts?.track ?? 0;
  if (tracks > 0)
    return t("listening_home.genre_tracks", tracks, {
      named: { count: tracks.toLocaleString() },
    });
  return undefined;
});

const onClick = (e: MouseEvent) =>
  handleMediaItemClick(props.item, e.clientX, e.clientY);
</script>

<style scoped>
/* The tile is artwork: it stays dark in both themes and its text is white. */
.ed-genre {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 84px;
  padding: 0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: #fff;
  /* shown only if the picture fails to load */
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--primary) 70%, #0b0b10),
    color-mix(in oklab, var(--primary) 30%, #0b0b10)
  );
  outline: none;
}
.ed-genre:focus-visible {
  box-shadow:
    0 0 0 2px var(--background),
    0 0 0 4px var(--ring);
}
.ma-tap:active {
  transform: scale(0.97);
}
.ed-genre__bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1) contrast(1.15) brightness(0.8);
  transform: scale(var(--ed-genre-zoom, 1));
}
/* the banner is a bright, flat sky: push it darker so the waves read */
.ed-genre__bg--banner {
  filter: grayscale(1) contrast(1.6) brightness(0.62);
}
.ed-genre__tint {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: color-mix(in oklab, var(--primary) 55%, #000 45%);
  mix-blend-mode: multiply;
  opacity: 0.78;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.ed-genre:hover .ed-genre__tint,
.ed-genre:focus-visible .ed-genre__tint {
  opacity: 0.48;
}
@media (prefers-reduced-motion: no-preference) {
  .ed-genre__bg {
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ed-genre:hover .ed-genre__bg {
    transform: scale(calc(var(--ed-genre-zoom, 1) * 1.05));
  }
}

/* sized against the tile itself, so the mosaic's large tile gets a larger
   name without the parent having to say so */
.ed-genre__content {
  position: absolute;
  inset: 0;
  container-type: size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  text-align: center;
}
.ed-genre__icon {
  width: 26px;
  width: clamp(18px, 17cqh, 34px);
  height: 26px;
  height: clamp(18px, 17cqh, 34px);
  margin-bottom: 6px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.85;
  pointer-events: none;
}
.ed-genre__name {
  max-width: 100%;
  font-family: var(--font-heading);
  font-size: 26px;
  font-size: clamp(19px, 21cqh, 40px);
  line-height: 1.05;
  font-weight: 500;
  letter-spacing: -0.012em;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.ed-genre__count {
  margin-top: 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .ed-genre__icon {
    display: none;
  }
  .ed-genre__count {
    margin-top: 4px;
    font-size: 9.5px;
  }
}
</style>

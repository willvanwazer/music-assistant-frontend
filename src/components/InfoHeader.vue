<template>
  <div
    class="info-header"
    :class="{
      'info-header--loading': !item,
      'info-header--photo': !!artistPhoto,
      'info-header--artist': item?.media_type == MediaType.ARTIST,
      'info-header--dark': $vuetify.theme.current.dark,
    }"
  >
    <!-- a soft, blurred wash of the artwork that fades into the page -->
    <div v-if="washImage" class="info-header-wash" aria-hidden="true">
      <img :src="washImage" alt="" decoding="async" />
    </div>
    <!-- loading animation -->
    <v-progress-linear v-if="!item" indeterminate />
    <Toolbar
      :icon="ArrowLeft"
      class="info-header-toolbar"
      :menu-items="menuItems"
      :enforce-overflow-menu="true"
      :icon-action="backButtonClick"
    >
      <template v-if="$slots['toolbar-append']" #append>
        <slot name="toolbar-append"></slot>
      </template>
    </Toolbar>
    <div v-if="item" class="info-header-hero">
      <!-- artist photo, full bleed, behind a veil the name can sit on -->
      <div v-if="artistPhoto" class="info-header-photo" aria-hidden="true">
        <img :src="artistPhoto" alt="" />
      </div>
      <!-- cover art (a portrait for artists): whole, never cropped -->
      <div
        v-else
        class="info-header-art"
        :class="{
          'info-header-art--round': item.media_type == MediaType.ARTIST,
          'info-header-art--stack': item.media_type == MediaType.COLLECTION,
        }"
      >
        <MediaCollectionThumb
          v-if="item.media_type == MediaType.COLLECTION"
          :item="item as MediaCollection<MediaItemType>"
          size="100%"
        />
        <MediaItemThumb v-else :item="item" size="100%" :thumbnail="false" />
      </div>

      <div class="info-header-text">
        <div class="info-header-eyebrow">{{ eyebrow }}</div>
        <!-- Main title -->
        <img
          v-if="artistLogo"
          :src="artistLogo"
          :alt="$t('tooltip.artwork')"
          class="info-header-logo"
        />
        <h1 v-else class="ma-display info-header-title">
          <MarqueeText :sync="marqueeSync">
            <div class="selectable">
              {{ headerTitle }}
            </div>
          </MarqueeText>
        </h1>

        <!-- item artists -->
        <div v-if="'artists' in item && item.artists" class="info-header-by">
          <MarqueeText :sync="marqueeSync">
            <span
              v-for="(artist, artistindex) in item.artists"
              :key="artist.item_id"
            >
              <a class="info-header-link" @click="artistClick(artist)">{{
                artist.name
              }}</a>
              <span
                v-if="artistindex + 1 < item.artists.length"
                :key="artistindex"
                class="info-header-sep"
                >{{ " / " }}</span
              >
            </span>
          </MarqueeText>
        </div>

        <!-- audiobook author(s) -->
        <div
          v-if="'authors' in item && item.authors.length > 0"
          class="info-header-line"
        >
          <v-icon class="info-header-line-icon" icon="mdi-account-edit" />
          <MarqueeText :sync="marqueeSync">
            <span
              v-for="(author, authorindex) in getAuthorsNarratorsArray(
                item.authors,
              )"
              :key="author"
            >
              <span>{{ author }}</span>
              <span
                v-if="authorindex + 1 < item.authors.length"
                :key="authorindex"
                class="info-header-sep"
                >{{ " / " }}</span
              >
            </span>
          </MarqueeText>
        </div>

        <!-- audiobook narrator(s) -->
        <div
          v-if="'narrators' in item && item.narrators.length > 0"
          class="info-header-line"
        >
          <v-icon class="info-header-line-icon" icon="mdi-account-voice" />
          <MarqueeText :sync="marqueeSync">
            <span
              v-for="(narrator, narratorIndex) in getAuthorsNarratorsArray(
                item.narrators,
              )"
              :key="narrator"
            >
              <span>{{ narrator }}</span>
              <span
                v-if="narratorIndex + 1 < item.narrators.length"
                :key="narratorIndex"
                class="info-header-sep"
                >{{ " / " }}</span
              >
            </span>
          </MarqueeText>
        </div>

        <!-- Audiobook Collection -->
        <div
          v-if="collectionMediaType === MediaType.AUDIOBOOK"
          class="info-header-line"
        >
          <v-icon class="info-header-line-icon" icon="mdi-account-edit" />
          <MarqueeText :sync="marqueeSync">
            <span
              v-for="(author, authorindex) in collectionArtists"
              :key="author"
            >
              <span>{{ author }}</span>
              <span
                v-if="authorindex + 1 < collectionArtists.length"
                :key="authorindex"
                class="info-header-sep"
                >{{ " / " }}</span
              >
            </span>
          </MarqueeText>
        </div>
        <div
          v-if="collectionMediaType === MediaType.AUDIOBOOK"
          class="info-header-line"
        >
          <v-icon class="info-header-line-icon" icon="mdi-account-voice" />
          <MarqueeText :sync="marqueeSync">
            <span
              v-for="(narrator, narratorIndex) in collectionNarrators"
              :key="narrator"
            >
              <span>{{ narrator }}</span>
              <span
                v-if="narratorIndex + 1 < collectionNarrators.length"
                :key="narratorIndex"
                class="info-header-sep"
                >{{ " / " }}</span
              >
            </span>
          </MarqueeText>
        </div>

        <!-- meta line: version, playlist owner, album -->
        <div
          v-if="
            ('version' in item && item.version) ||
            ('owner' in item && item.owner) ||
            ('album' in item && item.album)
          "
          class="info-header-meta"
        >
          <!-- version -->
          <span v-if="'version' in item && item.version">
            {{ item.version }}
            <!-- explicit icon -->
            <v-tooltip location="bottom">
              <template #activator="{ props }">
                <v-icon
                  v-if="parseBool(item.metadata.explicit || false)"
                  v-bind="props"
                  icon="mdi-alpha-e-box"
                  size="18"
                />
              </template>
              <span>{{ $t("tooltip.explicit") }}</span>
            </v-tooltip>
          </span>
          <!-- playlist owner -->
          <span v-if="'owner' in item && item.owner">
            <v-icon class="info-header-line-icon" icon="mdi-account-music" />
            {{ item.owner }}
          </span>
          <!-- album (track details) -->
          <span v-if="'album' in item && item.album">
            <v-icon class="info-header-line-icon" icon="mdi-album" />
            <a class="info-header-link" @click="albumClick(item.album)">{{
              item.album.name
            }}</a
            ><span v-if="'year' in item.album && item.album.year">
              · {{ item.album.year }}</span
            >
          </span>
        </div>

        <!-- genres/tags -->
        <div v-if="mappedGenres.length" class="info-header-genres">
          <v-chip
            v-for="genre of mappedGenres.slice(
              0,
              $vuetify.display.mobile ? 15 : 25,
            )"
            :key="genre.item_id"
            v-hold="(e: Event) => onHold(e, genre)"
            variant="outlined"
            size="small"
            class="info-header-chip cursor-pointer"
            @click="handleMediaItemClick(genre, 0, 0)"
            @click.capture="swallowClickAfterHold"
            @contextmenu.prevent="
              (e: MouseEvent) => showGenreChipContextMenu(e, genre)
            "
            @touchstart.passive="onTouchStart"
          >
            {{ genre.name }}
          </v-chip>
        </div>

        <!-- play/info buttons -->
        <div class="info-header-actions">
          <!-- play button with contextmenu -->
          <MenuButton
            id="playbutton"
            :text="playButtonText"
            :disabled="!item"
            :loading="playActionInProgress"
            @click="playButtonClick"
            @menu="playButtonClick(true)"
          />

          <div
            v-if="item.media_type != MediaType.COLLECTION"
            class="info-header-icon-actions"
          >
            <!-- favorite (heart) icon -->
            <IconHeartFilled
              v-if="item.favorite"
              :size="24"
              class="info-header-favorite cursor-pointer"
              :title="$t('tooltip.favorite')"
              @click="api.toggleFavorite(item)"
            />
            <IconHeart
              v-else
              :stroke-width="2"
              :size="24"
              class="cursor-pointer"
              :title="$t('tooltip.favorite')"
              @click="api.toggleFavorite(item)"
            />
            <!-- details can be reached out of library context, so always show
            the membership badge (bookshelf when in library, else source) -->
            <provider-icon
              :domain="getProviderIconDomain(item)"
              :size="24"
              class="info-header-membership"
            />
            <!-- audio analysis details (full track details only) -->
            <AudioAnalysisMetadata
              v-if="item.media_type == MediaType.TRACK"
              :audio-metadata="(item as Track).audio_metadata"
            />
            <!-- slot for extra action icons (e.g. smart playlist edit) -->
            <slot name="append-actions"></slot>
            <!-- merge genre button (admin only) -->
            <Merge
              v-if="
                item.media_type === MediaType.GENRE &&
                item.provider === 'library' &&
                isAdmin
              "
              :size="22"
              class="cursor-pointer"
              :title="$t('merge_into')"
              @click="mergeGenre"
            />
            <!-- delete genre button (admin only) -->
            <Trash2
              v-if="
                item.media_type === MediaType.GENRE &&
                item.provider === 'library' &&
                isAdmin
              "
              :size="22"
              class="cursor-pointer"
              :title="$t('delete_genre')"
              @click="deleteGenre"
            />
          </div>
        </div>
        <div v-if="$slots['after-play']" class="info-header-after-play">
          <slot name="after-play"></slot>
        </div>
      </div>
    </div>

    <!-- Description/metadata -->
    <div v-if="item && shortDescription" class="info-header-about">
      <div class="description-text" @click="onDescriptionClick">
        <MarkdownText :text="shortDescription" />
      </div>
    </div>

    <Dialog v-if="!$slots['description-dialog']" v-model:open="showFullInfo">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{{ headerTitle }}</DialogTitle>
        </DialogHeader>
        <MarkdownText
          :text="rawDescription"
          class="max-w-none text-sm leading-relaxed"
          style="max-height: 60vh; overflow-y: auto"
        />
        <DialogFooter>
          <Button @click="showFullInfo = false">{{ $t("close") }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <slot
      name="description-dialog"
      :open="showFullInfo"
      :on-open-change="(v: boolean) => (showFullInfo = v)"
      :close="() => (showFullInfo = false)"
    ></slot>
  </div>
</template>

<script setup lang="ts">
import AudioAnalysisMetadata from "@/components/AudioAnalysisMetadata.vue";
import MarkdownText from "@/components/MarkdownText.vue";
import Toolbar from "@/components/Toolbar.vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getEventPosition,
  useHoldToOpenMenu,
} from "@/composables/useHoldToOpenMenu";
import { useUserPreferences } from "@/composables/userPreferences";
import type { ContextMenuItem } from "@/helpers/context_menu_item";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import { backFromMediaDetails } from "@/helpers/navigation";
import {
  handleMediaItemClick,
  handlePlayBtnClick,
} from "@/helpers/media_item_actions";
import { parseBool } from "@/helpers/parse";
import {
  getAudiobookCollectionArtists,
  getAuthorsNarratorsArray,
  getImageThumbForItem,
  getPlayerName,
} from "@/helpers/utils";
import { getContextMenuItems } from "@/layouts/default/ItemContextMenu.vue";
import { api } from "@/plugins/api";
import {
  getCollectionMediaTypeFromItemId,
  getProviderIconDomain,
} from "@/plugins/api/helpers";
import type {
  Album,
  Artist,
  Audiobook,
  BrowseFolder,
  Genre,
  ItemMapping,
  MediaItemType,
} from "@/plugins/api/interfaces";
import {
  ImageType,
  MediaCollection,
  MediaType,
  Track,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { ArrowLeft, Merge, Trash2 } from "@lucide/vue";
import { IconHeart, IconHeartFilled } from "@tabler/icons-vue";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import MarqueeText from "./MarqueeText.vue";
import MediaCollectionThumb from "./MediaCollectionThumb.vue";
import MediaItemThumb from "./MediaItemThumb.vue";
import MenuButton from "./MenuButton.vue";
import ProviderIcon from "./ProviderIcon.vue";

// properties
export interface Props {
  // browse folders are listed, never opened in a details view
  item?: Exclude<MediaItemType, BrowseFolder>;
  sortBy?: string;
}
const compProps = defineProps<Props>();
const showFullInfo = ref(false);
const fanartImage = ref<string>();
useDisplay();
const menuItems = ref<ContextMenuItem[]>([]);
const mappedGenres = ref<Genre[]>([]);

const marqueeSync = new MarqueeTextSync();
const router = useRouter();
const { getPreference } = useUserPreferences();

const headerTitle = computed(() => {
  if (!compProps.item) return "";
  return compProps.item.name;
});

watch(
  () => compProps.item,
  async (val) => {
    if (val) {
      fanartImage.value =
        getImageThumbForItem(val, ImageType.FANART) ||
        getImageThumbForItem(val, ImageType.LANDSCAPE) ||
        getImageThumbForItem(val, ImageType.THUMB);
      menuItems.value = await getContextMenuItems([val], val);
      // Load mapped genres for non-genre media items
      if (val.media_type !== MediaType.GENRE) {
        api
          .getGenresForMediaItem(val.media_type, val.item_id)
          .then((genres) => {
            mappedGenres.value = genres;
          })
          .catch(() => {
            mappedGenres.value = [];
          });
      } else {
        mappedGenres.value = [];
      }
    } else {
      fanartImage.value = undefined;
      menuItems.value = [];
      mappedGenres.value = [];
    }
  },
  { immediate: true },
);

// An artist with a photo (fanart or landscape) gets it full bleed behind the
// name; everything else shows its cover beside the title.
const artistPhoto = computed(() => {
  const item = compProps.item;
  if (!item || item.media_type != MediaType.ARTIST) return undefined;
  return (
    getImageThumbForItem(item, ImageType.FANART) ||
    getImageThumbForItem(item, ImageType.LANDSCAPE)
  );
});

// The already loaded artwork, blurred into a wash behind the header.
const washImage = computed(() =>
  artistPhoto.value ? undefined : fanartImage.value,
);

// Small caps label above the title: what the item is, and its year.
const eyebrow = computed(() => {
  const item = compProps.item;
  if (!item) return "";
  const parts: string[] = [];
  if ("album_type" in item && item.album_type && item.album_type !== "unknown")
    parts.push($t("album_type." + item.album_type));
  else parts.push($t(item.media_type));
  if (item.media_type == MediaType.ALBUM && "year" in item && item.year)
    parts.push(String(item.year));
  if (item.media_type == MediaType.TRACK && item.metadata?.release_date)
    parts.push(String(new Date(item.metadata.release_date).getUTCFullYear()));
  return parts.join(" · ");
});

// Watch shortcuts preference to update overflow menu when shortcuts change
const shortcutsPreference = getPreference<string[]>("sidebar.shortcuts", []);
watch(shortcutsPreference, async () => {
  if (compProps.item) {
    menuItems.value = await getContextMenuItems(
      [compProps.item],
      compProps.item,
    );
  }
});

const showGenreChipContextMenu = (evt: Event, genre: Genre) => {
  if (
    !compProps.item ||
    !isAdmin.value ||
    compProps.item.provider !== "library"
  )
    return;
  const mediaItem = compProps.item;
  const menuItems: ContextMenuItem[] = [
    {
      label: "exclude_genre",
      icon: "mdi-cancel",
      action: async () => {
        await api.excludeGenreFromItem(
          genre.item_id,
          mediaItem.media_type,
          mediaItem.item_id,
        );
        mappedGenres.value = mappedGenres.value.filter(
          (g) => g.item_id !== genre.item_id,
        );
        eventbus.emit("genreExcluded");
      },
    },
  ];
  const pos = getEventPosition(evt);
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: pos.x,
    posY: pos.y,
  });
};

const { onHold, onTouchStart, swallowClickAfterHold } = useHoldToOpenMenu(
  showGenreChipContextMenu,
);

const albumClick = function (item: Album | ItemMapping) {
  // album entry clicked
  router.push({
    name: "album",
    params: {
      itemId: item.item_id,
      provider: item.provider,
    },
  });
};
const artistClick = function (item: Artist | ItemMapping) {
  // album entry clicked
  router.push({
    name: "artist",
    params: {
      itemId: item.item_id,
      provider: item.provider,
    },
  });
};

const backButtonClick = function () {
  backFromMediaDetails(router);
};

// Resolve the queue playMedia targets directly, since activePlayerQueue is
// undefined while an external source is active.
const playActionInProgress = computed(() => {
  const player = store.activePlayer;
  if (!player) return false;
  const queueId =
    player.active_source && player.active_source in api.queues
      ? player.active_source
      : player.player_id;
  return (
    api.queues[queueId]?.extra_attributes?.play_action_in_progress === true
  );
});

const playButtonText = computed(() => {
  if (!store.activePlayer) return $t("play");
  return getPlayerName(store.activePlayer, 20);
});

const playButtonClick = function (forceMenu = false) {
  const playButton = document.getElementById("playbutton") as HTMLElement;
  const rect = playButton.getBoundingClientRect();

  handlePlayBtnClick(
    compProps.item!,
    rect.right,
    rect.bottom,
    undefined,
    forceMenu,
    compProps.sortBy,
  );
};

const rawDescription = computed(() => {
  if (!compProps.item) return "";
  if (compProps.item.metadata && compProps.item.metadata.description) {
    return compProps.item.metadata.description;
  } else if (compProps.item.metadata && compProps.item.metadata.copyright) {
    return compProps.item.metadata.copyright;
  } else if ("artists" in compProps.item) {
    compProps.item.artists.forEach(function (artist: Artist | ItemMapping) {
      if ("metadata" in artist && artist.metadata.description) {
        return artist.metadata.description;
      }
    });
  }
  return "";
});

const shortDescription = computed(() => {
  const maxChars = 800;
  if (rawDescription.value.length > maxChars) {
    return rawDescription.value.substring(0, maxChars) + "…";
  }
  return rawDescription.value;
});

const onDescriptionClick = (event: MouseEvent) => {
  // a link in the description opens on its own; don't also expand the text
  if ((event.target as HTMLElement).closest("a")) return;
  showFullInfo.value = !showFullInfo.value;
};

const artistLogo = computed(() => {
  if (!compProps.item) return undefined;
  if (compProps.item.media_type != MediaType.ARTIST) return undefined;
  return getImageThumbForItem(compProps.item, ImageType.LOGO);
});

const isAdmin = computed(() => authManager.isAdmin());

const mergeGenre = () => {
  if (!compProps.item) return;
  eventbus.emit("mergeGenreDialog", {
    genreIds: [compProps.item.item_id],
    genreNames: [compProps.item.name],
    genreContentTypes: [(compProps.item as Genre).content_type],
  });
};

const deleteGenre = () => {
  if (!compProps.item) return;
  eventbus.emit("deleteGenreDialog", {
    genreIds: [compProps.item.item_id],
    navigateBack: true,
  });
};

const collectionMediaType = computed(() => {
  if (compProps.item?.media_type != MediaType.COLLECTION)
    return MediaType.UNKNOWN;
  return getCollectionMediaTypeFromItemId(compProps.item.item_id);
});

const collectionArtists = computed(() => {
  if (collectionMediaType.value != MediaType.AUDIOBOOK) return [];

  return getAudiobookCollectionArtists(
    compProps.item as MediaCollection<Audiobook>,
    (book) => book.authors,
  );
});

const collectionNarrators = computed(() => {
  if (collectionMediaType.value != MediaType.AUDIOBOOK) return [];

  return getAudiobookCollectionArtists(
    compProps.item as MediaCollection<Audiobook>,
    (book) => book.narrators,
  );
});
</script>

<style scoped>
/* --------------------------------------------------------------------------
   Layout. The header is its own size container, so it follows the width the
   page actually has (the sidebar included) rather than the viewport.
   Narrow: the cover sits centred above the text. Wide: cover on the left,
   text bottom-aligned beside it.
   -------------------------------------------------------------------------- */
.info-header {
  /* side padding, kept in step with .item-details-body below */
  --ih-pad: clamp(16px, 4vw, 48px);
  /* cqi resolves against this container wherever the variable is used */
  --ih-cover: clamp(180px, 28cqi, 300px);
  --ih-gap: clamp(24px, 4cqi, 44px);
  /* the veil the artist's name sits on: dark in both themes, since the name
     is white over the photo; in dark it is the page itself */
  --ih-veil: #141416;
  --ih-veil-bottom: color-mix(in oklab, var(--ih-veil) 70%, transparent);
  /* how far the artwork wash is pulled toward the page colour */
  --ih-wash-veil: 52%;
  --ih-wash-opacity: 0.6;
  /* the deep, soft shadow under the cover */
  --ih-art-shadow: 0 26px 50px -20px rgba(20, 20, 50, 0.38);
  position: relative;
  isolation: isolate;
  container: info-header / inline-size;
}

.info-header--dark {
  --ih-veil: var(--background);
  --ih-veil-bottom: var(--background);
  --ih-wash-veil: 20%;
  --ih-wash-opacity: 0.64;
  --ih-art-shadow: 0 30px 60px -22px rgba(0, 0, 0, 0.6);
}

.info-header--loading {
  min-height: 240px;
}

.info-header-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
}

.info-header-hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  padding: 64px var(--ih-pad) 24px;
  text-align: center;
}

@container info-header (min-width: 600px) {
  .info-header-hero {
    flex-direction: row;
    align-items: flex-end;
    gap: var(--ih-gap);
    padding: 72px var(--ih-pad) 28px;
    text-align: start;
  }
}

/* --------------------------------------------------------------------------
   Backdrops
   -------------------------------------------------------------------------- */
.info-header-wash {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* oversized so the blur has no soft edge inside the header */
.info-header-wash img {
  position: absolute;
  top: -80px;
  left: -80px;
  width: calc(100% + 160px);
  height: calc(100% + 160px);
  object-fit: cover;
  filter: blur(72px) saturate(1.4);
  opacity: var(--ih-wash-opacity);
}

.info-header-wash::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in oklab, var(--background) var(--ih-wash-veil), transparent) 0%,
    color-mix(in oklab, var(--background) var(--ih-wash-veil), transparent) 40%,
    var(--background) 100%
  );
}

.info-header-photo {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: var(--ih-veil);
}

.info-header-photo img {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 25%;
}

/* narrow: the name sits low, on a veil rising from the bottom; a light scrim
   keeps the toolbar readable over the top of the photo */
.info-header-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      to top,
      var(--ih-veil) 4%,
      color-mix(in oklab, var(--ih-veil) 72%, transparent) 40%,
      transparent 75%
    ),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.35), transparent 120px);
}

@container info-header (min-width: 600px) {
  .info-header-photo img {
    width: 72%;
  }

  /* wide: the photo sits right, and the veil runs left to right */
  .info-header-photo::after {
    background:
      linear-gradient(
        to right,
        var(--ih-veil) 28%,
        color-mix(in oklab, var(--ih-veil) 72%, transparent) 46%,
        transparent 76%
      ),
      linear-gradient(to top, var(--ih-veil-bottom) 0%, transparent 40%),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent 120px);
  }
}

/* --------------------------------------------------------------------------
   Cover art
   -------------------------------------------------------------------------- */
.info-header-art {
  flex: none;
  width: min(56cqi, 220px);
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  background: var(--secondary);
  box-shadow:
    var(--ih-art-shadow),
    0 0 0 1px var(--border);
}

@container info-header (min-width: 600px) {
  .info-header-art {
    width: var(--ih-cover);
  }
}

.info-header-art--round {
  border-radius: 50%;
}

/* a collection is a fanned stack of covers, each with its own edge */
.info-header-art.info-header-art--stack {
  overflow: visible;
  border-radius: 0;
  background: none;
  box-shadow: none;
}

/* --------------------------------------------------------------------------
   Text
   -------------------------------------------------------------------------- */
.info-header-text {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
}

.info-header-eyebrow {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--subtle-foreground);
  margin-bottom: 8px;
}

.info-header-title {
  font-size: clamp(1.75rem, 8.5cqi, 2.5rem);
  line-height: 1.12;
  margin: 0 0 10px;
  color: var(--foreground);
}

@container info-header (min-width: 600px) {
  .info-header-title {
    font-size: clamp(2.25rem, 5.6cqi, 4rem);
  }
}

/* the marquee reserves 1.5em, which at display size is a line of its own;
   keep just enough room inside its clipped box for the serif's descenders */
.info-header-title :deep(.container) {
  min-height: 0;
  padding-bottom: 0.16em;
  margin-bottom: -0.16em;
}

.info-header-logo {
  display: inline-block;
  height: auto;
  max-height: 96px;
  max-width: min(100%, 420px);
  margin: 4px 0 14px;
  object-fit: contain;
}

.info-header-by {
  font-size: 17px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.info-header-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

/* sized to its text so the icon stays beside it when centred */
.info-header-line :deep(.container) {
  width: auto;
  max-width: 100%;
  min-height: 0;
}

.info-header-line-icon {
  flex: none;
  font-size: 16px;
  color: var(--subtle-foreground);
}

.info-header-link {
  color: var(--foreground);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-decoration-color: color-mix(in oklab, var(--primary) 50%, transparent);
  text-underline-offset: 4px;
  transition: color 150ms ease;
}

.info-header-link:hover {
  color: var(--primary);
}

.info-header-sep {
  color: var(--subtle-foreground);
}

.info-header-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
  row-gap: 2px;
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.info-header-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/* small dots between the parts of the meta line */
.info-header-meta > span + span::before {
  content: "";
  flex: none;
  width: 3px;
  height: 3px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--subtle-foreground);
}

.info-header-meta .info-header-link {
  font-weight: 500;
  text-underline-offset: 3px;
}

/* genre chips: pills with a hairline edge */
.info-header-genres {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
}

.info-header-chip.v-chip {
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--muted-foreground);
  border-color: color-mix(in oklab, var(--foreground) 16%, transparent);
  transition: color 150ms ease;
  -webkit-touch-callout: none;
  user-select: none;
}

.info-header-chip.v-chip:hover {
  color: var(--foreground);
}

/* --------------------------------------------------------------------------
   Actions: play as an accent pill, the rest as round 40px buttons
   -------------------------------------------------------------------------- */
.info-header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.info-header-actions :deep([data-slot="button-group"] > [data-slot="button"]) {
  height: 40px;
}

.info-header-actions
  :deep([data-slot="button-group"] > [data-slot="button"]:first-child) {
  padding-inline: 18px 16px;
  font-size: 13.5px;
  font-weight: 600;
}

.info-header-actions
  :deep([data-slot="button-group"] > [data-slot="button"]:last-child) {
  width: 40px;
  padding: 0;
}

/* a light hairline between the two halves of the accent pill */
.info-header-actions
  :deep([data-slot="button-group"] > [data-orientation="vertical"]) {
  background: color-mix(in oklab, var(--primary-foreground) 28%, transparent);
}

.info-header-icon-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.info-header-icon-actions > :deep(svg.cursor-pointer) {
  flex: none;
  box-sizing: border-box;
  width: 40px;
  height: 40px;
  padding: 9px;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--foreground);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.info-header-icon-actions > :deep(svg.cursor-pointer:hover) {
  background: color-mix(in oklab, var(--foreground) 12%, var(--secondary));
}

.info-header-icon-actions > :deep(svg.info-header-favorite) {
  color: var(--primary);
}

.info-header-membership {
  flex: none;
  color: var(--muted-foreground);
}

.info-header-after-play {
  margin-top: 12px;
}

@container info-header (min-width: 600px) {
  .info-header-line,
  .info-header-meta,
  .info-header-genres,
  .info-header-actions,
  .info-header-icon-actions {
    justify-content: flex-start;
  }
}

/* --------------------------------------------------------------------------
   Artist photo hero: white type on the veil, in both themes
   -------------------------------------------------------------------------- */
.info-header--photo .info-header-hero {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  min-height: clamp(380px, 54vh, 470px);
  padding-top: 96px;
  padding-bottom: 36px;
  text-align: start;
  color: #fff;
}

.info-header--photo .info-header-text {
  max-width: 680px;
}

.info-header--photo .info-header-eyebrow {
  color: rgba(255, 255, 255, 0.72);
}

.info-header--photo .info-header-title {
  font-size: clamp(2.25rem, 11cqi, 3rem);
  line-height: 1.04;
  color: #fff;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.25);
}

@container info-header (min-width: 600px) {
  .info-header--photo .info-header-title {
    font-size: clamp(2.75rem, 7.6cqi, 5.25rem);
  }
}

.info-header--photo .info-header-genres,
.info-header--photo .info-header-actions,
.info-header--photo .info-header-icon-actions {
  justify-content: flex-start;
}

.info-header--photo .info-header-chip.v-chip {
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.32);
}

.info-header--photo .info-header-chip.v-chip:hover {
  color: #fff;
}

.info-header--photo .info-header-icon-actions > :deep(svg.cursor-pointer) {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.info-header--photo
  .info-header-icon-actions
  > :deep(svg.cursor-pointer:hover) {
  background: rgba(255, 255, 255, 0.26);
}

.info-header--photo .info-header-membership {
  color: rgba(255, 255, 255, 0.82);
}

/* the back and menu buttons sit on the photo: give them a dark round base */
.info-header--photo .info-header-toolbar :deep(.v-toolbar__prepend .v-btn),
.info-header--photo .info-header-toolbar :deep(.v-toolbar__append button) {
  width: 40px;
  min-width: 0;
  height: 40px;
  padding: 0;
  border-radius: 999px;
  background: rgba(16, 16, 18, 0.42);
  color: #fff;
}

/* --------------------------------------------------------------------------
   Description: editorial serif, clamped; a click opens the full text
   -------------------------------------------------------------------------- */
.info-header-about {
  position: relative;
  z-index: 1;
  padding: 0 var(--ih-pad) 12px;
}

@container info-header (min-width: 600px) {
  .info-header-about {
    padding-left: calc(var(--ih-pad) + var(--ih-cover) + var(--ih-gap));
  }
}

.info-header--photo .info-header-about {
  padding: 24px var(--ih-pad) 12px;
}

.description-text {
  max-width: 46rem;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: 0;
  color: color-mix(in oklab, var(--foreground) 88%, transparent);
  cursor: pointer;
}

@container info-header (min-width: 900px) {
  .description-text {
    font-size: 19px;
  }
}

.description-text :deep(a) {
  color: var(--primary);
}

.description-text :deep(div) {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
}

/* an artist's biography stays short so the discography follows soon */
.info-header--artist .description-text :deep(div) {
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

@media (max-width: 1280px) {
  .description-text :deep(div) {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}

.selectable {
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
}
</style>

<style>
/* --------------------------------------------------------------------------
   The sections of an item's details page, below this header. Every details
   view wraps its listings in .item-details-body and renders this header, so
   the shared page rhythm lives here: 48px sides on desktop (the toolbars
   inside add their own 10px), section headings in the display serif.
   -------------------------------------------------------------------------- */
.item-details-body {
  display: flex;
  flex-direction: column;
  row-gap: 24px;
  padding: 4px clamp(6px, calc(4vw - 10px), 38px) 32px;
}

.item-details-body > * {
  min-width: 0;
}

.item-details-body .v-toolbar-title {
  font-family: var(--font-heading);
  font-size: 26px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.item-details-body .v-toolbar-title .toolbar-title-wrapper {
  flex-direction: row;
  /* the base wrapper centres its column vertically; laid out as a row that
     would centre the heading across the page instead */
  justify-content: flex-start;
  align-items: baseline;
  column-gap: 12px;
}

.item-details-body .v-toolbar-title .toolbar-subtitle {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 1;
  color: var(--subtle-foreground);
}

@media (max-width: 539px) {
  .item-details-body .v-toolbar-title {
    font-size: 22px;
  }
}
</style>

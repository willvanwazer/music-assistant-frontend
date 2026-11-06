<template>
  <div class="genres-page">
    <!-- the page heading, as on the other library pages; the add-genre menu
         sits beside it -->
    <header class="genres-head">
      <div class="genres-head__text">
        <div class="genres-head__eyebrow">{{ $t("library") }}</div>
        <h1 class="genres-head__title ma-display">{{ $t("genres") }}</h1>
        <div v-if="store.libraryGenresCount" class="genres-head__count">
          {{ $t("items_total", [store.libraryGenresCount.toLocaleString()]) }}
        </div>
      </div>
      <Toolbar
        v-if="menuItems.length"
        class="genres-head__menu"
        :menu-items="menuItems"
        :enforce-overflow-menu="true"
      />
    </header>
    <ItemsListing
      v-for="section in sections"
      :key="`${section.key}-${refreshKey}`"
      itemtype="genres"
      :path="`librarygenres_${section.key}`"
      :title="$t(section.label)"
      :icon="section.icon"
      :show-provider="false"
      :show-favorites-only-filter="true"
      :show-hide-empty-filter="true"
      :show-search-button="true"
      :allow-collapse="true"
      :hide-on-empty="false"
      :sort-keys="sortKeys"
      :limit="50"
      :infinite-scroll="false"
      :load-paged-data="section.load"
    />
    <AddGenreDialog v-model="showAddGenreDialog" @success="handleGenreAdded" />
  </div>
</template>

<script setup lang="ts">
import { Plus } from "@lucide/vue";
import AddGenreDialog from "@/components/AddGenreDialog.vue";
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import Toolbar, { type ToolBarMenuItem } from "@/components/Toolbar.vue";
import { genreContentTypeIcon } from "@/helpers/genre";
import api from "@/plugins/api";
import {
  EventMessage,
  EventType,
  Genre,
  MediaType,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { store } from "@/plugins/store";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({
  name: "Genres",
});

const showAddGenreDialog = ref(false);
const refreshKey = ref(0);

const sortKeys = [
  "name",
  "name_desc",
  "sort_name",
  "sort_name_desc",
  "timestamp_added",
  "timestamp_added_desc",
  "play_count",
  "play_count_desc",
];

// one collapsible section per taxonomy, scoped server-side via content_type. Server-paged so
// each section's own filters (favorites / default-non-empty-all / search) re-fetch.
const loadSection = (contentType: MediaType | "music") => {
  return async (params: LoadDataParams): Promise<Genre[]> => {
    return await api.getLibraryGenres({
      content_type: contentType,
      favorite: params.favoritesOnly || undefined,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
      order_by: params.sortBy,
      hide_empty: params.hideEmptyFilter,
    });
  };
};

const sections = [
  {
    key: "music",
    label: "genre_content_type.music",
    icon: genreContentTypeIcon(null),
    load: loadSection("music"),
  },
  {
    key: "podcasts",
    label: "genre_content_type.podcasts",
    icon: genreContentTypeIcon(MediaType.PODCAST),
    load: loadSection(MediaType.PODCAST),
  },
  {
    key: "audiobooks",
    label: "genre_content_type.audiobooks",
    icon: genreContentTypeIcon(MediaType.AUDIOBOOK),
    load: loadSection(MediaType.AUDIOBOOK),
  },
];

const menuItems = computed<ToolBarMenuItem[]>(() => {
  if (!authManager.isAdmin()) return [];
  return [
    {
      label: "add_genre",
      labelArgs: [],
      icon: Plus,
      action: () => {
        showAddGenreDialog.value = true;
      },
    },
  ];
});

const handleGenreAdded = () => {
  refreshKey.value++;
};

onMounted(() => {
  const unsub = api.subscribe_multi(
    [
      EventType.MEDIA_ITEM_ADDED,
      EventType.MEDIA_ITEM_UPDATED,
      EventType.MEDIA_ITEM_DELETED,
    ],
    (evt: EventMessage) => {
      if (evt.object_id?.startsWith("library://genre")) {
        refreshKey.value++;
      }
    },
  );

  onBeforeUnmount(() => {
    unsub();
  });
});
</script>

<style scoped>
/* the same room either side as the other library pages */
.genres-page {
  --genres-gutter: 34px;
  padding-inline: var(--genres-gutter);
}

.genres-head {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 44px 10px 20px;
}

.genres-head__text {
  flex: 1 1 auto;
  min-width: 0;
}

.genres-head__eyebrow {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--subtle-foreground);
}

.genres-head__title {
  margin: 12px 0 0;
  font-size: 56px;
  line-height: 1;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.genres-head__count {
  margin-top: 12px;
  font-size: 14px;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* only the menu button of the toolbar is wanted here, beside the heading */
.genres-head__menu.v-toolbar {
  flex: none;
  width: auto;
  background: transparent;
}

@media (max-width: 960px) {
  .genres-page {
    --genres-gutter: 14px;
  }

  .genres-head {
    padding-top: 28px;
  }

  .genres-head__title {
    font-size: 44px;
  }
}

@media (max-width: 500px) {
  .genres-page {
    --genres-gutter: 6px;
  }

  .genres-head {
    padding: 20px 10px 14px;
  }

  .genres-head__title {
    font-size: 38px;
  }
}
</style>

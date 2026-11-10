<template>
  <div>
    <div v-if="loading" class="ed-loading">
      <v-progress-circular indeterminate />
    </div>

    <template v-else>
      <div ref="listEl" class="ed-rows">
        <div
          v-for="(row, idx) in displayedRows"
          :key="row.id"
          class="ed-row"
          :data-drag-index="idx"
          :class="{ 'ed-row--drag-source': draggingIndex === idx }"
          :style="
            isDragging
              ? {
                  transform: `translateY(${rowOffset(idx)}px)`,
                  transition:
                    draggingIndex !== idx ? 'transform 200ms ease-out' : 'none',
                }
              : undefined
          "
        >
          <ListeningHighlights
            v-if="row.kind === 'podcasts'"
            section="podcasts"
          >
            <template v-if="editMode" #actions>
              <button
                class="ed-drag-handle"
                :aria-label="$t('queue_reorder')"
                @pointerdown.stop.prevent="startItemDrag($event, idx)"
                @click.stop
              >
                <GripVertical />
              </button>
            </template>
          </ListeningHighlights>
          <!-- Players row -->
          <EditorialShelf
            v-if="row.kind === 'players'"
            :ref="setPlayersShelfRef"
            class="ed-players"
            :gap="12"
            :nav-center="42"
            :dimmed="editMode && row.hidden"
          >
            <template #header>
              <div class="ed-players__head">
                <h2 class="ed-players__label text-foreground">
                  {{ $t("players") }}
                </h2>
                <span v-if="activeCount" class="ed-players__count">
                  <span class="ed-players__live" aria-hidden="true"></span>
                  {{ activeCount }} {{ $t("state.playing") }}
                </span>
              </div>
            </template>
            <template v-if="editMode" #actions>
              <button
                class="ed-drag-handle"
                :aria-label="$t('queue_reorder')"
                @pointerdown.stop.prevent="startItemDrag($event, idx)"
                @click.stop
              >
                <GripVertical />
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                :aria-label="$t('tooltip.toggle_players')"
                @click="toggleRow(row)"
              >
                <Eye v-if="!row.hidden" />
                <EyeOff v-else />
              </Button>
            </template>
            <div
              v-for="player in players"
              :key="player.player_id"
              class="ed-player-slot"
              :data-player-id="player.player_id"
            >
              <PlayerCard
                :player="player"
                :show-volume-control="false"
                :show-menu-button="false"
                :show-child-volumes="false"
                :show-group-controls="false"
                @click="playerClicked(player)"
              />
            </div>
          </EditorialShelf>

          <!-- Pinned row: items the user pinned via "Pin to Home" -->
          <EditorialShelf
            v-else-if="row.kind === 'pinned'"
            :title="$t('home_pins.title')"
            :dimmed="editMode && row.hidden"
            :tiles-per-view="tilesPerView"
          >
            <template v-if="editMode" #actions>
              <button
                class="ed-drag-handle"
                :aria-label="$t('queue_reorder')"
                @pointerdown.stop.prevent="startItemDrag($event, idx)"
                @click.stop
              >
                <GripVertical />
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                :aria-label="$t('tooltip.toggle_row')"
                @click="toggleRow(row)"
              >
                <Eye v-if="!row.hidden" />
                <EyeOff v-else />
              </Button>
            </template>
            <EditorialMediaCard
              v-for="item in pinnedItems"
              :key="item.uri"
              :item="item"
              home-pin-context
            />
          </EditorialShelf>

          <!-- Top picks row: an accent-derived band of whole covers, the
               lead pick larger with its text beside it -->
          <section
            v-else-if="row.kind === 'top_picks'"
            class="ed-section ed-hero-row"
            :class="{ 'ed-dimmed': editMode && row.hidden }"
          >
            <div class="ed-band">
              <div class="ed-hero-row__head">
                <div class="ed-hero-row__title-group">
                  <h2 class="ed-hero-row__title">
                    {{ $t("top_picks_for_you") }}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="ed-band__btn"
                    :title="$t('refresh')"
                    :disabled="heroRefreshing"
                    @click="refreshTopPicks"
                  >
                    <RefreshCw
                      :class="{ 'ed-hero-refresh--spinning': heroRefreshing }"
                    />
                  </Button>
                </div>
                <div class="ed-hero-row__aside">
                  <div v-if="editMode" class="ed-edit-controls">
                    <button
                      class="ed-drag-handle"
                      :aria-label="$t('queue_reorder')"
                      @pointerdown.stop.prevent="startItemDrag($event, idx)"
                      @click.stop
                    >
                      <GripVertical />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="ed-band__btn"
                      :aria-label="$t('tooltip.toggle_top_picks')"
                      @click="toggleRow(row)"
                    >
                      <Eye v-if="!row.hidden" />
                      <EyeOff v-else />
                    </Button>
                  </div>
                  <!-- quiet scroll arrows, only while the band overflows -->
                  <div
                    v-if="canHover && (heroCanLeft || heroCanRight)"
                    class="ed-hero-navs"
                  >
                    <button
                      type="button"
                      class="ed-hero-nav ed-hero-nav--left"
                      :disabled="!heroCanLeft"
                      :aria-label="$t('tooltip.scroll_left')"
                      @click="scrollHero(-1)"
                    >
                      <ChevronLeft :size="16" />
                    </button>
                    <button
                      type="button"
                      class="ed-hero-nav ed-hero-nav--right"
                      :disabled="!heroCanRight"
                      :aria-label="$t('tooltip.scroll_right')"
                      @click="scrollHero(1)"
                    >
                      <ChevronRight :size="16" />
                    </button>
                  </div>
                </div>
              </div>

              <div ref="heroGrid" class="ed-hero-grid" @scroll="updateHeroNav">
                <EditorialHeroCard
                  class="ed-hero-grid__lead"
                  :item="heroEntries[0].item"
                  :tag="heroEntries[0].tag"
                  large
                />
                <EditorialHeroCard
                  v-for="entry in heroRest"
                  :key="entry.item.uri"
                  :item="entry.item"
                  :tag="entry.tag"
                />
              </div>
            </div>
          </section>

          <!-- Timeline recommendation -->
          <EditorialTimeline
            v-if="
              row.kind === 'recommendation' &&
              row.folder?.type === RecommendationFolderType.TIMELINE &&
              rowItemsMap.get(row.id) !== undefined
            "
            :title="row.folder.name"
            :provider="row.folder.provider"
            :items="rowItemsMap.get(row.id) ?? []"
            :dimmed="editMode && row.hidden"
            :tiles-per-view="tilesPerView"
          >
            <template v-if="editMode" #actions>
              <button
                class="ed-drag-handle"
                :aria-label="$t('queue_reorder')"
                @pointerdown.stop.prevent="startItemDrag($event, idx)"
                @click.stop
              >
                <GripVertical />
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                :aria-label="$t('tooltip.toggle_row')"
                @click="toggleRow(row)"
              >
                <Eye v-if="!row.hidden" />
                <EyeOff v-else />
              </Button>
            </template>
          </EditorialTimeline>

          <!-- Recommendation shelf (including timeline loading state) -->
          <EditorialShelf
            v-else-if="row.kind === 'recommendation' && row.folder"
            :title="row.folder.name"
            :subtitle="row.folder.subtitle"
            :provider="folderProvider(row.folder)"
            :dimmed="editMode && row.hidden"
            :tiles-per-view="tilesPerView"
          >
            <template
              v-if="editMode || rowSupportsProviderFilter(row.folder)"
              #actions
            >
              <template v-if="editMode">
                <button
                  class="ed-drag-handle"
                  :aria-label="$t('queue_reorder')"
                  @pointerdown.stop.prevent="startItemDrag($event, idx)"
                  @click.stop
                >
                  <GripVertical />
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="$t('tooltip.toggle_row')"
                  @click="toggleRow(row)"
                >
                  <Eye v-if="!row.hidden" />
                  <EyeOff v-else />
                </Button>
              </template>
              <FacetedFilter
                v-if="rowSupportsProviderFilter(row.folder)"
                :model-value="getRowHiddenProviders(row.id)"
                :title="$t('tooltip.hide_provider')"
                :options="providerFilterOptions"
                @update:model-value="
                  (providerIds) =>
                    onRowHiddenProvidersChange(row.id, providerIds)
                "
              >
                <template #trigger>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    :aria-label="$t('tooltip.hide_provider')"
                  >
                    <ListFilter />
                  </Button>
                </template>
              </FacetedFilter>
            </template>
            <!-- Skeleton tiles while a fetch is in flight - and for hidden rows
                 in edit mode (never fetched until unhidden) - so every row
                 reserves its final height and nothing shifts as items land. -->
            <template v-if="rowItemsMap.get(row.id) === undefined">
              <EditorialCardSkeleton
                v-for="n in skeletonTileCount"
                :key="`skeleton-${n}`"
              />
            </template>
            <template
              v-else-if="
                (rowItemsMap.get(row.id)?.length ?? 0) === 0 &&
                rowHasActiveFilter(row)
              "
            >
              <p class="ed-shelf__empty">{{ $t("no_content_filter") }}</p>
            </template>
            <template v-else>
              <EditorialMediaCard
                v-for="item in rowItemsMap.get(row.id) ?? []"
                :key="item.uri"
                :item="item"
              />
            </template>
          </EditorialShelf>

          <!-- Genres row -->
          <section
            v-else-if="row.kind === 'genres'"
            class="ed-section ed-genres"
            :class="{ 'ed-dimmed': editMode && row.hidden }"
          >
            <div class="ed-genres__head">
              <h2 class="ed-genres__title">{{ $t("browse_by_genre") }}</h2>
              <div v-if="editMode" class="ed-edit-controls">
                <button
                  class="ed-drag-handle"
                  :aria-label="$t('queue_reorder')"
                  @pointerdown.stop.prevent="startItemDrag($event, idx)"
                  @click.stop
                >
                  <GripVertical />
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :title="
                    row.hidden ? $t('settings.enable') : $t('settings.disable')
                  "
                  :aria-label="
                    row.hidden ? $t('settings.enable') : $t('settings.disable')
                  "
                  @click="toggleRow(row)"
                >
                  <Eye v-if="!row.hidden" />
                  <EyeOff v-else />
                </Button>
              </div>
            </div>
            <!-- a full set of eight reads as a mosaic: one large tile, one
                 wide one, the rest regular -->
            <div
              class="ed-genres__grid"
              :class="{ 'ed-genres__grid--mosaic': genres.length === 8 }"
            >
              <EditorialGenreTile
                v-for="genre in genres"
                :key="genre.uri"
                :item="genre"
                :counts="genreCounts[genre.item_id]"
              />
            </div>
          </section>
        </div>

        <!-- Floating ghost that follows the pointer while dragging a row -->
        <div
          v-if="isDragging && draggedRow"
          class="ed-drag-ghost"
          :style="{ top: `${ghostY}px` }"
        >
          <GripVertical class="ed-drag-ghost__icon" />
          <span class="ed-drag-ghost__title">{{ draggedRow.title }}</span>
        </div>
      </div>

      <div class="ed-footer-space"></div>
    </template>
  </div>
</template>

<script lang="ts">
import type {
  Genre,
  ItemMapping,
  MediaItemTypeOrItemMapping,
  RecommendationFolder,
} from "@/plugins/api/interfaces";

// Snapshot taken on unmount so a back/forward navigation back to Discover
// renders the previous page instantly instead of refetching from empty.
interface DiscoverSnapshot {
  recommendations: RecommendationFolder[];
  recentlyPlayed: ItemMapping[];
  rowItemsMap: Map<string, MediaItemTypeOrItemMapping[]>;
  genres: Genre[];
  genreCounts: Record<string, Record<string, number>>;
  scrollPos: number;
}
let prevState: DiscoverSnapshot | undefined;
</script>

<script setup lang="ts">
import ListeningHighlights from "@/components/discover/ListeningHighlights.vue";
import EditorialCardSkeleton from "@/components/discover/EditorialCardSkeleton.vue";
import EditorialGenreTile from "@/components/discover/EditorialGenreTile.vue";
import EditorialHeroCard from "@/components/discover/EditorialHeroCard.vue";
import EditorialMediaCard from "@/components/discover/EditorialMediaCard.vue";
import EditorialShelf, {
  type EditorialShelfExpose,
} from "@/components/discover/EditorialShelf.vue";
import EditorialTimeline from "@/components/discover/EditorialTimeline.vue";
import {
  isImportRecommendation,
  topPickItems,
} from "@/components/discover/utils/topPicks";
import {
  GENRES_ROW_ID,
  IN_PROGRESS_ROW_ID,
  PINNED_ROW_ID,
  PLAYERS_ROW_ID,
  PODCASTS_ROW_ID,
  TOP_PICKS_ROW_ID,
  defaultDiscoverRowOrder,
  discoverRowItems,
  isDefaultHiddenSpokenRow,
  isSpokenWordRow,
  resolveDiscoverRowsConfig,
  setDiscoverRowHidden,
  setDiscoverRowsOrder,
} from "@/components/discover/utils/discoverRows";
import {
  isRecommendationRowVisible,
  rowIdsNeedingItems,
} from "@/components/discover/utils/rowItems";
import {
  eligibleFilterProviders,
  getRowHiddenProviders,
  resolveProviderFilterParam,
  rowSupportsProviderFilter,
  setRowHiddenProviders,
} from "@/components/discover/utils/rowProviderFilter";
import FacetedFilter from "@/components/FacetedFilter.vue";
import PlayerCard from "@/components/PlayerCard.vue";
import { Button } from "@/components/ui/button";
import { useHomePins } from "@/composables/useHomePins";
import { useListDragReorder } from "@/composables/useListDragReorder";
import { useOrderedPlayers } from "@/composables/useOrderedPlayers";
import { shelfTilesPerView } from "@/helpers/utils";
import api from "@/plugins/api";
import {
  EventType,
  MediaType,
  PlaybackState,
  RecommendationFolderType,
  type EventMessage,
  type Player,
  type PlaylogUpdate,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  ListFilter,
  RefreshCw,
} from "@lucide/vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(defineProps<{ editMode?: boolean }>(), {
  editMode: false,
});
const emit = defineEmits<{
  catalogItems: [items: MediaItemTypeOrItemMapping[]];
}>();

const router = useRouter();

const loading = ref(true);
const playersShelf = ref<EditorialShelfExpose | null>(null);
// The row catalog (every available row, `items` always `[]`).
const recommendations = ref<RecommendationFolder[]>([]);
// Items fetched per row, keyed by folder uri. Absent = not loaded yet.
const rowItemsMap = ref(new Map<string, MediaItemTypeOrItemMapping[]>());
const recentlyPlayed = ref<ItemMapping[]>([]);
const genres = ref<Genre[]>([]);
// Per-genre media counts from the ranking fetch, kept for the tiles' count
// line. Empty when the counts endpoint is unavailable.
const genreCounts = ref<Record<string, Record<string, number>>>({});

const tilesPerView = computed(() => shelfTilesPerView());

// One skeleton per (partially) visible tile while a row's items load.
const skeletonTileCount = computed(() =>
  Math.max(2, Math.ceil(tilesPerView.value)),
);

const players = useOrderedPlayers();
const { items: pinnedItems } = useHomePins();

const providerDomainOf = (instanceId: string): string | undefined =>
  api.providers[instanceId]?.domain;

const SPOKEN_WORD_MEDIA_TYPES = new Set<string>([
  MediaType.AUDIOBOOK,
  MediaType.PODCAST,
  MediaType.PODCAST_EPISODE,
]);
const isSpokenWordItem = (item: MediaItemTypeOrItemMapping) =>
  SPOKEN_WORD_MEDIA_TYPES.has(item.media_type);

const activeCount = computed(
  () =>
    players.value.filter((p) => p.playback_state == PlaybackState.PLAYING)
      .length,
);

function playerClicked(player: Player) {
  store.activePlayerId = player.player_id;
}

const setPlayersShelfRef = (el: unknown) => {
  playersShelf.value = (el as EditorialShelfExpose | null) ?? null;
};

const playersOrderKey = computed(() =>
  players.value.map((p) => p.player_id).join(","),
);

function alignPlayersShelf() {
  const shelf = playersShelf.value;
  if (!shelf) return;
  const activeId = store.activePlayerId;
  if (activeId) {
    shelf.alignItemStart(`[data-player-id="${activeId}"]`);
  } else {
    shelf.scrollToStart();
  }
}

const showPlayers = computed(() =>
  displayedRows.value.some((row) => row.kind === "players"),
);

watch(playersOrderKey, () => {
  if (!showPlayers.value) return;
  nextTick(alignPlayersShelf);
});

watch(loading, (isLoading) => {
  if (!isLoading) nextTick(alignPlayersShelf);
});

watch(
  () => store.activePlayerId,
  () => {
    if (!showPlayers.value) return;
    nextTick(alignPlayersShelf);
  },
);

const folderProvider = (folder: RecommendationFolder) => folder.provider || "";

// Provider instances a user may filter recommendation rows by -- currently
// loaded music providers, restricted to the user's own provider_filter when set.
const providerFilterOptions = computed(() =>
  eligibleFilterProviders(
    Object.values(api.providers),
    store.currentUser?.provider_filter ?? [],
  )
    .map((provider) => ({
      value: provider.instance_id,
      label: provider.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);

const providerFilterParamForRow = (rowId: string): string[] | undefined =>
  resolveProviderFilterParam(
    providerFilterOptions.value.map((option) => option.value),
    getRowHiddenProviders(rowId),
  );

// Persists the row's hidden-provider choice and re-fetches just that row so
// its items reflect the new filter. Clears the row's cached items first: the
// preference (read by rowHasActiveFilter) updates synchronously, but the
// refetch is async, so leaving the stale, now-mismatched items in place could
// drop the row (and its filter control) from view for that gap.
const onRowHiddenProvidersChange = (
  rowId: string,
  hiddenProviderIds: string[],
): void => {
  setRowHiddenProviders(rowId, hiddenProviderIds);
  rowItemsMap.value.delete(rowId);
  fetchRowItems([rowId]);
};

// Whether a row currently has eligible provider(s) hidden -- used to keep the
// row (and its filter control) visible even if that filter empties its results.
const rowHasActiveFilter = (row: DiscoverRow): boolean =>
  row.folder !== undefined &&
  rowSupportsProviderFilter(row.folder) &&
  providerFilterParamForRow(row.id) !== undefined;

// --- Top Picks (Model B): a balanced interleave of items across the rows the
// user has enabled. Only shown, non-empty recommendation folders feed it, so
// the mix reflects the user's enabled rows; recently-played fills any
// shortfall. ---
interface HeroEntry {
  item: MediaItemTypeOrItemMapping;
  tag: string;
}
// 1 large lead card + the rest as regular cards (a horizontal scroller).
const HERO_COUNT = 9;

const shuffled = <T,>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildHeroEntries = (randomize = false): HeroEntry[] => {
  // Each shown (non-hidden), non-empty folder contributes its items under its
  // own tag, so an opted-out row never feeds the hero. `randomize` (explicit
  // refresh) reshuffles the row order and the items within a row; the resolve
  // path stays deterministic so repeated builds are content-equal.
  // Audiobook and podcast rows have their own shelves; top picks stay music.
  const rows = recommendations.value
    .filter(
      (f) =>
        shownRecRowIds.value.has(f.uri) &&
        !isSpokenWordRow(f, providerDomainOf),
    )
    .map((f) => ({
      tag: isImportRecommendation(f)
        ? $t("listening_home.new_release")
        : f.name,
      items: topPickItems(f, rowItemsMap.value.get(f.uri) ?? []).filter(
        (item) => !isSpokenWordItem(item),
      ),
    }))
    .filter((r) => r.items.length > 0)
    .map((r) => ({
      tag: r.tag,
      items: randomize ? shuffled(r.items) : r.items,
    }));
  const sources = randomize ? shuffled(rows) : rows;

  const seen = new Set<string>();
  const out: HeroEntry[] = [];
  const push = (item: MediaItemTypeOrItemMapping | undefined, tag: string) => {
    if (item && !seen.has(item.uri) && out.length < HERO_COUNT) {
      seen.add(item.uri);
      out.push({ item, tag });
    }
  };

  // Round-robin: one item per row per pass, so the mix is balanced across rows.
  const maxLen = sources.reduce((m, r) => Math.max(m, r.items.length), 0);
  for (let i = 0; i < maxLen && out.length < HERO_COUNT; i++) {
    for (const r of sources) push(r.items[i], r.tag);
  }

  // Fill any shortfall from recently played.
  for (const item of recentlyPlayed.value) {
    if (!isSpokenWordItem(item)) push(item, $t("recently_played"));
  }

  return out;
};

const heroEntries = ref<HeroEntry[]>([]);
// Everything after the lead card, in order.
const heroRest = computed<HeroEntry[]>(() => heroEntries.value.slice(1));

// --- Top Picks horizontal scroller (lead + cards that overflow on narrower
// screens) with header arrows, mirroring EditorialShelf's nav affordance. ---
// Only offer the arrows on hover-capable devices; touch users swipe the band.
const canHover = window.matchMedia?.("(hover: hover)")?.matches ?? true;
const heroGrid = ref<HTMLElement | null>(null);
const heroCanLeft = ref(false);
const heroCanRight = ref(false);

const updateHeroNav = () => {
  const el = heroGrid.value;
  if (!el) return;
  heroCanLeft.value = el.scrollLeft > 1;
  heroCanRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
};

const scrollHero = (dir: number) => {
  const el = heroGrid.value;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
};

let heroRo: ResizeObserver | undefined;
let observedHeroGrid: HTMLElement | null = null;

const observeHero = () => {
  const el = heroGrid.value;
  if (!(el instanceof HTMLElement)) {
    heroRo?.disconnect();
    observedHeroGrid = null;
    return;
  }
  updateHeroNav();
  if (!("ResizeObserver" in window)) return;
  heroRo ??= new ResizeObserver(updateHeroNav);
  if (observedHeroGrid === el) return;
  heroRo.disconnect();
  heroRo.observe(el);
  observedHeroGrid = el;
};

watch(heroEntries, () => nextTick(observeHero), { deep: false });

// Assign heroEntries only when the picks actually changed — cheap insurance
// against redundant re-renders from repeated builds with identical content.
const heroEntriesEqual = (a: HeroEntry[], b: HeroEntry[]) =>
  a.length === b.length &&
  a.every((e, i) => e.item.uri === b[i].item.uri && e.tag === b[i].tag);
const setHeroEntries = (next: HeroEntry[]) => {
  if (!heroEntriesEqual(heroEntries.value, next)) heroEntries.value = next;
};

const resolveHeroPicks = () => {
  setHeroEntries(buildHeroEntries());
};

const heroRefreshing = ref(false);
const refreshTopPicks = async () => {
  if (heroRefreshing.value) return;
  heroRefreshing.value = true;
  try {
    await refreshShownRowItems();
    heroEntries.value = buildHeroEntries(true);
  } finally {
    heroRefreshing.value = false;
  }
};

// --- Unified row list: visibility + ordering via the discover.rows pref ---
type DiscoverRowKind =
  | "players"
  | "pinned"
  | "top_picks"
  | "podcasts"
  | "recommendation"
  | "genres";

interface DiscoverRow {
  id: string;
  kind: DiscoverRowKind;
  title: string;
  hidden: boolean;
  folder?: RecommendationFolder;
}

// The catalog is always complete (server always returns every row, `items`
// aside), so every recommendation folder is a candidate row. Server default-off
// rows start hidden, as do all audiobook-provider shelves.
const defaultHiddenIds = computed(() =>
  recommendations.value
    .filter(
      (f) =>
        !f.enabled_by_default || isDefaultHiddenSpokenRow(f, providerDomainOf),
    )
    .map((f) => f.uri),
);

// Default order of every candidate row: music first, podcasts and audiobooks
// below it.
const availableRowIds = computed<string[]>(() =>
  defaultDiscoverRowOrder({
    hasPlayers: players.value.length > 0,
    hasPinned: pinnedItems.value.length > 0,
    hasTopPicks: heroEntries.value.length > 0,
    hasGenres: genres.value.length > 0,
    folders: recommendations.value.map((f) => ({
      uri: f.uri,
      spokenWord: isSpokenWordRow(f, providerDomainOf),
      recentlyPlayed: f.item_id === "recently_played",
    })),
  }),
);

const allRows = computed<DiscoverRow[]>(() => {
  const { order, hidden } = resolveDiscoverRowsConfig(
    availableRowIds.value,
    defaultHiddenIds.value,
  );
  const folders = new Map(recommendations.value.map((d) => [d.uri, d]));
  const rows: DiscoverRow[] = [];
  for (const id of order) {
    if (id === PLAYERS_ROW_ID) {
      rows.push({
        id,
        kind: "players",
        title: $t("players"),
        hidden: hidden.has(id),
      });
    } else if (id === PINNED_ROW_ID) {
      rows.push({
        id,
        kind: "pinned",
        title: $t("home_pins.title"),
        hidden: hidden.has(id),
      });
    } else if (id === TOP_PICKS_ROW_ID) {
      rows.push({
        id,
        kind: "top_picks",
        title: $t("top_picks_for_you"),
        hidden: hidden.has(id),
      });
    } else if (id === PODCASTS_ROW_ID) {
      rows.push({ id, kind: "podcasts", title: $t("podcasts"), hidden: false });
    } else if (id === GENRES_ROW_ID) {
      rows.push({
        id,
        kind: "genres",
        title: $t("browse_by_genre"),
        hidden: hidden.has(id),
      });
    } else {
      const folder = folders.get(id);
      if (!folder) continue;
      rows.push({
        id,
        kind: "recommendation",
        title: folder.name,
        hidden: hidden.has(id),
        folder,
      });
    }
  }
  return rows;
});

const displayedRows = computed(() =>
  allRows.value.filter((row) =>
    row.kind === "recommendation"
      ? isRecommendationRowVisible(
          row,
          rowItemsMap.value.get(row.id),
          props.editMode,
          rowHasActiveFilter(row),
        )
      : props.editMode || !row.hidden,
  ),
);

watch(
  computed(() =>
    displayedRows.value.flatMap((row) => {
      if (row.hidden || loading.value) return [];
      if (row.kind === "pinned") return pinnedItems.value;
      if (row.kind === "top_picks")
        return heroEntries.value.map((entry) => entry.item);
      if (row.kind === "recommendation")
        return rowItemsMap.value.get(row.id) ?? [];
      return [];
    }),
  ),
  (items) => emit("catalogItems", items),
  { immediate: true },
);

// The recommendation rows currently visible to the user (not hidden). The Top
// Picks hero draws only from these, so an opted-out row never feeds it.
const shownRecRowIds = computed(
  () =>
    new Set(
      allRows.value
        .filter((r) => r.kind === "recommendation" && !r.hidden)
        .map((r) => r.id),
    ),
);

const toggleRow = (row: DiscoverRow) => {
  const wasHidden = row.hidden;
  setDiscoverRowHidden(row.id, !wasHidden);
  // Showing a row for the first time: fetch its items if we haven't already.
  if (
    wasHidden &&
    row.kind === "recommendation" &&
    !rowItemsMap.value.has(row.id)
  ) {
    fetchRowItems([row.id]);
  }
};

// --- Drag-to-reorder (edit mode), same interaction as the navigation menu ---
const listEl = ref<HTMLElement | null>(null);

const { startItemDrag, draggingIndex, isDragging, ghostY, rowOffset } =
  useListDragReorder({
    listEl,
    count: () => displayedRows.value.length,
    onCommit: (from, to) => {
      const ids = displayedRows.value.map((row) => row.id);
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      setDiscoverRowsOrder(ids, availableRowIds.value);
    },
  });

const draggedRow = computed(() =>
  draggingIndex.value != null
    ? (displayedRows.value[draggingIndex.value] ?? null)
    : null,
);

// Fetches the row catalog (every available row; `items` always `[]`) plus the
// recently-played fallback for the Top Picks hero. Row content itself is
// fetched separately, per row, into `rowItemsMap`.
const loadRecommendationRows = async () => {
  // Preserve the currently shown rows on a (transient) refresh failure instead
  // of wiping them; log so a recurring failure is visible.
  const [rows, recent] = await Promise.allSettled([
    api.getRecommendations(),
    api.getRecentlyPlayedItems(12),
  ]);
  if (rows.status === "fulfilled") recommendations.value = rows.value;
  else console.error("Failed to load recommendations:", rows.reason);
  if (recent.status === "fulfilled") recentlyPlayed.value = recent.value;
  else console.error("Failed to load recently played:", recent.reason);
};

// Guards against a slower, superseded fetch overwriting a newer one for the
// same row (e.g. rapid provider-filter changes).
const rowFetchGeneration = new Map<string, number>();

// Fetches and stores items for the given recommendation row ids, in parallel.
// Each row's result lands in `rowItemsMap` as soon as its own fetch resolves.
const fetchRowItems = async (ids: string[]): Promise<void> => {
  const folders = new Map(recommendations.value.map((f) => [f.uri, f]));
  await Promise.all(
    ids.map(async (id) => {
      const folder = folders.get(id);
      if (!folder) return;
      const generation = (rowFetchGeneration.get(id) ?? 0) + 1;
      rowFetchGeneration.set(id, generation);
      const providers = rowSupportsProviderFilter(folder)
        ? providerFilterParamForRow(id)
        : undefined;
      const items = await api
        .getRecommendationItems(folder.provider, folder.item_id, providers)
        .catch((err) => {
          console.error(
            `Failed to load items for recommendation row ${id}:`,
            err,
          );
          return undefined;
        });
      if (rowFetchGeneration.get(id) !== generation) return;
      if (items !== undefined) {
        rowItemsMap.value.set(
          id,
          discoverRowItems(folder, items, providerDomainOf),
        );
      } else if (!rowItemsMap.value.has(id)) {
        // first load failed: mark the row empty so it does not spin forever;
        // on a refresh failure keep the previously shown items instead
        rowItemsMap.value.set(id, []);
      }
    }),
  );
};

// Fetches items for every currently-shown recommendation row that hasn't been
// loaded yet. Hidden rows (default-off, or toggled off) are skipped; they load
// on demand when unhidden.
const fetchMissingRowItems = (): Promise<void> =>
  fetchRowItems(
    rowIdsNeedingItems(
      allRows.value.filter((r) => r.kind === "recommendation"),
    ).filter((id) => !rowItemsMap.value.has(id)),
  );

// Re-fetches items for all shown recommendation rows, regardless of whether
// they're already loaded — feeds both the shelves and the Top Picks hero.
const refreshShownRowItems = (): Promise<void> =>
  fetchRowItems([...shownRecRowIds.value]);

// "Browse by genre": show the 8 genres with the most linked media items
// (most relevant to the user) rather than the first 8 alphabetically.
const loadGenres = async () => {
  const all = await api
    .getLibraryGenres({ hide_empty: true })
    .catch(() => [] as Genre[]);
  if (!all.length) return;
  let ranked = all;
  let counts: Record<string, Record<string, number>> = {};
  try {
    counts = await api.getGenreMediaCounts(all.map((g) => g.item_id));
    const total = (id: string) =>
      Object.values(counts[id] ?? {}).reduce((sum, n) => sum + n, 0);
    ranked = [...all].sort((a, b) => total(b.item_id) - total(a.item_id));
  } catch {
    // counts endpoint unavailable on older servers → keep server (name) order
  }
  genres.value = ranked.slice(0, 8);
  genreCounts.value = counts;
};

let unmounted = false;
let refreshRecommendationsTimer: ReturnType<typeof setTimeout> | undefined;
let historyTimer: ReturnType<typeof setInterval> | undefined;
let historyRefreshing = false;

const refreshVisibleHistory = async () => {
  if (unmounted || document.hidden || loading.value || historyRefreshing)
    return;
  historyRefreshing = true;
  try {
    await fetchRowItems(
      recommendations.value
        .filter(
          (folder) =>
            folder.item_id === "recently_played" &&
            shownRecRowIds.value.has(folder.uri),
        )
        .map((folder) => folder.uri),
    );
  } finally {
    historyRefreshing = false;
  }
};

const cancelScheduledRecommendationRefresh = () => {
  if (refreshRecommendationsTimer) {
    clearTimeout(refreshRecommendationsTimer);
    refreshRecommendationsTimer = undefined;
  }
};

const scheduleRecommendationRefresh = () => {
  cancelScheduledRecommendationRefresh();
  refreshRecommendationsTimer = setTimeout(async () => {
    refreshRecommendationsTimer = undefined;
    if (unmounted) return;
    // Refetches the catalog and the shown rows' content so play-history rows
    // and rotated picks stay current.
    await loadRecommendationRows();
    if (unmounted) return;
    await refreshShownRowItems();
    if (unmounted) return;
    resolveHeroPicks();
  }, 1500);
};

const isFinishedPlaybackEvent = (
  data: unknown,
): data is { is_playing: false } =>
  typeof data === "object" &&
  data !== null &&
  "is_playing" in data &&
  data.is_playing === false;

const unsubscribeRecommendations = api.subscribe(
  EventType.MEDIA_ITEM_PLAYED,
  (evt: EventMessage) => {
    // Only refetch when a track actually finished (is_playing = false),
    // not on the periodic ~30s progress reports that also emit this event.
    if (isFinishedPlaybackEvent(evt.data)) {
      scheduleRecommendationRefresh();
    }
  },
);

// Played or reset items leave the "in progress" row right away; partial progress
// (pause, another app syncing) belongs in the row, so only the refresh acts on it.
const unsubscribePlaylog = api.subscribe(
  EventType.PLAYLOG_UPDATED,
  (evt: EventMessage) => {
    const update = evt.data as PlaylogUpdate | undefined;
    // per-user playlog: ignore changes belonging to another user (null = everyone)
    if (update?.userid && update.userid !== store.currentUser?.user_id) return;
    const leavesInProgress =
      update && (update.fully_played || update.seconds_played === 0);
    const uri = update?.uri ?? evt.object_id;
    const items = rowItemsMap.value.get(IN_PROGRESS_ROW_ID);
    if (leavesInProgress && uri && items) {
      rowItemsMap.value.set(
        IN_PROGRESS_ROW_ID,
        items.filter((item) => item.uri !== uri),
      );
    }
    scheduleRecommendationRefresh();
  },
);

const unsubscribeProviderEvents = api.subscribe(
  EventType.PROVIDER_EVENT,
  (evt: EventMessage) => {
    if (
      evt.data &&
      typeof evt.data === "object" &&
      "event" in evt.data &&
      evt.data.event === "recommendations_updated"
    ) {
      scheduleRecommendationRefresh();
    }
  },
);

onMounted(async () => {
  // Genres is its own row and isn't part of the fast catalog call, so it
  // doesn't gate the page spinner.
  loadGenres();
  window.addEventListener("resize", updateHeroNav);
  // Spotify playback outside this app produces no local playlog event.
  historyTimer = setInterval(refreshVisibleHistory, 60_000);
  document.addEventListener("visibilitychange", refreshVisibleHistory);

  // A history back/forward traversal sets `forward` on the entry we're
  // returning to; a fresh navigation leaves it null.
  if (prevState && router.options.history.state.forward != null) {
    const snapshot = prevState;
    recommendations.value = snapshot.recommendations;
    recentlyPlayed.value = snapshot.recentlyPlayed;
    rowItemsMap.value = snapshot.rowItemsMap;
    genres.value = snapshot.genres;
    genreCounts.value = snapshot.genreCounts;
    resolveHeroPicks();
    loading.value = false;
    nextTick(() => {
      const el = document.querySelector(
        ".content-section",
      ) as HTMLElement | null;
      if (el) el.scrollTop = snapshot.scrollPos;
      observeHero();
    });

    // Refresh everything in the background so the restored page stays current.
    await loadRecommendationRows();
    if (unmounted) return;
    await refreshShownRowItems();
    if (unmounted) return;
    resolveHeroPicks();
    nextTick(() => {
      if (!unmounted) observeHero();
    });
    return;
  }

  await loadRecommendationRows();
  if (unmounted) return;
  loading.value = false;

  await fetchMissingRowItems();
  if (unmounted) return;
  resolveHeroPicks();
  nextTick(() => {
    if (!unmounted) observeHero();
  });
});

onBeforeUnmount(() => {
  unmounted = true;
  window.removeEventListener("resize", updateHeroNav);
  clearInterval(historyTimer);
  document.removeEventListener("visibilitychange", refreshVisibleHistory);
  unsubscribeRecommendations();
  unsubscribeProviderEvents();
  unsubscribePlaylog();
  cancelScheduledRecommendationRefresh();
  heroRo?.disconnect();
  heroRo = undefined;
  observedHeroGrid = null;

  const el = document.querySelector(".content-section");
  prevState = {
    recommendations: recommendations.value,
    recentlyPlayed: recentlyPlayed.value,
    rowItemsMap: rowItemsMap.value,
    genres: genres.value,
    genreCounts: genreCounts.value,
    scrollPos: el?.scrollTop ?? 0,
  };
});
</script>

<style scoped>
/* Discover rows. Horizontal rhythm follows the page gutter (--ed-page-gutter,
   set by HomeView); sections are ~40px apart. */
.ed-loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}
.ed-section {
  margin-bottom: 40px;
}

.ed-rows {
  position: relative;
}
.ed-row {
  position: relative;
}
.ed-row--drag-source {
  opacity: 0.35;
}

/* --- edit mode: quiet handles that only appear while editing --- */
.ed-edit-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.ed-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  opacity: 0.55;
  cursor: grab;
  touch-action: none;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;
}
.ed-drag-handle:hover {
  opacity: 0.9;
  background: color-mix(in oklab, currentColor 10%, transparent);
}
.ed-drag-handle:active {
  cursor: grabbing;
}
.ed-drag-handle svg {
  width: 16px;
  height: 16px;
}

.ed-drag-ghost {
  position: absolute;
  left: var(--ed-page-gutter, 28px);
  right: var(--ed-page-gutter, 28px);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 16px;
  border-radius: 12px;
  background: var(--popover);
  color: var(--popover-foreground);
  box-shadow:
    0 16px 40px -10px rgba(0, 0, 0, 0.45),
    0 0 0 1px var(--border);
  font-family: var(--font-heading);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.01em;
  opacity: 0.97;
  pointer-events: none;
  cursor: grabbing;
}
.ed-drag-ghost__icon {
  width: 16px;
  height: 16px;
  color: var(--subtle-foreground);
  flex-shrink: 0;
}
.ed-drag-ghost__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ed-dimmed {
  opacity: 0.4;
}
.ed-shelf__empty {
  min-width: 100%;
  padding: 8px;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

/* --- players ("around the house"): serif heading + live count; the cards
   themselves are PlayerCard's --- */
.ed-players {
  margin-top: 4px;
}
.ed-players :deep(.ed-shelf__track) {
  align-items: stretch;
}
.ed-players__head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  min-width: 0;
}
.ed-players__label {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 26px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.ed-players__count {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--subtle-foreground);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ed-players__live {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--primary);
  /* sits on the text's x-height rather than its baseline */
  transform: translateY(-1px);
}
.ed-player-slot {
  display: flex;
  flex: 0 0 auto;
  width: clamp(264px, 24vw, 320px);
  scroll-snap-align: start;
}
.ed-player-slot :deep([data-slot="card"]) {
  width: 100%;
}
.ed-player-slot :deep(.panel-item) {
  height: auto;
  margin-top: 0;
  margin-bottom: 0;
  max-width: 100%;
}
.ed-player-slot :deep(.panel-item-details .v-list-item__content) {
  min-width: 0;
  overflow: hidden;
}

/* --- top picks: a rounded band on an accent-derived surface. It stays dark
   in both themes, so its text is white; the covers sit whole on it with
   their text and the reason they were picked beneath. --- */
.ed-hero-row {
  padding: 0 var(--ed-page-gutter, 28px);
}
.ed-band {
  --ed-band-pad-x: 26px;
  --ed-band-gap: 22px;
  --ed-hero-art: 168px;
  --ed-lead-art: 232px;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 18px;
  padding: 20px var(--ed-band-pad-x) 0;
  background: color-mix(in oklab, var(--primary) 90%, #000 10%);
  color: #fff;
}
.dark .ed-band {
  background: color-mix(in oklab, var(--primary) 42%, #2a2a33);
}
/* a soft light from the top corner, so the surface is not flat */
.ed-band::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(
    60% 120% at 100% 0%,
    rgba(255, 255, 255, 0.14),
    transparent 60%
  );
  pointer-events: none;
}
.ed-hero-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
  margin-bottom: 14px;
}
.ed-hero-row__title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.ed-hero-row__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 24px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-hero-row__aside {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.ed-band__btn {
  color: rgba(255, 255, 255, 0.78);
}
.ed-band__btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}
.ed-band__btn:focus-visible {
  box-shadow: 0 0 0 2px #fff;
}
.ed-hero-refresh--spinning {
  animation: ed-hero-refresh-spin 0.8s linear infinite;
}
@keyframes ed-hero-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.ed-hero-navs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ed-hero-nav {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  transition:
    background 0.15s ease,
    opacity 0.15s ease;
}
.ed-hero-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}
.ed-hero-nav:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.ed-hero-nav:disabled {
  opacity: 0.4;
  cursor: default;
}
/* Horizontal scroller running edge to edge inside the band. The bottom
   padding leaves room for the lead cover's shadow. */
.ed-hero-grid {
  display: flex;
  align-items: flex-start;
  gap: var(--ed-band-gap);
  margin: 0 calc(-1 * var(--ed-band-pad-x));
  padding: 4px 0 24px var(--ed-band-pad-x);
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: var(--ed-band-pad-x);
  /* pan-y too: a vertical swipe starting on a tile must scroll the page */
  touch-action: pan-x pan-y;
  scrollbar-width: none;
}
.ed-hero-grid::-webkit-scrollbar {
  display: none;
}
.ed-hero-grid::after {
  content: "";
  flex: 0 0 calc(var(--ed-band-pad-x) - var(--ed-band-gap));
}
.ed-hero-grid__lead {
  margin-right: 6px;
}

/* --- genres: Roon-style duotone tiles; a full set of eight is a mosaic --- */
.ed-genres {
  padding: 0 var(--ed-page-gutter, 28px);
}
.ed-genres__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
  margin-bottom: 16px;
}
.ed-genres__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 26px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--foreground);
}
.ed-genres__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 128px;
  gap: 10px;
}
.ed-genres__grid--mosaic {
  grid-auto-flow: dense;
}
.ed-genres__grid--mosaic > :first-child {
  grid-column: span 2;
  grid-row: span 2;
}
.ed-genres__grid--mosaic > :nth-child(4) {
  grid-column: span 2;
}

.ed-footer-space {
  height: 40px;
}

@media (max-width: 1100px) {
  .ed-band {
    --ed-hero-art: 150px;
    --ed-lead-art: 214px;
  }
}

@media (max-width: 900px) {
  .ed-band {
    --ed-band-gap: 18px;
    --ed-hero-art: 140px;
    --ed-lead-art: 204px;
  }
  .ed-genres__grid {
    grid-auto-rows: 112px;
  }
}

@media (max-width: 600px) {
  .ed-section {
    margin-bottom: 24px;
  }
  /* on a phone the band runs edge to edge, like the prototype's */
  .ed-hero-row {
    padding: 0;
  }
  .ed-band {
    --ed-band-pad-x: 16px;
    --ed-band-gap: 12px;
    --ed-hero-art: 136px;
    --ed-lead-art: 184px;
    border-radius: 0;
    padding-top: 18px;
  }
  .ed-hero-row__head {
    margin-bottom: 12px;
  }
  .ed-hero-row__title,
  .ed-players__label,
  .ed-genres__title {
    font-size: 21px;
  }
  .ed-hero-grid {
    padding-bottom: 20px;
  }
  .ed-hero-grid__lead {
    margin-right: 0;
  }
  .ed-hero-navs {
    display: none;
  }
  .ed-genres__head {
    margin-bottom: 12px;
  }
  /* two columns of even tiles: a mosaic would only make the page longer */
  .ed-genres__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 92px;
    gap: 8px;
  }
  .ed-genres__grid--mosaic > :first-child,
  .ed-genres__grid--mosaic > :nth-child(4) {
    grid-column: auto;
    grid-row: auto;
  }
  .ed-drag-ghost {
    left: 16px;
    right: 16px;
  }
}
</style>

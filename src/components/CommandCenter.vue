<template>
  <CommandCenterShell
    v-model:open="isOpen"
    :title="$t('search')"
    :description="$t('type_to_search')"
  >
    <div
      data-slot="command-input-wrapper"
      class="cc-input"
      :class="{ 'cc-compact': mobileLayout }"
      @keydown.enter.capture="dismissKeyboardOnTouch"
    >
      <Search class="cc-input-icon" />
      <ListboxFilter
        ref="filterRef"
        v-model="query"
        data-slot="command-input"
        auto-focus
        enterkeyhint="done"
        :placeholder="$t('type_to_search')"
        class="cc-input-field placeholder:text-subtle-foreground w-full min-w-0 bg-transparent outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Spinner
        v-if="loading && queryActive"
        class="text-subtle-foreground size-4 shrink-0"
      />
      <button
        v-if="query"
        type="button"
        tabindex="-1"
        class="command-center-clear"
        @mousedown.prevent
        @click="clearQuery"
      >
        {{ $t("clear") }}
      </button>
      <Kbd v-if="!mobileLayout" :class="KBD_CLASS">esc</Kbd>
    </div>

    <div class="cc-scope" :class="{ 'cc-compact': mobileLayout }">
      <button
        type="button"
        tabindex="-1"
        class="command-center-chip"
        :data-active="!selectedMediaTypes.length && !pagesOnly"
        @mousedown.prevent
        @click="selectAllScope"
      >
        {{ $t("searchtype_all") }}
      </button>
      <button
        v-for="mediaType in SEARCHABLE_MEDIA_TYPES"
        :key="mediaType"
        type="button"
        tabindex="-1"
        class="command-center-chip"
        :data-active="selectedMediaTypes[0] === mediaType"
        @mousedown.prevent
        @click="toggleMediaType(mediaType)"
      >
        {{ $t(mediaType + "s") }}
      </button>
      <button
        type="button"
        tabindex="-1"
        class="command-center-chip"
        :data-active="pagesOnly"
        @mousedown.prevent
        @click="togglePagesOnly"
      >
        {{ $t("pages") }}
      </button>
    </div>

    <CommandList
      ref="listRef"
      class="cc-list"
      :class="
        mobileLayout
          ? 'min-h-0 max-h-none flex-1 px-3 pb-3'
          : 'h-[min(540px,62vh)] max-h-none px-4 pb-4'
      "
    >
      <!-- the strongest hit, picked out above the grouped rows. It is a
           shortcut to a row the list already holds, so it stays out of the
           listbox and its keyboard order -->
      <div v-if="topResult" class="cc-top-section">
        <div class="cc-eyebrow">{{ $t("topresult") }}</div>
        <div class="cc-top">
          <button
            type="button"
            tabindex="-1"
            class="cc-top-open"
            @mousedown.prevent
            @click="onMediaSelect(topResult)"
          >
            <span
              class="cc-top-art"
              :class="{ 'cc-top-art--round': isRoundThumb(topResult) }"
            >
              <MediaItemThumb :item="topResult" :size="88" :rounded="false" />
            </span>
            <span class="cc-top-text">
              <span class="cc-top-name">
                <template
                  v-for="(part, index) in highlightParts(topResult.name)"
                  :key="index"
                >
                  <mark
                    v-if="part.match"
                    class="cc-match"
                    v-text="part.text"
                  ></mark>
                  <span v-else v-text="part.text"></span>
                </template>
              </span>
              <span class="cc-top-type">{{ itemSubtitle(topResult) }}</span>
            </span>
          </button>
          <button
            type="button"
            tabindex="-1"
            class="cc-top-play"
            @mousedown.prevent
            @click.stop="onPlayClick(topResult, $event)"
          >
            <Play :size="14" fill="currentColor" :stroke-width="0" />
            {{ $t("play") }}
          </button>
        </div>
      </div>

      <CommandGroup
        v-if="recentResults.length"
        class="p-0"
        :heading="$t('recent_searches')"
      >
        <CommandItem
          v-for="term in recentResults"
          :key="`recent:${term}`"
          :value="`recent:${term}`"
          :class="ROW_CLASS"
          @select="query = term"
        >
          <span class="cc-row-icon">
            <History class="size-4" />
          </span>
          <span class="cc-row-label truncate">{{ term }}</span>
        </CommandItem>
      </CommandGroup>

      <div
        v-if="isSearching && !hasMediaResults"
        class="flex items-center justify-center py-14"
      >
        <Spinner class="text-subtle-foreground size-6" />
      </div>

      <CommandGroup
        v-for="section in mediaSections"
        :key="section.mediaType"
        class="p-0"
        :heading="section.title"
      >
        <CommandItem
          v-for="item in section.items"
          :key="item.uri"
          :value="item.uri"
          :class="ROW_CLASS"
          @select="onMediaSelect(item)"
        >
          <div
            class="cc-thumb"
            :class="{ 'cc-thumb--round': isRoundThumb(item) }"
          >
            <MediaItemThumb :item="item" :size="42" :rounded="false" />
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="cc-row-title truncate">
              <template
                v-for="(part, index) in highlightParts(item.name)"
                :key="index"
              >
                <mark
                  v-if="part.match"
                  class="cc-match"
                  v-text="part.text"
                ></mark>
                <span v-else v-text="part.text"></span>
              </template>
            </span>
            <span class="cc-row-meta truncate">
              {{ itemSubtitle(item) }}
            </span>
          </div>
          <div class="ml-auto flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              tabindex="-1"
              class="command-center-play"
              :aria-label="$t('play')"
              @mousedown.prevent
              @click.stop="onPlayClick(item, $event)"
            >
              <Play :size="14" fill="currentColor" :stroke-width="0" />
            </button>
            <ProviderIcon
              :domain="getListItemProviderIconDomain(item)"
              :size="18"
            />
          </div>
        </CommandItem>

        <button
          v-if="section.hasMore && !singleType"
          type="button"
          tabindex="-1"
          class="command-center-more"
          @mousedown.prevent
          @click="revealMore(section.mediaType)"
        >
          {{ $t("show_more") }}
        </button>
      </CommandGroup>

      <div
        v-if="
          singleType && hasMediaResults && (sectionsHaveMore || isSearching)
        "
        ref="revealSentinel"
        class="flex items-center justify-center py-6"
      >
        <Spinner class="text-subtle-foreground size-5" />
      </div>

      <CommandGroup
        v-if="pageResults.length"
        class="p-0"
        :heading="$t('pages')"
      >
        <CommandItem
          v-for="page in pageResults"
          :key="`page:${page.id}`"
          :value="`page:${page.id}`"
          :class="ROW_CLASS"
          @select="goToPage(page)"
        >
          <span class="cc-row-icon">
            <component :is="page.icon" class="size-4" />
          </span>
          <span class="cc-row-label truncate">
            <template
              v-for="(part, index) in highlightParts(page.title)"
              :key="index"
            >
              <mark
                v-if="part.match"
                class="cc-match"
                v-text="part.text"
              ></mark>
              <span v-else v-text="part.text"></span>
            </template>
          </span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup
        v-if="playerResults.length"
        class="p-0"
        :heading="$t('players')"
      >
        <CommandItem
          v-for="player in playerResults"
          :key="`player:${player.player_id}`"
          :value="`player:${player.player_id}`"
          :class="ROW_CLASS"
          @select="selectPlayer(player)"
        >
          <span class="cc-row-icon">
            <PlayerIcon :icon="player.icon" :size="16" />
          </span>
          <span class="cc-row-label truncate">
            <template
              v-for="(part, index) in highlightParts(getPlayerName(player))"
              :key="index"
            >
              <mark
                v-if="part.match"
                class="cc-match"
                v-text="part.text"
              ></mark>
              <span v-else v-text="part.text"></span>
            </template>
          </span>
          <Check
            v-if="player.player_id === store.activePlayerId"
            class="text-primary ml-auto size-4"
          />
        </CommandItem>
      </CommandGroup>

      <p v-if="statusNote" class="cc-status">
        {{ statusNote }}
      </p>
    </CommandList>

    <div v-if="!mobileLayout" class="cc-foot">
      <span class="cc-foot-hint">
        <Kbd :class="KBD_CLASS">↑</Kbd>
        <Kbd :class="KBD_CLASS">↓</Kbd>
        {{ $t("command_center_navigate") }}
      </span>
      <span class="cc-foot-hint">
        <Kbd :class="KBD_CLASS">↵</Kbd>
        {{ $t("command_center_open") }}
      </span>
      <span class="cc-foot-hint ml-auto hidden sm:inline-flex">
        <Kbd :class="KBD_CLASS">{{ commandCenterHotkeyLabel }}</Kbd>
      </span>
    </div>
  </CommandCenterShell>
</template>

<script setup lang="ts">
import CommandCenterShell from "@/components/CommandCenterShell.vue";
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import PlayerIcon from "@/components/PlayerIcon.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import {
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import {
  commandCenterHotkeyLabel,
  useCommandCenter,
} from "@/composables/useCommandCenter";
import { useOrderedPlayers } from "@/composables/useOrderedPlayers";
import {
  SEARCHABLE_MEDIA_TYPES,
  useProgressiveSearch,
} from "@/composables/useProgressiveSearch";
import { useUserPreferences } from "@/composables/userPreferences";
import { handlePlayBtnClick } from "@/helpers/media_item_actions";
import { getArtistsString, getPlayerName } from "@/helpers/utils";
import { getListItemProviderIconDomain } from "@/plugins/api/helpers";
import {
  MediaType,
  type MediaItemTypeOrItemMapping,
  type Player,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { Check, History, Play, Search } from "@lucide/vue";
import { useIntersectionObserver } from "@vueuse/core";
import { ListboxFilter } from "reka-ui";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getMenuItems, type MenuItem } from "./navigation/utils/getMenuItems";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const RESULTS_PER_TYPE = 5;
const RESULTS_SINGLE_PAGE = 20;
const FETCH_PER_TYPE = 15;
const FETCH_SINGLE_TYPE = 50;
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCHES_PREF_KEY = "search.recent";

// the primitives' own utilities are !important, so the palette's look is
// handed to them as classes rather than set from the scoped styles
const ROW_CLASS =
  "cc-row gap-3 rounded-[10px] px-2 py-[7px] text-[13.5px] data-[highlighted]:bg-foreground/[0.06] data-[highlighted]:text-foreground";
const KBD_CLASS =
  "cc-kbd h-[18px] min-w-[18px] rounded-[5px] bg-transparent px-[5px] text-[10.5px] font-semibold text-subtle-foreground";

const router = useRouter();
const { isOpen, initialQuery, initialMediaTypes, open, close } =
  useCommandCenter();
const { getPreference, setPreference } = useUserPreferences();

const mobileLayout = computed(() => store.mobileLayout);

const query = ref("");
const selectedMediaTypes = ref<MediaType[]>([]);
const pagesOnly = ref(false);
const filterRef = ref<InstanceType<typeof ListboxFilter>>();
const listRef = ref<InstanceType<typeof CommandList>>();
const revealSentinel = ref<HTMLElement>();
const debouncePending = ref(false);
const revealedPerType = ref<Partial<Record<MediaType, number>>>({});
const revealedSingle = ref(RESULTS_SINGLE_PAGE);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const { loading, search, filteredItems } = useProgressiveSearch({
  mediaTypes: selectedMediaTypes,
  limits: { single: FETCH_SINGLE_TYPE, multi: FETCH_PER_TYPE },
});

const queryActive = computed(
  () => query.value.trim().length >= MIN_QUERY_LENGTH,
);

const isSearching = computed(
  () => queryActive.value && (debouncePending.value || loading.value),
);

const singleType = computed(() =>
  selectedMediaTypes.value.length === 1
    ? selectedMediaTypes.value[0]
    : undefined,
);

const toggleMediaType = function (mediaType: MediaType) {
  pagesOnly.value = false;
  selectedMediaTypes.value =
    selectedMediaTypes.value[0] === mediaType ? [] : [mediaType];
};

const selectAllScope = function () {
  pagesOnly.value = false;
  selectedMediaTypes.value = [];
};

const togglePagesOnly = function () {
  pagesOnly.value = !pagesOnly.value;
  if (pagesOnly.value) selectedMediaTypes.value = [];
};

const clearQuery = function () {
  query.value = "";
  focusInput();
};

const focusInput = function () {
  const inputEl = filterRef.value?.$el as HTMLElement | undefined;
  inputEl?.focus();
};

// on the mobile sheet on a touch screen the on-screen keyboard drives the
// interaction, and the return key's job is to put it away — the results are
// already live — while reka would click the highlighted row, so the enter is
// settled here on the wrapper before it can reach the input
const dismissKeyboardOnTouch = function (event: KeyboardEvent) {
  // the enter that commits an IME conversion belongs to the composition, not
  // to us; keyCode 229 covers webkit reporting that keydown as not composing
  if (event.isComposing || event.keyCode === 229) return;
  if (!store.isTouchscreen || !store.mobileLayout) return;
  event.stopPropagation();
  (filterRef.value?.$el as HTMLElement | undefined)?.blur();
};

const dedupeKey = (item: MediaItemTypeOrItemMapping): string | null => {
  if (!item.name || item.media_type === MediaType.PLAYLIST) return null;
  const artist =
    "artists" in item ? item.artists[0]?.name.toLowerCase() || "" : "";
  return `${item.media_type}:${item.name.toLowerCase()}:${artist}`;
};

const mediaSections = computed(() => {
  if (pagesOnly.value || !queryActive.value) return [];

  const single = singleType.value;
  const mediaTypes = single ? [single] : SEARCHABLE_MEDIA_TYPES;
  const sections: {
    mediaType: MediaType;
    title: string;
    items: MediaItemTypeOrItemMapping[];
    hasMore: boolean;
  }[] = [];

  for (const mediaType of mediaTypes) {
    const seen = new Set<string>();
    const items: MediaItemTypeOrItemMapping[] = [];
    for (const item of filteredItems(mediaType)) {
      const key = dedupeKey(item);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      items.push(item);
    }
    if (!items.length) continue;
    const revealed = single
      ? revealedSingle.value
      : (revealedPerType.value[mediaType] ?? RESULTS_PER_TYPE);
    sections.push({
      mediaType,
      title: $t(mediaType + "s"),
      items: items.slice(0, revealed),
      hasMore: items.length > revealed,
    });
  }
  return sections;
});

const sectionsHaveMore = computed(() =>
  mediaSections.value.some((section) => section.hasMore),
);

const revealMore = function (mediaType: MediaType) {
  revealedPerType.value = {
    ...revealedPerType.value,
    [mediaType]:
      (revealedPerType.value[mediaType] ?? RESULTS_PER_TYPE) + RESULTS_PER_TYPE,
  };
};

useIntersectionObserver(
  revealSentinel,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    if (!sectionsHaveMore.value) return;
    revealedSingle.value += RESULTS_SINGLE_PAGE;
  },
  { root: computed(() => listRef.value?.$el as HTMLElement | undefined) },
);

const hasMediaResults = computed(() =>
  mediaSections.value.some((section) => section.items.length),
);

// the hit worth naming above the groups when every media type is in play: a
// name that is the query outright, else an artist and then an album whose
// name holds it, else whatever leads the first group. The mobile sheet has
// too little room beside the keyboard for it.
const topResult = computed<MediaItemTypeOrItemMapping | undefined>(() => {
  if (mobileLayout.value || singleType.value || !hasMediaResults.value) {
    return undefined;
  }
  const term = query.value.trim().toLowerCase();
  const sections = mediaSections.value;
  const named = (item: MediaItemTypeOrItemMapping) =>
    item.name?.toLowerCase() ?? "";
  for (const section of sections) {
    const exact = section.items.find((item) => named(item) === term);
    if (exact) return exact;
  }
  for (const mediaType of [MediaType.ARTIST, MediaType.ALBUM]) {
    const match = sections
      .find((section) => section.mediaType === mediaType)
      ?.items.find((item) => named(item).includes(term));
    if (match) return match;
  }
  return sections[0]?.items[0];
});

// artists are people, shown round; everything else is a cover, kept square
const isRoundThumb = function (item: MediaItemTypeOrItemMapping) {
  return item.media_type === MediaType.ARTIST;
};

// splits a name around each occurrence of the query, so the matched text can
// take the accent colour
const highlightParts = function (text: string | undefined) {
  const value = text ?? "";
  const term = query.value.trim().toLowerCase();
  const lower = value.toLowerCase();
  // case folding that changes the length would put the offsets out of step
  if (!term || lower.length !== value.length) {
    return [{ text: value, match: false }];
  }
  const parts: { text: string; match: boolean }[] = [];
  let index = 0;
  while (index < value.length) {
    const found = lower.indexOf(term, index);
    if (found === -1) {
      parts.push({ text: value.slice(index), match: false });
      break;
    }
    if (found > index) {
      parts.push({ text: value.slice(index, found), match: false });
    }
    parts.push({ text: value.slice(found, found + term.length), match: true });
    index = found + term.length;
  }
  return parts;
};

const itemSubtitle = function (item: MediaItemTypeOrItemMapping) {
  const label = $t(item.media_type);
  const artists =
    "artists" in item && item.artists.length
      ? getArtistsString(item.artists)
      : "";
  return artists ? `${label} • ${artists}` : label;
};

const onMediaSelect = function (item: MediaItemTypeOrItemMapping) {
  recordRecentSearch();
  close();
  router.push({
    name: item.media_type,
    params: { itemId: item.item_id, provider: item.provider },
  });
};

const onPlayClick = function (
  item: MediaItemTypeOrItemMapping,
  event: MouseEvent,
) {
  recordRecentSearch();
  close();
  handlePlayBtnClick(item, event.clientX, event.clientY);
};

const recentSearches = getPreference<string[]>(RECENT_SEARCHES_PREF_KEY, []);

const recentResults = computed(() => {
  if (queryActive.value) return [];

  const term = query.value.trim().toLowerCase();
  const recents = recentSearches.value.slice(0, MAX_RECENT_SEARCHES);

  if (!term) return recents;

  return recents.filter((recent) => recent.toLowerCase().includes(term));
});

const recordRecentSearch = function () {
  const term = query.value.trim();

  if (term.length < MIN_QUERY_LENGTH) return;

  const next = [
    term,
    ...recentSearches.value.filter(
      (existing) => existing.toLowerCase() !== term.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);
  setPreference(RECENT_SEARCHES_PREF_KEY, next);
};

const pageResults = computed(() => {
  if (!pagesOnly.value && selectedMediaTypes.value.length) return [];

  const pages = getMenuItems()
    .filter((item) => !item.hidden && !item.disabled && !item.action)
    .map((item) => ({ ...item, title: $t(item.label) }));
  const term = query.value.trim().toLowerCase();

  if (!term) return pages;

  return pages.filter((page) => page.title.toLowerCase().includes(term));
});

const goToPage = function (page: MenuItem) {
  close();
  router.push(page.path);
};

const orderedPlayers = useOrderedPlayers();

const playerResults = computed(() => {
  if (pagesOnly.value || selectedMediaTypes.value.length) return [];
  const term = query.value.trim().toLowerCase();
  if (!term) return [];
  return orderedPlayers.value
    .filter((player) => player.name.toLowerCase().includes(term))
    .slice(0, 6);
});

const selectPlayer = function (player: Player) {
  store.activePlayerId = player.player_id;
  close();
};

const statusNote = computed(() => {
  const term = query.value.trim();

  if (pagesOnly.value) {
    return pageResults.value.length ? "" : $t("no_content");
  }
  if (!term) return "";
  if (queryActive.value) {
    if (hasMediaResults.value || isSearching.value) return "";
    if (!pageResults.value.length && !playerResults.value.length)
      return $t("no_content");
    return "";
  }

  if (
    !recentResults.value.length &&
    !pageResults.value.length &&
    !playerResults.value.length
  )
    return $t("command_center_keep_typing");
  return "";
});

const onKeydown = function (event: KeyboardEvent) {
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    event.key.toLowerCase() === "k"
  ) {
    event.preventDefault();
    if (isOpen.value) {
      close();
    } else if (!store.dialogActive) {
      open();
    }
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  clearTimeout(debounceTimer);
  if (isOpen.value) {
    store.dialogActive = false;
    close();
  }
});

watch(isOpen, (opened) => {
  store.dialogActive = opened;
  if (opened) {
    pagesOnly.value = false;
    selectedMediaTypes.value = [...initialMediaTypes.value];
    query.value = initialQuery.value;
    return;
  }
  clearTimeout(debounceTimer);
  query.value = "";
  selectedMediaTypes.value = [];
  pagesOnly.value = false;
  search("");
});

watch(
  () =>
    `${query.value}|${selectedMediaTypes.value.join(",")}|${pagesOnly.value}`,
  () => {
    revealedPerType.value = {};
    revealedSingle.value = RESULTS_SINGLE_PAGE;
  },
);

watch([query, pagesOnly], () => {
  clearTimeout(debounceTimer);
  const trimmed = query.value.trim();

  if (pagesOnly.value || trimmed.length < MIN_QUERY_LENGTH) {
    debouncePending.value = false;
    search("");
    return;
  }
  debouncePending.value = true;
  debounceTimer = setTimeout(() => {
    debouncePending.value = false;
    search(trimmed);
  }, DEBOUNCE_MS);
});

// highlight the first row as results land so a desktop enter opens the top
// hit; on the mobile sheet on a touch screen the on-screen keyboard drives
// the interaction — there is no enter contract there and the phantom
// highlight would read as a selection nobody made
watch(
  () =>
    mediaSections.value.map((section) => section.items[0]?.uri ?? "").join("|"),
  async () => {
    if (store.isTouchscreen && store.mobileLayout) return;
    if (!isOpen.value || !queryActive.value) return;
    await nextTick();
    const listEl = listRef.value?.$el as HTMLElement | undefined;
    const inputEl = filterRef.value?.$el as HTMLElement | undefined;
    if (!listEl || !inputEl) return;
    if (listEl.querySelector("[data-highlighted]")) return;
    inputEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
  },
);
</script>

<style scoped>
/* query field: the display serif, set large, as the prototype's search */
.cc-input {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 14px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}

.cc-input-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--subtle-foreground);
}

.cc-input-field {
  height: 44px;
  color: var(--foreground);
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.cc-input.cc-compact {
  gap: 12px;
  padding: 10px 16px 12px;
}

.cc-input.cc-compact .cc-input-field {
  height: 40px;
  font-size: 1.375rem;
}

.command-center-clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 11px;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease;
}

.command-center-clear:hover {
  color: var(--foreground);
}

.cc-kbd {
  box-shadow: inset 0 0 0 1px
    color-mix(in oklab, var(--foreground) 16%, transparent);
}

/* scope filters: pill chips, the chosen one inverted */
.cc-scope {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}

.cc-scope::-webkit-scrollbar {
  display: none;
}

.cc-scope.cc-compact {
  padding: 10px 16px;
}

.command-center-chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px
    color-mix(in oklab, var(--foreground) 14%, transparent);
  color: var(--muted-foreground);
  font-size: 0.78125rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.command-center-chip:hover {
  background: color-mix(in oklab, var(--foreground) 5%, transparent);
  color: var(--foreground);
}

.command-center-chip[data-active="true"] {
  background: var(--foreground);
  box-shadow: none;
  color: var(--background);
}

/* group headings as eyebrow labels; the label's own utilities are
   !important, so these have to be too */
.cc-list :deep([data-slot="command-group-heading"]) {
  padding: 16px 8px 6px !important;
  color: var(--subtle-foreground) !important;
  font-size: 0.6875rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cc-eyebrow {
  padding: 16px 8px 8px;
  color: var(--subtle-foreground);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* top result */
.cc-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px 14px 14px;
  border-radius: 16px;
  background: color-mix(in oklab, var(--foreground) 4.5%, transparent);
}

.cc-top-open {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 18px;
  text-align: left;
  cursor: pointer;
}

.cc-top-art {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 14px 30px -12px rgba(0, 0, 0, 0.55);
}

.cc-top-art--round {
  border-radius: 50%;
}

.cc-top-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.cc-top-name {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--foreground);
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.08;
}

.cc-top-type {
  margin-top: 6px;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-top-play {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px 0 13px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.cc-top-play:hover {
  filter: brightness(1.08);
}

/* result rows */
.cc-thumb {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 3px;
}

.cc-thumb--round {
  border-radius: 50%;
}

.cc-row-title {
  color: var(--foreground);
  font-weight: 600;
}

.cc-row-meta {
  color: var(--subtle-foreground);
  font-size: 0.75rem;
}

.cc-row-icon {
  display: inline-flex;
  width: 24px;
  flex-shrink: 0;
  justify-content: center;
  color: var(--muted-foreground);
}

.cc-row-label {
  font-weight: 500;
}

.cc-match {
  background: none;
  color: var(--primary);
}

.command-center-more {
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin: 2px 0 4px 6px;
  padding: 0 12px;
  border-radius: 999px;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.command-center-more:hover {
  background: color-mix(in oklab, var(--foreground) 6%, transparent);
  color: var(--foreground);
}

.command-center-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-foreground);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

[data-highlighted] .command-center-play {
  opacity: 1;
}

@media (hover: none) {
  .command-center-play {
    opacity: 1;
  }
}

.cc-status {
  padding: 40px 0;
  color: var(--muted-foreground);
  font-size: 0.84375rem;
  text-align: center;
}

/* keyboard hints */
.cc-foot {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 18px;
  padding: 11px 24px;
  border-top: 1px solid var(--border);
  color: var(--subtle-foreground);
  font-size: 0.75rem;
}

.cc-foot-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>

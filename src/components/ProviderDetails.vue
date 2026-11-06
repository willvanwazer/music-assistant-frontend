<template>
  <section class="provider-details">
    <Toolbar
      :title="$t('mapped_providers')"
      :menu-items="toolbarMenuItems"
      @title-clicked="toggleExpand"
    />
    <v-divider />
    <Container v-if="expanded">
      <!-- where this item is available from; the one being viewed is marked -->
      <v-list class="provider-details-list">
        <ListItem
          v-for="providerMapping in itemDetails?.provider_mappings"
          :key="providerMapping.provider_instance"
          :class="
            isActiveMapping(providerMapping)
              ? 'provider-details-row provider-details-row--active'
              : 'provider-details-row'
          "
          :disabled="
            !providerMapping.available ||
            !api.getProvider(providerMapping.provider_instance)
          "
          show-menu-btn
          @menu.stop="(evt) => onMenu(evt, providerMapping)"
        >
          <template #prepend>
            <ProviderIcon
              :domain="providerMapping.provider_domain"
              :size="30"
              class="mx-[10px]"
            />
          </template>
          <template #title>
            {{ getProviderName(providerMapping) }}
            <span
              v-if="providerMapping.in_library"
              class="provider-details-tag"
              :title="$t('tooltip.in_provider_library')"
            >
              {{ $t("library") }}
            </span>
          </template>
          <template #subtitle>
            <span
              v-if="itemDetails.media_type == MediaType.TRACK"
              class="provider-details-format"
              >{{ providerMapping.audio_format.content_type }} ·
              {{ providerMapping.audio_format.sample_rate / 1000 }}kHz/{{
                providerMapping.audio_format.bit_depth
              }}
              bits ·
            </span>
            <a
              v-if="
                providerMapping.url &&
                !providerMapping.provider_domain.startsWith('file')
              "
              class="provider-details-uri"
              :title="$t('tooltip.open_provider_link')"
              @click.prevent="openLinkInNewTab(providerMapping.url)"
              >{{ getProviderUri(providerMapping) }}</a
            >
            <span
              v-else
              class="provider-details-uri"
              :title="$t('tooltip.copy_uri')"
              >{{ getProviderUri(providerMapping) }}</span
            >
          </template>
          <template #append>
            <!-- hi res icon -->
            <v-img
              v-if="providerMapping.audio_format.bit_depth > 16"
              :src="iconHiRes"
              width="30"
              alt=""
              :class="
                $vuetify.theme.current.dark ? 'hiresicondark' : 'hiresicon'
              "
            />
            <!-- play sample button -->
            <div class="d-flex align-center ga-2">
              <v-btn
                v-if="
                  getBreakpointValue('bp1') &&
                  itemDetails.media_type == MediaType.TRACK
                "
                variant="plain"
                :icon="
                  demoPlayer[
                    `${providerMapping.provider_instance}.${providerMapping.item_id}`
                  ]
                    ? 'mdi-pause'
                    : 'mdi-play-circle'
                "
                :title="$t('tooltip.play_sample')"
                @click="playBtnClick(providerMapping)"
              />
            </div>
            <Check
              v-if="isActiveMapping(providerMapping)"
              :size="18"
              class="provider-details-check"
            />
          </template>
        </ListItem>
        <!-- virtual mapping for library -->
        <ListItem
          v-if="itemDetails.provider == 'library'"
          class="provider-details-row provider-details-row--active"
          show-menu-btn
          @menu.stop="
            (evt) =>
              onMenu(evt, {
                provider_instance: 'library',
                provider_domain: 'library',
                item_id: itemDetails.item_id,
                available: true,
                url: null,
              })
          "
        >
          <template #prepend>
            <ProviderIcon domain="library" :size="30" class="mx-[10px]" />
          </template>
          <template #title>{{ $t("music_assistant_library") }}</template>
          <template #subtitle>
            <span class="provider-details-uri"
              >library://{{ itemDetails.media_type }}/{{
                itemDetails.item_id
              }}</span
            >
          </template>
          <template #append>
            <Check :size="18" class="provider-details-check" />
          </template>
        </ListItem>
      </v-list>
    </Container>
  </section>
  <GenreExclusionManager
    v-if="
      itemDetails.provider === 'library' &&
      itemDetails.media_type !== MediaType.GENRE
    "
    :media-type="itemDetails.media_type"
    :media-id="itemDetails.item_id"
  />
</template>

<script setup lang="ts">
import { Check, ChevronDown, ChevronUp, DatabaseSearch } from "@lucide/vue";
import Container from "@/components/Container.vue";
import GenreExclusionManager from "@/components/genre/GenreExclusionManager.vue";
import ListItem from "@/components/ListItem.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import { iconHiRes } from "@/components/QualityDetailsBtn.vue";
import Toolbar from "@/components/Toolbar.vue";
import { copyToClipboard } from "@/helpers/utils";
import { api } from "@/plugins/api";
import {
  MediaType,
  ProviderMapping,
  type MediaItem,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { eventbus } from "@/plugins/eventbus";
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

export interface Props {
  itemDetails: MediaItem;
}
const props = defineProps<Props>();

const { t } = useI18n();
const expanded = ref(false);
const mappingSearchInProgress = ref(false);

const openLinkInNewTab = function (url: string) {
  window.open(url, "_blank");
};

const demoPlayer = reactive<{ [item_id: string]: HTMLAudioElement }>({});

const playBtnClick = function (providerMapping: ProviderMapping) {
  const key = `${providerMapping.provider_instance}.${providerMapping.item_id}`;
  const existing = demoPlayer[key];
  if (existing) {
    existing.load();
    delete demoPlayer[key];
    return;
  }
  // claim the slot before awaiting the url, so a second click while the request is
  // in flight cannot start a second clip that the first would then orphan
  const audio = new Audio();
  demoPlayer[key] = audio;
  api
    .getTrackPreviewUrl(
      providerMapping.provider_instance,
      providerMapping.item_id,
    )
    .then((url) => {
      // the stop path clears the slot; do not start playing a clip nobody wants
      if (demoPlayer[key] !== audio) return;
      audio.src = url;
      return audio.play();
    })
    .catch(() => {
      if (demoPlayer[key] === audio) delete demoPlayer[key];
    });
};

// just enough of a provider mapping to identify an item: the library entry built for
// the menu below carries only these fields, not the full server-sent mapping
type ProviderMappingRef = Pick<
  ProviderMapping,
  "provider_instance" | "provider_domain" | "item_id" | "available" | "url"
>;

// the mapping of the provider item being viewed; a library item is marked on
// the virtual library row instead
const isActiveMapping = function (mapping: ProviderMapping) {
  return (
    props.itemDetails.provider != "library" &&
    mapping.provider_instance == props.itemDetails.provider
  );
};

const getProviderUri = function (mapping: ProviderMappingRef) {
  return `${mapping.provider_instance}://${props.itemDetails.media_type}/${mapping.item_id}`;
};

const copyUriToClipboard = async function (uri: string) {
  const success = await copyToClipboard(uri);
  if (success) {
    toast.success(t("uri_copied"));
  } else {
    toast.error(t("uri_copy_failed"));
  }
};

const getProviderName = function (providerMapping: ProviderMapping) {
  const providerInstance = api.getProvider(providerMapping.provider_instance);
  if (providerInstance) {
    return providerInstance.name;
  }
  const providerManifest = api.getProviderManifest(
    providerMapping.provider_domain,
  );
  if (providerManifest) {
    return `${providerManifest.name} (${providerMapping.provider_instance})`;
  }
  return providerMapping.provider_instance;
};

const toggleExpand = function () {
  expanded.value = !expanded.value;
};

const onMenu = function (evt: Event, providerMapping: ProviderMappingRef) {
  const mouseEvt = evt as MouseEvent;
  const menuItems = [
    {
      label: t("tooltip.copy_uri"),
      icon: "mdi-link",
      action: () => {
        if (providerMapping) {
          copyUriToClipboard(getProviderUri(providerMapping));
        }
      },
    },
  ];
  // visit website button
  if (
    providerMapping.url &&
    !providerMapping.provider_domain.startsWith("file")
  ) {
    menuItems.push({
      label: t("tooltip.open_provider_link"),
      icon: "mdi-open-in-new",
      action: () => {
        openLinkInNewTab(providerMapping.url!);
      },
    });
  }
  // remove mapping option (only for streaming provider mapping)
  if (
    authManager.isAdmin() &&
    api.providers[providerMapping.provider_instance]?.is_streaming_provider
  ) {
    menuItems.push({
      label: t("remove_provider_mapping"),
      icon: "mdi-delete",
      action: async () => {
        if (!confirm(t("remove_provider_mapping_confirm"))) return;
        await api.sendCommand("music/remove_provider_mapping", {
          media_type: props.itemDetails.media_type,
          db_id: props.itemDetails.item_id,
          mapping: providerMapping,
        });
      },
    });
  }

  // open the contextmenu by emitting the event
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: mouseEvt.clientX,
    posY: mouseEvt.clientY,
  });
};

const searchAllProviders = function () {
  if (!confirm(t("search_all_providers_confirm"))) return;
  mappingSearchInProgress.value = true;
  api
    .sendCommand("music/match_providers", {
      media_type: props.itemDetails.media_type,
      db_id: props.itemDetails.item_id,
    })
    .finally(() => {
      mappingSearchInProgress.value = false;
    });
};

const toolbarMenuItems = computed(() => {
  return [
    // search all providers option (only for library items when streaming providers are available)
    {
      label: "search_all_providers",
      icon: DatabaseSearch,
      action: searchAllProviders,
      overflowAllowed: false,
      disabled: mappingSearchInProgress.value,
      hide:
        props.itemDetails.provider != "library" ||
        !api.hasStreamingProviders.value ||
        !authManager.isAdmin(),
    },
    // toggle expand
    {
      label: "tooltip.collapse_expand",
      icon: expanded.value ? ChevronUp : ChevronDown,
      action: toggleExpand,
      overflowAllowed: false,
    },
  ];
});
</script>

<style scoped>
/* "Available from": one row per source, the one being viewed filled in and
   checked in the accent */
.provider-details-list {
  padding: 0;
  background: transparent;
}

.provider-details-list :deep(.v-list-item.provider-details-row) {
  min-height: 56px;
  margin: 0 0 2px !important;
  padding: 8px 4px !important;
  border-radius: 10px !important;
  transition: background-color 150ms ease;
}

.provider-details-list :deep(.v-list-item.provider-details-row:hover) {
  background: color-mix(in oklab, var(--foreground) 4%, transparent);
}

.provider-details-list :deep(.v-list-item.provider-details-row--active) {
  background: var(--secondary);
}

/* hover and focus overlays: the row fills itself */
.provider-details-list :deep(.provider-details-row .v-list-item__overlay) {
  display: none;
}

.provider-details-list :deep(.provider-details-row .provider-icon-wrapper) {
  border-radius: 8px;
  overflow: hidden;
}

.provider-details-list :deep(.provider-details-row .v-list-item-title) {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
}

.provider-details-list :deep(.provider-details-row .v-list-item-subtitle) {
  font-size: 12px;
  line-height: 1.4;
  color: var(--subtle-foreground);
  opacity: 1;
  font-variant-numeric: tabular-nums;
}

.provider-details-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  margin-left: 8px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--secondary);
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 500;
  vertical-align: 1px;
}

.provider-details-row--active .provider-details-tag {
  background: color-mix(in oklab, var(--foreground) 8%, transparent);
}

.provider-details-uri {
  color: var(--subtle-foreground);
}

a.provider-details-uri {
  cursor: pointer;
  transition: color 150ms ease;
}

a.provider-details-uri:hover {
  color: var(--primary);
}

.provider-details-check {
  flex: none;
  margin-inline: 6px 2px;
  color: var(--primary);
}

.hiresicon {
  margin-top: 5px;
  margin-right: 15px;
  margin-left: 15px;
  filter: invert(100%);
}

.hiresicondark {
  margin-top: 5px;
  margin-right: 15px;
  margin-left: 15px;
}
</style>

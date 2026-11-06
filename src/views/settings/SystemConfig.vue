<template>
  <Container variant="comfortable" class="settings-overview">
    <div v-if="viewMode === 'card'" class="settings-grid">
      <Card
        v-for="item in sortedCoreConfigs"
        :key="item.domain"
        class="setting-card"
        @click="handleItemClick(item)"
      >
        <CardHeader>
          <div class="setting-header-top">
            <div class="setting-icon">
              <provider-icon :domain="item.domain" :size="20" monochrome />
            </div>
            <div class="setting-chevron">
              <v-icon
                v-if="item.last_error"
                class="setting-error"
                icon="mdi-alert-circle"
                size="18"
                :title="item.last_error"
              />
              <v-icon icon="mdi-chevron-right" size="20" />
            </div>
          </div>
          <CardTitle class="setting-title">{{ getItemTitle(item) }}</CardTitle>
          <CardDescription class="setting-description">{{
            getItemDescription(item)
          }}</CardDescription>
        </CardHeader>
      </Card>

      <Card
        v-for="item in extraSystemEntries"
        :key="item.domain"
        class="setting-card"
        @click="handleItemClick(item)"
      >
        <CardHeader>
          <div class="setting-header-top">
            <div class="setting-icon">
              <component
                :is="item.icon"
                v-if="typeof item.icon !== 'string'"
                class="size-5"
              />
              <v-icon v-else :icon="item.icon" size="20" />
            </div>
            <div class="setting-chevron">
              <v-icon icon="mdi-chevron-right" size="20" />
            </div>
          </div>
          <CardTitle class="setting-title">{{ t(item.name) }}</CardTitle>
          <CardDescription class="setting-description">{{
            t(item.description)
          }}</CardDescription>
        </CardHeader>
      </Card>
    </div>

    <v-list v-else class="settings-list">
      <ListItem
        v-for="item in sortedCoreConfigs"
        :key="item.domain"
        link
        class="settings-list-item"
        @click="handleItemClick(item)"
      >
        <template #prepend>
          <div class="setting-list-icon">
            <provider-icon :domain="item.domain" :size="18" monochrome />
          </div>
        </template>
        <template #title>{{ getItemTitle(item) }}</template>
        <template #subtitle>{{ getItemDescription(item) }}</template>
        <template #append>
          <v-icon
            v-if="item.last_error"
            icon="mdi-alert-circle"
            size="18"
            class="setting-error mr-2"
            :title="item.last_error"
          />
          <v-icon
            icon="mdi-chevron-right"
            size="18"
            class="setting-list-chevron"
          />
        </template>
      </ListItem>

      <ListItem
        v-for="item in extraSystemEntries"
        :key="item.domain"
        link
        class="settings-list-item"
        @click="handleItemClick(item)"
      >
        <template #prepend>
          <div class="setting-list-icon">
            <component
              :is="item.icon"
              v-if="typeof item.icon !== 'string'"
              class="size-[18px]"
            />
            <v-icon v-else :icon="item.icon" size="18" />
          </div>
        </template>
        <template #title>{{ t(item.name) }}</template>
        <template #subtitle>{{ t(item.description) }}</template>
        <template #append>
          <v-icon
            icon="mdi-chevron-right"
            size="18"
            class="setting-list-chevron"
          />
        </template>
      </ListItem>
    </v-list>
  </Container>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import GenreIcon from "@/components/icons/GenreIcon.vue";
import ListItem from "@/components/ListItem.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/plugins/api";
import { requireServerVersion } from "@/plugins/api/helpers";
import { CoreConfig } from "@/plugins/api/interfaces";
import {
  computed,
  inject,
  onMounted,
  ref,
  type Component,
  type Ref,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

// global refs
const router = useRouter();
const { t } = useI18n();

const injected = inject<{ viewMode: Ref<"list" | "card"> }>("systemViewMode");
const viewMode = computed(() => injected?.viewMode.value ?? "list");

// local refs
const coreConfigs = ref<CoreConfig[]>([]);

interface SystemConfigExtraEntry {
  domain: string;
  route: string;
  name: string;
  description: string;
  icon: string | Component;
  minServerVersion?: string;
}

type SystemConfigItem = CoreConfig | SystemConfigExtraEntry;

const extraSystemEntries = computed<SystemConfigExtraEntry[]>(() =>
  [
    {
      domain: "diagnostics",
      name: "settings.diagnostics",
      description: "settings.diagnostics_description",
      icon: "mdi-stethoscope",
      route: "/settings/diagnostics",
    },
    {
      domain: "tasks",
      name: "background_tasks.title",
      description: "background_tasks.description",
      icon: "mdi-playlist-play",
      route: "/settings/tasks",
    },
    {
      domain: "genre_management",
      name: "settings.genre_management",
      description: "settings.genre_management_description",
      icon: GenreIcon,
      route: "/settings/genremanagement",
    },
    {
      domain: "audio_analysis",
      name: "settings.audio_analysis",
      description: "settings.audio_analysis_description",
      icon: "mdi-waveform",
      route: "/settings/audio-analysis",
      minServerVersion: "2.9.0",
    },
  ].filter(
    (entry) =>
      !entry.minServerVersion || requireServerVersion(entry.minServerVersion),
  ),
);

const sortedCoreConfigs = computed(() => {
  return [...coreConfigs.value].sort((a, b) =>
    api.providerManifests[a.domain].name!.localeCompare(
      api.providerManifests[b.domain].name!,
    ),
  );
});

const getItemTitle = (item: CoreConfig) => {
  const translated = t(`settings.core_module.${item.domain}.name`);
  return translated !== `settings.core_module.${item.domain}.name`
    ? translated
    : api.providerManifests[item.domain].name;
};

const getItemDescription = (item: CoreConfig) => {
  const translated = t(`settings.core_module.${item.domain}.description`);
  return translated !== `settings.core_module.${item.domain}.description`
    ? translated
    : api.providerManifests[item.domain].description;
};

const handleItemClick = (item: SystemConfigItem) => {
  if ("route" in item && item.route) {
    router.push(item.route);
  } else {
    router.push(`/settings/editcore/${(item as CoreConfig).domain}`);
  }
};

onMounted(async () => {
  coreConfigs.value = await api.getCoreConfigs();
});
</script>

<style scoped>
.settings-overview {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* list view: one group container, rows divided by hairlines */
.settings-list {
  padding: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.settings-list .settings-list-item.list-item-main {
  cursor: pointer;
  min-height: 60px;
  margin-right: 0 !important;
  padding: 10px 16px !important;
  border-radius: 0 !important;
  background: transparent;
  transition: background-color 0.15s ease;
}

.settings-list .settings-list-item + .settings-list-item {
  border-top: 1px solid var(--border);
}

.settings-list-item:hover {
  background-color: color-mix(in oklab, var(--foreground) 4%, transparent);
}

.settings-list-item :deep(.v-list-item__overlay) {
  display: none;
}

.settings-list-item :deep(.v-list-item__prepend) {
  padding-inline-end: 6px;
}

.settings-list-item :deep(.v-list-item__prepend .v-icon) {
  margin-inline-end: 0 !important;
}

.settings-list-item :deep(.v-list-item__content > div) {
  padding-left: 0;
}

.settings-list-item :deep(.v-list-item-title) {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
}

.settings-list-item :deep(.v-list-item-subtitle) {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--muted-foreground);
  opacity: 1;
  margin-top: 2px;
}

.setting-list-chevron {
  color: var(--subtle-foreground);
  transition: color 0.15s ease;
}

.settings-list-item:hover .setting-list-chevron {
  color: var(--foreground);
}

.setting-list-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary);
  color: var(--foreground);
  flex-shrink: 0;
}

.setting-error {
  color: var(--destructive);
}

/* card view: flat tiles */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

@media (min-width: 960px) {
  .settings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .settings-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.setting-card {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.setting-card:hover {
  border-color: color-mix(in oklab, var(--foreground) 16%, transparent);
}

.setting-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.setting-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary);
  color: var(--foreground);
  flex-shrink: 0;
}

.setting-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--subtle-foreground);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.setting-card:hover .setting-chevron {
  color: var(--foreground);
}

.setting-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  line-height: 1.3;
}

.setting-description {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--muted-foreground);
  margin: 0;
}

@media (max-width: 768px) {
  .settings-overview {
    padding: 16px 12px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>

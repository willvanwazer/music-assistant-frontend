<template>
  <div>
    <Toolbar :icon="Settings">
      <template #title>
        <ToolbarHeading
          :title="t('settings.settings')"
          :to="isOverview ? undefined : { name: 'settings' }"
          :items="breadcrumbItems"
        />
      </template>
      <template #append>
        <v-btn
          v-if="isOverview"
          :icon="settingsViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          @click="toggleSettingsViewMode()"
        />
        <v-btn
          v-if="isPlayersPage"
          :icon="playersViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          @click="togglePlayersViewMode()"
        />
        <v-btn
          v-if="isProvidersPage"
          :icon="providersViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          @click="toggleProvidersViewMode()"
        />
        <v-btn
          v-if="isTasksPage"
          :icon="tasksViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          @click="toggleTasksViewMode()"
        />
        <v-btn
          v-if="isSystemPage"
          :icon="systemViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          @click="toggleSystemViewMode()"
        />
      </template>
    </Toolbar>

    <v-divider />

    <Container
      v-if="isOverview"
      variant="comfortable"
      class="settings-overview"
    >
      <!-- Onboarding welcome message -->
      <div v-if="store.isOnboarding" class="onboarding-card">
        <div class="onboarding-header">
          <div>
            <h2 class="onboarding-title">
              {{ t("settings.onboarding_title") }}
            </h2>
            <p class="onboarding-subtitle">
              {{ t("settings.onboarding_subtitle") }}
            </p>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            class="onboarding-close"
            @click="store.isOnboarding = false"
          />
        </div>

        <div class="onboarding-sections">
          <div class="onboarding-section">
            <div class="section-icon music">
              <v-icon icon="mdi-music" size="22" />
            </div>
            <div class="section-content">
              <h3>{{ t("settings.onboarding_music_title") }}</h3>
              <p>{{ t("settings.onboarding_music_desc") }}</p>
            </div>
            <v-btn
              color="primary"
              variant="flat"
              class="section-btn"
              @click="
                router.push({
                  name: 'providersettings',
                  query: { types: 'music' },
                })
              "
            >
              {{ t("settings.onboarding_add_music") }}
            </v-btn>
          </div>

          <div class="onboarding-section">
            <div class="section-icon player">
              <v-icon icon="mdi-speaker" size="22" />
            </div>
            <div class="section-content">
              <h3>{{ t("settings.onboarding_player_title") }}</h3>
              <p>{{ t("settings.onboarding_player_desc") }}</p>
            </div>
            <v-btn
              color="primary"
              variant="flat"
              class="section-btn"
              @click="
                router.push({
                  name: 'providersettings',
                  query: { types: 'player' },
                })
              "
            >
              {{ t("settings.onboarding_add_player") }}
            </v-btn>
          </div>
        </div>

        <p class="onboarding-footer">
          <v-icon icon="mdi-information-outline" size="16" class="mr-1" />
          {{ t("settings.onboarding_footer") }}
        </p>
      </div>

      <div v-if="settingsViewMode === 'card'" class="settings-card-view">
        <div class="settings-featured">
          <Card
            v-for="section in [...musicSections, ...playerSections]"
            :key="section.name"
            class="setting-card setting-card--featured gap-0 p-5 shadow-none max-md:p-4"
            @click="router.push(section.route)"
          >
            <div class="setting-header-top">
              <div class="setting-icon">
                <Icon :icon="section.icon" size="22" />
              </div>
              <div class="setting-chevron">
                <Icon icon="mdi-chevron-right" size="18" />
              </div>
            </div>
            <h3 class="setting-title">
              {{ t(section.label) }}
            </h3>
            <p class="setting-description">
              {{ t(section.description) }}
            </p>
          </Card>
        </div>

        <div class="settings-grid">
          <Card
            v-for="section in regularSections"
            :key="section.name"
            class="setting-card gap-0 p-5 shadow-none max-md:p-4"
            @click="router.push(section.route)"
          >
            <div class="setting-header-top">
              <div class="setting-icon">
                <Icon :icon="section.icon" size="20" />
              </div>
              <div class="setting-chevron">
                <Icon icon="mdi-chevron-right" size="18" />
              </div>
            </div>
            <h3 class="setting-title">
              {{ t(section.label) }}
            </h3>
            <p class="setting-description">
              {{ t(section.description) }}
            </p>
          </Card>
        </div>
      </div>

      <div v-else class="settings-list-view">
        <v-list
          v-for="group in [
            providersSection,
            playersSection,
            otherSettingsSections,
          ].filter((sections) => sections.length)"
          :key="group[0].name"
          class="settings-list"
        >
          <ListItem
            v-for="section in group"
            :key="section.name"
            link
            class="settings-list-item"
            @click="router.push(section.route)"
          >
            <template #prepend>
              <div class="setting-list-icon">
                <Icon :icon="section.icon" size="20" />
              </div>
            </template>
            <template #title>
              {{ t(section.label) }}
            </template>
            <template #subtitle>
              {{ t(section.description) }}
            </template>
            <template #append>
              <Icon icon="mdi-chevron-right" size="18" />
            </template>
          </ListItem>
        </v-list>
      </div>
    </Container>

    <router-view v-else v-slot="{ Component }">
      <component :is="Component" v-if="Component" />
    </router-view>
  </div>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import Icon from "@/components/Icon.vue";
import ListItem from "@/components/ListItem.vue";
import Toolbar from "@/components/Toolbar.vue";
import ToolbarHeading, {
  type ToolbarHeadingItem,
} from "@/components/ToolbarHeading.vue";
import { Card } from "@/components/ui/card";
import { useUserPreferences } from "@/composables/userPreferences";
import { api } from "@/plugins/api";
import { requireServerVersion } from "@/plugins/api/helpers";
import { ProviderType } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { store } from "@/plugins/store";
import { Settings } from "@lucide/vue";
import { match } from "ts-pattern";
import { computed, provide, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";

// global refs
const router = useRouter();
const { t } = useI18n();
const { getPreference, setPreference } = useUserPreferences();
const { mobile } = useDisplay();

const settingsViewMode = ref<"list" | "card">("card");
const settingsListPrependGap = computed(() => (mobile.value ? 4 : 24));
const savedSettingsViewMode = getPreference<"list" | "card">(
  "settings.overview.viewMode",
  "card",
);

watch(
  () => savedSettingsViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      settingsViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleSettingsViewMode = function () {
  settingsViewMode.value = settingsViewMode.value === "list" ? "card" : "list";
  setPreference("settings.overview.viewMode", settingsViewMode.value);
};

const playersViewMode = ref<"list" | "card">("list");
const isPlayersPage = computed(() => {
  const name = router.currentRoute.value.name?.toString() || "";
  return name.includes("players") || name === "addgroup";
});

const savedPlayersViewMode = getPreference<"list" | "card">(
  "settings.players.viewMode",
  "list",
);

watch(
  () => savedPlayersViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      playersViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const togglePlayersViewMode = function () {
  playersViewMode.value = playersViewMode.value === "list" ? "card" : "list";
  setPreference("settings.players.viewMode", playersViewMode.value);
};

provide("playersViewMode", {
  viewMode: playersViewMode,
  toggleViewMode: togglePlayersViewMode,
});

const providersViewMode = ref<"list" | "card">("list");
const isProvidersPage = computed(() => {
  const name = router.currentRoute.value.name?.toString() || "";
  return name.includes("providers");
});

const savedProvidersViewMode = getPreference<"list" | "card">(
  "settings.providers.viewMode",
  "list",
);

watch(
  () => savedProvidersViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      providersViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleProvidersViewMode = function () {
  providersViewMode.value =
    providersViewMode.value === "list" ? "card" : "list";
  setPreference("settings.providers.viewMode", providersViewMode.value);
};

provide("providersViewMode", {
  viewMode: providersViewMode,
  toggleViewMode: toggleProvidersViewMode,
});

const tasksViewMode = ref<"list" | "card">("list");
const isTasksPage = computed(
  () => router.currentRoute.value.name?.toString() === "backgroundtasks",
);

const savedTasksViewMode = getPreference<"list" | "card">(
  "settings.tasks.viewMode",
  "list",
);

watch(
  () => savedTasksViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      tasksViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleTasksViewMode = function () {
  tasksViewMode.value = tasksViewMode.value === "list" ? "card" : "list";
  setPreference("settings.tasks.viewMode", tasksViewMode.value);
};

provide("tasksViewMode", {
  viewMode: tasksViewMode,
  toggleViewMode: toggleTasksViewMode,
});

const isSystemPage = computed(
  () => router.currentRoute.value.name?.toString() === "systemsettings",
);

const systemViewMode = ref<"list" | "card">("list");
const savedSystemViewMode = getPreference<"list" | "card">(
  "settings.system.viewMode",
  "list",
);

watch(
  () => savedSystemViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      systemViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleSystemViewMode = function () {
  systemViewMode.value = systemViewMode.value === "list" ? "card" : "list";
  setPreference("settings.system.viewMode", systemViewMode.value);
};

provide("systemViewMode", {
  viewMode: systemViewMode,
  toggleViewMode: toggleSystemViewMode,
});

const allSettingsSections = [
  {
    name: "music_providers",
    label: "settings.music_sources",
    description: "settings.music_providers_description",
    icon: "mdi-music",
    color: "blue",
    route: { name: "providersettings", query: { types: "music" } },
    adminOnly: true,
  },
  {
    name: "player_providers",
    label: "settings.playerproviders",
    description: "settings.player_providers_description",
    icon: "mdi-speaker-multiple",
    color: "green",
    route: { name: "providersettings", query: { types: "player" } },
    adminOnly: true,
  },
  {
    name: "metadata_providers",
    label: "settings.metadataproviders",
    description: "settings.metadata_providers_description",
    icon: "mdi-file-code",
    color: "indigo",
    route: { name: "providersettings", query: { types: "metadata" } },
    adminOnly: true,
  },
  {
    name: "plugin_providers",
    label: "settings.plugins",
    description: "settings.plugin_providers_description",
    icon: "mdi-puzzle",
    color: "deep-purple",
    route: { name: "providersettings", query: { types: "plugin" } },
    adminOnly: true,
  },
  {
    name: "players",
    label: "settings.players",
    description: "settings.players_description",
    icon: "mdi-tune",
    color: "teal",
    route: { name: "playersettings" },
    adminOnly: true,
  },
  {
    name: "audio_analysis_providers",
    label: "settings.audio_analysis_providers",
    description: "settings.audio_analysis_providers_description",
    icon: "mdi-waveform",
    color: "blue",
    route: { name: "providersettings", query: { types: "audio_analysis" } },
    adminOnly: true,
    minServerVersion: "2.9.0",
  },
  {
    name: "profile",
    label: "auth.profile",
    description: "settings.profile_description",
    icon: "mdi-account-cog",
    color: "indigo",
    route: { name: "profile" },
    adminOnly: false,
  },
  {
    name: "frontend",
    label: "settings.frontend",
    description: "settings.frontend_description",
    icon: "mdi-palette",
    color: "orange",
    route: { name: "frontendsettings" },
    adminOnly: false,
  },
  {
    name: "users",
    label: "auth.user_management",
    description: "settings.users_description",
    icon: "mdi-account-multiple",
    color: "teal",
    route: { name: "usersettings" },
    adminOnly: true,
  },
  {
    name: "remote_access",
    label: "settings.remote_access",
    description: "settings.remote_access_description",
    icon: "mdi-cloud-lock",
    color: "deep-purple",
    route: { name: "remoteaccesssettings" },
    adminOnly: true,
  },
  {
    name: "system",
    label: "settings.system",
    description: "settings.system_description",
    icon: "mdi-server",
    color: "purple",
    route: { name: "systemsettings" },
    adminOnly: true,
  },
  {
    name: "about",
    label: "settings.about",
    description: "settings.about_description",
    icon: "mdi-information-outline",
    color: "grey-darken-1",
    route: { name: "aboutsettings" },
    adminOnly: false,
  },
];

const settingsSections = computed(() => {
  const isAdmin = authManager.isAdmin();
  return allSettingsSections.filter(
    (section) =>
      (!section.adminOnly || isAdmin) &&
      (!section.minServerVersion ||
        requireServerVersion(section.minServerVersion)),
  );
});

const providerSectionNames = [
  "music_providers",
  "player_providers",
  "metadata_providers",
  "plugin_providers",
  "audio_analysis_providers",
];

const musicSections = computed(() => {
  return settingsSections.value.filter(
    (section) => section.name === "music_providers",
  );
});

const playerSections = computed(() => {
  return settingsSections.value.filter((section) => section.name === "players");
});

const regularSections = computed(() => {
  return settingsSections.value.filter(
    (section) =>
      section.name !== "music_providers" && section.name !== "players",
  );
});

const providersSection = computed(() => {
  return settingsSections.value.filter((section) =>
    providerSectionNames.includes(section.name),
  );
});

const playersSection = computed(() => {
  return settingsSections.value.filter((section) => section.name === "players");
});

const otherSettingsSections = computed(() => {
  return settingsSections.value.filter(
    (section) =>
      !providerSectionNames.includes(section.name) &&
      section.name !== "players",
  );
});

// computed properties
const isOverview = computed(() => {
  return router.currentRoute.value.name === "settings";
});

const activeTab = computed(() => {
  const name = router.currentRoute.value.name?.toString() || "";
  if (name === "profile") {
    return "profile";
  }
  if (
    name.includes("player") ||
    name.includes("queue") ||
    name === "addgroup"
  ) {
    return "players";
  }
  if (
    name.includes("system") ||
    name.includes("core") ||
    name.includes("serverlog") ||
    name === "backgroundtasks" ||
    name === "diagnostics" ||
    name === "genremanagement" ||
    name === "audioanalysissettings"
  ) {
    return "system";
  }
  if (name.includes("frontend")) {
    return "frontend";
  }
  if (name.includes("remoteaccess")) {
    return "remote_access";
  }
  if (name.includes("user")) {
    return "users";
  }
  if (name.includes("about")) {
    return "about";
  }

  const typesQuery = router.currentRoute.value.query.types as
    | string
    | undefined;
  const firstType = typesQuery ? typesQuery.split(",")[0].trim() : undefined;
  if (firstType === "music") return "music_providers";
  if (firstType === "player") return "player_providers";
  if (firstType === "metadata") return "metadata_providers";
  if (firstType === "plugin") return "plugin_providers";
  if (firstType === "audio_analysis") return "audio_analysis_providers";

  if (name === "editprovider") {
    const instanceId = router.currentRoute.value.params.instanceId as string;
    // disabled instances are not loaded, so fall back to the manifest type
    const providerType =
      api.getProvider(instanceId)?.type ||
      api.providerManifests[instanceId.split("--")[0]]?.type;
    if (providerType === ProviderType.MUSIC) return "music_providers";
    if (providerType === ProviderType.PLAYER) return "player_providers";
    if (providerType === ProviderType.METADATA) return "metadata_providers";
    if (providerType === ProviderType.PLUGIN) return "plugin_providers";
    if (providerType === ProviderType.AUDIO_ANALYSIS)
      return "audio_analysis_providers";
  }

  return "music_providers";
});

const getProviderName = (instanceId: string) => {
  const providerInstance = api.getProvider(instanceId);
  if (providerInstance) {
    return providerInstance.name;
  }
  const providerDomain = instanceId.split("--")[0];
  const manifest = api.providerManifests[providerDomain];
  return manifest?.name || instanceId;
};

const breadcrumbItems = computed(() => {
  const route = router.currentRoute.value;
  const name = route.name?.toString() || "";

  // "Settings" heads the toolbar on its own line, so the trail starts below it
  const items: ToolbarHeadingItem[] = [];

  if (!isOverview.value) {
    const currentTab = activeTab.value;
    if (currentTab === "profile") {
      items.push({
        title: t("auth.profile"),
        disabled: name === "profile",
        to: { name: "profile" },
      });
    } else if (currentTab === "players") {
      items.push({
        title: t("settings.players"),
        disabled: name === "playersettings",
        to: { name: "playersettings" },
      });
    } else if (currentTab === "system") {
      if (!(name === "backgroundtasks" && !authManager.isAdmin())) {
        items.push({
          title: t("settings.system"),
          disabled: name === "systemsettings",
          to: { name: "systemsettings" },
        });
      }
    } else if (currentTab === "remote_access") {
      items.push({
        title: t("settings.remote_access"),
        disabled: name === "remoteaccesssettings",
        to: { name: "remoteaccesssettings" },
      });
    } else if (currentTab === "frontend") {
      items.push({
        title: t("settings.frontend"),
        disabled: name === "frontendsettings",
        to: { name: "frontendsettings" },
      });
    } else if (currentTab === "users") {
      items.push({
        title: t("settings.users"),
        disabled: name === "usersettings",
        to: { name: "usersettings" },
      });
    } else if (currentTab === "music_providers") {
      items.push({
        title: t("settings.music_sources"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "music" } },
      });
    } else if (currentTab === "player_providers") {
      items.push({
        title: t("settings.playerproviders"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "player" } },
      });
    } else if (currentTab === "metadata_providers") {
      items.push({
        title: t("settings.metadataproviders"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "metadata" } },
      });
    } else if (currentTab === "plugin_providers") {
      items.push({
        title: t("settings.plugins"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "plugin" } },
      });
    } else if (currentTab === "audio_analysis_providers") {
      items.push({
        title: t("settings.audio_analysis_providers"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "audio_analysis" } },
      });
    } else if (currentTab === "about") {
      items.push({
        title: t("settings.about"),
        disabled: name === "aboutsettings",
        to: { name: "aboutsettings" },
      });
    }
  }

  match(name)
    .with("editprovider", () => {
      items.push({
        title: getProviderName(route.params.instanceId as string),
        disabled: true,
      });
    })
    .with("addgroup", () => {
      items.push({ title: t("settings.add_group_player"), disabled: true });
    })
    .with(
      "editplayer",
      "editplayerdsp",
      "editplayeroptions",
      "editqueue",
      () => {
        // a queue is identified by the player id of the player owning it
        const playerId = (route.params.playerId ||
          route.params.queueId) as string;
        items.push({
          // a disabled player is never registered, so it has no name to show
          title: api.players[playerId]?.name || t("settings.player_settings"),
          disabled: name === "editplayer",
          to: { name: "editplayer", params: { playerId } },
        });
        const section = match(name)
          .with("editplayerdsp", () => t("settings.category.dsp"))
          .with("editplayeroptions", () => t("settings.category.options"))
          .with("editqueue", () => t("settings.queue_settings"))
          .otherwise(() => undefined);
        if (section) items.push({ title: section, disabled: true });
      },
    )
    .with("editcore", () => {
      const domain = route.params.domain as string;
      const translated = t(`settings.core_module.${domain}.name`);
      const moduleName =
        translated !== `settings.core_module.${domain}.name`
          ? translated
          : api.providerManifests[domain]?.name || domain;
      items.push({
        title: moduleName,
        disabled: true,
      });
    })
    .with("diagnostics", () => {
      items.push({
        title: t("settings.diagnostics"),
        disabled: true,
      });
    })
    .with("backgroundtasks", () => {
      items.push({
        title: t("background_tasks.title"),
        disabled: true,
      });
    })
    .with("genremanagement", () => {
      items.push({
        title: t("settings.genre_management"),
        disabled: true,
      });
    })
    .with("audioanalysissettings", () => {
      items.push({
        title: t("settings.audio_analysis"),
        disabled: true,
      });
    })
    .otherwise(() => {
      return;
    });

  return items;
});
</script>

<style scoped>
.settings-overview {
  max-width: 1200px !important;
  margin: 0 auto;
}

/* ---------- card view: a flat, editorial grid ---------- */

.settings-card-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-featured {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (max-width: 768px) {
  .settings-featured {
    grid-template-columns: 1fr;
  }
}

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
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

/* the card's border utility sets its colour !important */
.setting-card:hover {
  border-color: color-mix(
    in oklab,
    var(--foreground) 16%,
    transparent
  ) !important;
  background-color: color-mix(
    in oklab,
    var(--foreground) 2%,
    var(--card)
  ) !important;
}

.setting-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.setting-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--secondary);
  color: var(--foreground);
}

/* the two places most setups start from carry the one accent */
.setting-card--featured .setting-icon {
  width: 44px;
  height: 44px;
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--primary);
}

.setting-title {
  margin: 0 0 4px;
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: var(--foreground);
}

.setting-card--featured .setting-title {
  font-size: 1.5rem;
}

.setting-description {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.setting-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  color: var(--subtle-foreground);
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.setting-card:hover .setting-chevron {
  color: var(--foreground);
  background: var(--secondary);
}

/* ---------- list view: grouped rows with hairlines ---------- */

.settings-list-view {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-list {
  padding: 0;
  background: var(--card) !important;
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.settings-list-item.list-item-main {
  cursor: pointer;
  min-height: 60px;
  padding: 10px 16px !important;
  margin-right: 0 !important;
  border-radius: 0 !important;
  background: transparent;
  transition: background-color 0.15s ease;
}

.settings-list-item + .settings-list-item {
  border-top: 1px solid var(--border);
}

.settings-list-item:hover {
  background-color: color-mix(in oklab, var(--foreground) 4%, transparent);
}

.settings-list-item :deep(.v-list-item__overlay) {
  display: none;
}

.setting-list-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--secondary);
  color: var(--foreground);
}

.settings-list-item :deep(.v-list-item__prepend) {
  padding-inline-end: 14px;
}

.settings-list-item :deep(.v-list-item__prepend .v-icon) {
  margin-inline-end: 0 !important;
}

.settings-list-item :deep(.v-list-item__content > div) {
  padding-left: 0;
}

.settings-list-item :deep(.v-list-item-title) {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
}

.settings-list-item :deep(.v-list-item-subtitle) {
  font-size: 0.78125rem;
  line-height: 1.45;
  color: var(--muted-foreground);
  opacity: 1;
  margin-top: 2px;
}

.settings-list-item :deep(.v-list-item__append) {
  color: var(--subtle-foreground);
  transition: color 0.15s ease;
}

.settings-list-item:hover :deep(.v-list-item__append) {
  color: var(--foreground);
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .settings-overview {
    padding: 16px 12px;
  }

  .setting-header-top {
    margin-bottom: 10px;
  }

  .setting-title,
  .setting-card--featured .setting-title {
    font-size: 1.1875rem;
  }

  .settings-list-item.list-item-main {
    padding: 10px 12px !important;
  }
}

/* ---------- onboarding ---------- */

.onboarding-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px 24px 18px;
  margin-bottom: 24px;
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.onboarding-close {
  color: var(--muted-foreground);
}

.onboarding-title {
  margin: 0 0 6px 0;
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: var(--foreground);
}

.onboarding-subtitle {
  margin: 0;
  max-width: 64ch;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.onboarding-sections {
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.onboarding-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.onboarding-section + .onboarding-section {
  border-top: 1px solid var(--border);
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--primary);
}

.section-content {
  flex: 1;
  min-width: 0;
}

.section-content h3 {
  margin: 0 0 2px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
}

.section-content p {
  margin: 0;
  font-size: 0.78125rem;
  line-height: 1.45;
  color: var(--muted-foreground);
}

.section-btn {
  flex-shrink: 0;
  border-radius: 999px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.onboarding-footer {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.78125rem;
  color: var(--subtle-foreground);
}

@media (max-width: 768px) {
  .onboarding-card {
    padding: 18px 16px 14px;
  }

  .onboarding-section {
    flex-wrap: wrap;
  }

  .section-btn {
    width: 100%;
  }

  .onboarding-title {
    font-size: 1.5rem;
  }
}
</style>

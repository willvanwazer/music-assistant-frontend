<template>
  <Container class="max-w-4xl mx-auto px-4 py-6 space-y-6">
    <!-- Server Information -->
    <Card class="gap-4">
      <CardHeader>
        <CardTitle
          class="font-display text-xl font-medium tracking-[-0.01em]"
          >{{ $t("settings.server_info") }}</CardTitle
        >
        <CardAction v-if="isAdmin">
          <Button
            variant="ghost"
            size="icon-sm"
            :title="$t('settings.core_module.webserver.name')"
            @click="editWebserverConfig"
          >
            <Pencil class="size-4" />
            <span class="sr-only">
              {{ $t("settings.core_module.webserver.name") }}
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent class="divide-y divide-border">
        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_name") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium">
              {{ api.serverInfo.value?.name }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_version") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-xs font-mono text-muted-foreground">
              {{ api.serverInfo.value?.server_version }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_internal_url") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-xs font-mono text-muted-foreground break-all">
              {{ internalUrl }}
            </span>
          </ItemContent>
        </Item>

        <Item
          v-if="api.serverInfo.value?.external_url"
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_external_url") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-xs font-mono text-muted-foreground break-all">
              {{ api.serverInfo.value?.external_url }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_remote_access") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <Badge
              :variant="
                api.serverInfo.value?.has_remote_access ? 'default' : 'outline'
              "
            >
              {{
                api.serverInfo.value?.has_remote_access ? $t("yes") : $t("no")
              }}
            </Badge>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_clock_offset") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <Badge v-if="clockOffsetIsLarge" variant="destructive">
              {{ clockOffsetLabel }}
            </Badge>
            <span v-else class="text-xs font-mono text-muted-foreground">
              {{ clockOffsetLabel }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_as_addon") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <Badge
              :variant="
                api.serverInfo.value?.homeassistant_addon
                  ? 'default'
                  : 'outline'
              "
            >
              {{
                api.serverInfo.value?.homeassistant_addon ? $t("yes") : $t("no")
              }}
            </Badge>
          </ItemContent>
        </Item>
      </CardContent>
    </Card>

    <!-- Open Home Foundation -->
    <Card
      as="a"
      href="https://www.openhomefoundation.org/"
      target="_blank"
      class="group cursor-pointer transition-colors hover:border-foreground/20"
    >
      <CardContent class="flex flex-col items-center text-center gap-4 py-8">
        <div
          class="text-[11px] font-semibold tracking-[0.14em] text-subtle-foreground uppercase"
        >
          {{ $t("settings.proud_part_of") }}
        </div>
        <div class="w-full max-w-xs">
          <img
            :src="openHomeFoundationLogo"
            alt="Open Home Foundation"
            class="w-full h-auto opacity-90 transition-opacity group-hover:opacity-100"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Library Statistics -->
    <Card class="gap-4">
      <CardHeader>
        <CardTitle
          class="font-display text-xl font-medium tracking-[-0.01em]"
          >{{ $t("settings.library_stats") }}</CardTitle
        >
      </CardHeader>
      <CardContent class="divide-y divide-border">
        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.artists_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium tabular-nums">
              {{ (store.libraryArtistsCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.albums_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium tabular-nums">
              {{ (store.libraryAlbumsCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.tracks_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium tabular-nums">
              {{ (store.libraryTracksCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.playlists_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium tabular-nums">
              {{ (store.libraryPlaylistsCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item
          size="sm"
          class="justify-between rounded-none px-0 py-3 first:pt-0 last:pb-0"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.radio_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium tabular-nums">
              {{ (store.libraryRadiosCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>
      </CardContent>
    </Card>

    <!-- Links -->
    <Card class="gap-4">
      <CardHeader>
        <CardTitle
          class="font-display text-xl font-medium tracking-[-0.01em]"
          >{{ $t("settings.links") }}</CardTitle
        >
      </CardHeader>
      <CardContent class="divide-y divide-border">
        <a
          :href="changelogUrl"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-text-box-outline" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.changelog") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                github.com/music-assistant/server
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>

        <a
          :href="documentationUrl"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-bookshelf" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.documentation") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                music-assistant.io
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>

        <a
          v-if="apiDocsUrl"
          :href="apiDocsUrl"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-api" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.api_docs") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                {{ apiDocsUrl }}
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>

        <a
          href="https://github.com/orgs/music-assistant/discussions/categories/feature-requests-and-ideas"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-lightbulb-outline" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.feature_requests") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                GitHub Discussions
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>

        <a
          href="https://github.com/music-assistant/support"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-bug" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.bug_reports") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                GitHub Support repository
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>

        <a
          href="https://github.com/orgs/music-assistant/discussions"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-forum" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.discussion_forums") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                GitHub Discussions
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>

        <a
          href="https://github.com/music-assistant/server/blob/dev/LICENSE"
          target="_blank"
          class="group/link flex items-center justify-between gap-4 py-3 no-underline first:pt-0 last:pb-0"
        >
          <div class="flex flex-1 items-center gap-3.5">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground"
            >
              <v-icon icon="mdi-license" size="20" />
            </div>
            <div class="flex flex-col gap-0.5">
              <span
                class="text-sm font-semibold text-foreground transition-colors group-hover/link:text-primary"
              >
                {{ $t("settings.license") }}
              </span>
              <span class="text-[12.5px] text-muted-foreground">
                Apache 2.0 License
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="shrink-0 text-subtle-foreground transition-colors group-hover/link:text-foreground"
          />
        </a>
      </CardContent>
    </Card>
  </Container>
</template>

<script setup lang="ts">
import openHomeFoundationLogo from "@/assets/open-home-foundation-logo.svg";
import Container from "@/components/Container.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { useServerTime } from "@/composables/useServerTime";
import { api } from "@/plugins/api";
import { authManager } from "@/plugins/auth";
import { store } from "@/plugins/store";
import { Pencil } from "@lucide/vue";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

// Above this, the offset is a real misconfiguration on one of the two machines rather
// than measurement noise, and worth calling out: it also affects things the frontend
// cannot correct for, such as token expiry and scheduled tasks.
const LARGE_CLOCK_OFFSET_SECONDS = 10;

const router = useRouter();

const { offsetSeconds: clockOffsetSeconds } = useServerTime();

const isAdmin = computed(() => authManager.isAdmin());

// older servers only report the (now deprecated) base_url
const internalUrl = computed(
  () =>
    api.serverInfo.value?.internal_url || api.serverInfo.value?.base_url || "",
);

const editWebserverConfig = () => {
  router.push({ name: "editcore", params: { domain: "webserver" } });
};

const clockOffsetIsLarge = computed(
  () =>
    clockOffsetSeconds.value !== null &&
    Math.abs(clockOffsetSeconds.value) >= LARGE_CLOCK_OFFSET_SECONDS,
);

const clockOffsetLabel = computed(() => {
  const offset = clockOffsetSeconds.value;
  if (offset === null) return "—";
  const sign = offset < 0 ? "-" : "+";
  const magnitude = Math.abs(offset);
  return magnitude < 1
    ? `${sign}${Math.round(magnitude * 1000)} ms`
    : `${sign}${magnitude.toFixed(1)} s`;
});

const changelogUrl = computed(() => {
  return "https://github.com/music-assistant/server/releases";
});

const documentationUrl = computed(() => {
  const version = api.serverInfo.value?.server_version || "";
  // Check if version contains 'beta' or starts with '0.' for nightly
  if (version.includes("beta") || version.startsWith("0.")) {
    return "https://beta.music-assistant.io";
  }
  return "https://music-assistant.io";
});

const apiDocsUrl = computed(() => {
  const baseUrl = api.serverInfo.value?.base_url || "";
  return `${baseUrl}/api-docs`;
});

onMounted(async () => {
  // Refresh/read the library counts
  store.libraryArtistsCount = await api.getLibraryArtistsCount();
  store.libraryAlbumsCount = await api.getLibraryAlbumsCount();
  store.libraryTracksCount = await api.getLibraryTracksCount();
  store.libraryPlaylistsCount = await api.getLibraryPlaylistsCount();
  store.libraryRadiosCount = await api.getLibraryRadiosCount();
  store.libraryGenresCount = await api.getLibraryGenresCount();
});
</script>

<style scoped>
.font-monospace {
  font-family: monospace;
  font-size: 0.9em;
}
</style>

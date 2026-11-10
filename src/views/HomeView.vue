<template>
  <div class="ed-discover">
    <!-- colour comes only from the art: a blurred wash of what is playing
         now, fading into the page; nothing when nothing is playing -->
    <div
      v-if="washStyle"
      class="ed-wash"
      :style="washStyle"
      aria-hidden="true"
    ></div>

    <Toolbar
      :is-discover-page="true"
      :icon="Compass"
      color="transparent"
      :title="$t('discover')"
    >
      <template #append>
        <Button
          variant="ghost"
          size="icon"
          :class="editMode ? 'text-primary' : 'opacity-80'"
          :title="
            $t(editMode ? 'homescreen_edit_disable' : 'homescreen_edit_enable')
          "
          :aria-label="
            $t(editMode ? 'homescreen_edit_disable' : 'homescreen_edit_enable')
          "
          @click="handleHomescreenEditToggle"
        >
          <SquarePen class="size-5" />
        </Button>
      </template>
    </Toolbar>

    <!-- compact greeting: the date as an eyebrow, the line in the serif -->
    <header v-if="greeting" class="ed-greet">
      <p class="ed-greet__date">{{ todayLabel }}</p>
      <h1 class="ed-greet__title">{{ greeting }}</h1>
    </header>

    <!-- Provider error warning banner: message on the left, actions pinned
         right so the bar never reads as empty on wide screens. -->
    <Alert
      v-if="hasProviderErrors && showProviderWarning"
      variant="destructive"
      class="provider-alert ed-alert mb-6 mt-4 flex w-auto items-center gap-3 bg-destructive/8 py-3 pl-4 pr-3 [&>svg]:translate-y-0"
    >
      <CircleAlert class="size-5 shrink-0" />
      <AlertDescription class="min-w-0 flex-1 text-destructive">
        {{ $t("settings.provider_requires_attention_detail") }}
      </AlertDescription>
      <Button
        variant="destructive"
        size="sm"
        class="shrink-0"
        @click="navigateToProviders"
      >
        {{ $t("settings.fix_now") }}
        <ArrowRight class="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        :aria-label="$t('close')"
        @click="showProviderWarning = false"
      >
        <X class="size-4" />
      </Button>
    </Alert>

    <!-- Newly discovered devices that still need setup; Review opens the
         players list filtered down to them. -->
    <Alert
      v-if="isAdmin && showSetupPrompt && playersNeedingSetup.length > 0"
      variant="warning"
      class="ed-alert mb-6 mt-4 flex w-auto items-center gap-3 py-3 pl-4 pr-3 [&>svg]:translate-y-0"
    >
      <TriangleAlert class="size-5 shrink-0" />
      <AlertDescription class="min-w-0 flex-1">
        {{
          $t("players_need_setup", playersNeedingSetup.length, {
            named: { count: playersNeedingSetup.length },
          })
        }}
      </AlertDescription>
      <Button
        variant="secondary"
        size="sm"
        class="shrink-0"
        @click="reviewSetupPlayers"
      >
        {{ $t("review") }}
        <ArrowRight class="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="shrink-0"
        :aria-label="$t('close')"
        @click="showSetupPrompt = false"
      >
        <X class="size-4" />
      </Button>
    </Alert>

    <ListeningHighlights
      class="ed-layer"
      section="recent"
      @catalog-items="recentCatalogItems = $event"
    />
    <HomeWidgetRows
      class="ed-layer"
      :edit-mode="editMode"
      @catalog-items="rowCatalogItems = $event"
    />

    <!-- Floating exit button while editing the home screen -->
    <Button
      v-if="editMode"
      class="ed-edit-done"
      @click="handleHomescreenEditToggle"
    >
      <Check class="size-4" />
      {{ $t("homescreen_edit_disable") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import HomeWidgetRows from "@/components/HomeWidgetRows.vue";
import ListeningHighlights from "@/components/discover/ListeningHighlights.vue";
import Toolbar from "@/components/Toolbar.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useHomeCatalogWarmup } from "@/composables/useHomeCatalogWarmup";
import { paletteFromServer, rgbToHex } from "@/helpers/utils";
import { api } from "@/plugins/api";
import type { MediaItemTypeOrItemMapping } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Compass,
  SquarePen,
  TriangleAlert,
  X,
} from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const recentCatalogItems = ref<MediaItemTypeOrItemMapping[]>([]);
const rowCatalogItems = ref<MediaItemTypeOrItemMapping[]>([]);
// All shelves share one queue; prioritize the first shelf and stop on navigation.
useHomeCatalogWarmup(
  computed(() => [...recentCatalogItems.value, ...rowCatalogItems.value]),
);

// --- Greeting: first name of the signed-in user and the time of day. Kept to
// two short lines; it is left out when no name is known. ---
const now = ref(new Date());
let clockTimer: ReturnType<typeof setInterval> | undefined;

const firstName = computed(() => {
  const user = store.currentUser;
  const name = (user?.display_name || user?.username || "").trim();
  return name.split(/\s+/)[0] ?? "";
});

const greeting = computed(() => {
  if (!firstName.value) return "";
  const hour = now.value.getHours();
  const key =
    hour >= 5 && hour < 12
      ? "listening_home.greeting_morning"
      : hour >= 12 && hour < 18
        ? "listening_home.greeting_afternoon"
        : "listening_home.greeting_evening";
  return $t(key, { name: firstName.value });
});

const todayLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now.value),
);

// --- Artwork wash: the palette of what the selected player has loaded (the
// same server palette the player bar uses). No palette, no wash. ---
const washStyle = computed(() => {
  const palette = store.activePlayer?.current_media?.palette;
  if (!palette) return undefined;
  const { lightColor, darkColor } = paletteFromServer(palette);
  const first = palette.primary ? rgbToHex(palette.primary) : lightColor;
  const second = palette.accent ? rgbToHex(palette.accent) : darkColor;
  if (!first && !second) return undefined;
  return {
    "--ed-wash-1": first || second,
    "--ed-wash-2": second || first,
  };
});
const editMode = ref(false);
const hasProviderErrors = ref(false);
const showProviderWarning = ref(true);
const erroredProviderType = ref<string | null>(null);
const isAdmin = ref(false);
const showSetupPrompt = ref(true);

const playersNeedingSetup = computed(() =>
  Object.values(api.players).filter(
    (player) => player.enabled && player.needs_setup,
  ),
);

const reviewSetupPlayers = () => {
  router.push({ name: "playersettings", query: { status: "needs_setup" } });
};

const handleHomescreenEditToggle = () => {
  editMode.value = !editMode.value;
};

const navigateToProviders = () => {
  if (erroredProviderType.value) {
    router.push({
      name: "providersettings",
      query: { types: erroredProviderType.value },
    });
  } else {
    router.push({ name: "settings" });
  }
};

onBeforeUnmount(() => {
  clearInterval(clockTimer);
});

onMounted(async () => {
  // keeps the greeting and date current on a page left open
  clockTimer = setInterval(() => {
    now.value = new Date();
  }, 60_000);
  isAdmin.value = authManager.isAdmin();
  if (authManager.isAdmin()) {
    try {
      const configs = await api.getProviderConfigs();
      const firstError = configs.find(
        (config) => config.enabled && config.last_error,
      );
      hasProviderErrors.value = !!firstError;
      erroredProviderType.value = firstError?.type ?? null;
    } catch {
      // Ignore errors - this is a best-effort feature
    }
  }
});
</script>

<style scoped>
.provider-alert {
  border-color: var(--destructive) !important;
}
.ed-alert {
  margin-inline: var(--ed-page-gutter);
}

/* The page sets the horizontal rhythm every Discover section follows. It
   deliberately opens no stacking context, so the fixed Done button keeps
   competing with the app chrome exactly as before. */
.ed-discover {
  --ed-page-gutter: 48px;
  position: relative;
  background: var(--background);
  min-height: 100%;
}

/* Artwork wash behind the top of the page, from the playing art's palette:
   vivid on dark, pastel on light, fading out into the page background. It is
   the first positioned child, so everything positioned after it (the toolbar,
   the greeting, the .ed-layer sections) paints over it. */
.ed-wash {
  --ed-wash-mix: 62%;
  --ed-wash-strength: 0.5;
  position: absolute;
  inset: 0 0 auto 0;
  height: 480px;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.ed-layer {
  position: relative;
}
.dark .ed-wash {
  --ed-wash-mix: 0%;
  --ed-wash-strength: 0.55;
}
.ed-wash::before {
  content: "";
  position: absolute;
  inset: -120px;
  background:
    radial-gradient(
      40% 60% at 18% 30%,
      color-mix(in oklab, var(--ed-wash-1), #fff var(--ed-wash-mix)) 0%,
      transparent 70%
    ),
    radial-gradient(
      45% 70% at 70% 10%,
      color-mix(in oklab, var(--ed-wash-2), #fff var(--ed-wash-mix)) 0%,
      transparent 70%
    ),
    radial-gradient(
      50% 60% at 95% 70%,
      color-mix(in oklab, var(--ed-wash-1), #fff var(--ed-wash-mix)) 0%,
      transparent 70%
    );
  filter: blur(40px) saturate(1.2);
  opacity: var(--ed-wash-strength);
}
.ed-wash::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 20%,
    var(--background) 92%
  );
}

/* Compact greeting: an eyebrow date and one serif line. */
.ed-greet {
  position: relative;
  padding: 4px var(--ed-page-gutter) 22px;
}
.ed-greet__date {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--subtle-foreground);
}
.ed-greet__title {
  margin: 8px 0 0;
  font-family: var(--font-heading);
  font-size: 48px;
  line-height: 1.02;
  font-weight: 500;
  letter-spacing: -0.015em;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.ed-edit-done {
  position: fixed;
  right: calc(24px + var(--device-inset-right));
  top: calc(24px + var(--device-inset-top));
  /* Only has to clear the drag ghost in HomeWidgetRows, so it stays out of the
     global stacking scale and below the player bar and its backdrops. */
  z-index: 60;
  /* Outweighs the equally-!important radius the button's own variants carry. */
  border-radius: 999px !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 1100px) {
  .ed-discover {
    --ed-page-gutter: 32px;
  }
  .ed-greet__title {
    font-size: 42px;
  }
}

@media (max-width: 600px) {
  .ed-discover {
    --ed-page-gutter: 16px;
  }
  .ed-greet {
    padding-bottom: 14px;
  }
  .ed-greet__title {
    margin-top: 6px;
    font-size: 32px;
  }
}
</style>

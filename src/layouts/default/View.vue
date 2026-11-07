<template>
  <v-main
    id="cont"
    :class="['main-layout', { 'main-layout--mobile': store.mobileLayout }]"
  >
    <SidebarProvider>
      <AppSidebar v-if="!store.frameless" />
      <SidebarInset>
        <div
          :class="[
            'content-section',
            { 'content-section--mobile': store.mobileLayout },
            { 'content-section--frameless': store.frameless },
            { 'party-view-active': route.meta.partyView === true },
          ]"
        >
          <router-view v-slot="{ Component }">
            <component :is="Component" />
          </router-view>
          <add-to-playlist-dialog />
          <audio-overlay-dialog />
          <create-playlist-dialog />
          <PlaylistFolderDialog />
          <create-smart-playlist-dialog />
          <import-playlist-dialog />
          <play-announcement-dialog />
          <merge-genre-dialog />
          <delete-genre-dialog />
          <link-genre-dialog />
          <dialog-delete-confirmation />
          <player-group-playback-dialog />
          <setup-flow-dialog />
          <player-rename-dialog />
          <item-context-menu />
          <command-center />
          <AddManualLink
            v-model="showEditItemDialog"
            :type="editItemType"
            :edit-item="editItem"
          />
        </div>
      </SidebarInset>
      <PlayerSelect />
    </SidebarProvider>
    <!-- keeps the clock legible over what scrolls under it (see the style) -->
    <div class="inset-corner-scrim" aria-hidden="true"></div>
  </v-main>
</template>

<script lang="ts" setup>
import PlaylistFolderDialog from "@/components/playlist-folders/PlaylistFolderDialog.vue";
import AddManualLink from "@/components/AddManualLink.vue";
import CommandCenter from "@/components/CommandCenter.vue";
import DialogDeleteConfirmation from "@/components/DialogDeleteConfirmation.vue";
import DeleteGenreDialog from "@/components/genre/DeleteGenreDialog.vue";
import LinkGenreDialog from "@/components/genre/LinkGenreDialog.vue";
import MergeGenreDialog from "@/components/genre/MergeGenreDialog.vue";
import AppSidebar from "@/components/navigation/AppSidebar.vue";
import PlayerRenameDialog from "@/components/PlayerRenameDialog.vue";
import PlayerGroupPlaybackDialog from "@/components/PlayerGroupPlaybackDialog.vue";
import SetupFlowDialog from "@/components/SetupFlowDialog.vue";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  MediaType,
  type Playlist,
  type Radio,
  type Track,
} from "@/plugins/api/interfaces";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AddToPlaylistDialog from "./AddToPlaylistDialog.vue";
import AudioOverlayDialog from "./AudioOverlayDialog.vue";
import CreatePlaylistDialog from "./CreatePlaylistDialog.vue";
import CreateSmartPlaylistDialog from "./CreateSmartPlaylistDialog.vue";
import ImportPlaylistDialog from "./ImportPlaylistDialog.vue";
import ItemContextMenu from "./ItemContextMenu.vue";
import PlayAnnouncementDialog from "./PlayAnnouncementDialog.vue";
import PlayerSelect from "./PlayerSelect.vue";

const route = useRoute();

const showEditItemDialog = ref(false);
const editItem = ref<Radio | Track | Playlist | undefined>(undefined);
const editItemType = ref<MediaType>(MediaType.RADIO);

onMounted(() => {
  eventbus.on("editItemDialog", (item: Radio | Track | Playlist) => {
    editItem.value = item;
    editItemType.value = item.media_type as MediaType;
    showEditItemDialog.value = true;
  });
  onBeforeUnmount(() => {
    eventbus.off("editItemDialog");
  });
});
</script>

<style scoped>
.main-layout {
  box-sizing: border-box;
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  /* Reset Vuetify's automatic padding that accounts for drawers */
  padding-top: var(--device-inset-top) !important;
  padding-right: var(--device-inset-right) !important;
  padding-left: var(--device-inset-left) !important;
}

.content-section {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-bottom: calc(110px + var(--device-inset-bottom));
}

.content-section--mobile {
  /* clears the bottom navigation plus the floating player bar above it */
  padding-bottom: calc(var(--mobile-navigation-height) + 162px);
}

.content-section--frameless {
  padding-bottom: 0;
}

/* Where the system only draws into one top corner (an iPhone Duo opened out on
   its side, see insetCorner), the page runs to the top and to that side of the
   screen instead of losing a band and a strip to it. The content starts below
   the corner and scrolls up under it, as it would in a native app. */
:root[data-inset-corner] .main-layout {
  padding-top: 0 !important;
}

:root[data-inset-corner="top-right"] .main-layout {
  padding-right: 0 !important;
}

:root[data-inset-corner="top-left"] .main-layout {
  padding-left: 0 !important;
}

:root[data-inset-corner] .content-section {
  padding-top: var(--device-inset-top);
}

/* A frosted patch under the clock, which fades out into the page. At rest the
   page behind it is bare, so it only shows once something scrolls under it. */
.inset-corner-scrim {
  display: none;
}

:root[data-inset-corner] .inset-corner-scrim {
  display: block;
  position: fixed;
  top: 0;
  z-index: 20;
  width: calc(
    1.75 * (var(--device-inset-right) + var(--device-inset-left)) + 24px
  );
  height: calc(1.25 * var(--device-inset-top));
  /* it only softens what is behind it, so it never takes a tap */
  pointer-events: none;
  background: color-mix(in oklab, var(--background) 72%, transparent);
  /* must stay unprefixed: the minifier keeps only the last of a hand-written
     pair, and -webkit-backdrop-filter alone is dead in Chromium */
  backdrop-filter: blur(14px);
}

:root[data-inset-corner="top-right"] .inset-corner-scrim {
  right: 0;
  mask-image: radial-gradient(
    farthest-side at top right,
    #000 55%,
    transparent 100%
  );
}

:root[data-inset-corner="top-left"] .inset-corner-scrim {
  left: 0;
  mask-image: radial-gradient(
    farthest-side at top left,
    #000 55%,
    transparent 100%
  );
}
</style>

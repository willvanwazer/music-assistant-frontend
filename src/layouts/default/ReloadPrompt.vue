<script setup lang="ts">
import { store } from "@/plugins/store";
import { useRegisterSW } from "virtual:pwa-register/vue";

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

const close = async () => {
  offlineReady.value = false;
  needRefresh.value = false;
};
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    :class="['pwa-toast', { 'pwa-toast--frameless': store.frameless }]"
    role="alert"
  >
    <div class="message">
      <span v-if="offlineReady">{{ $t("offline_ready") }}</span>
      <span v-else>{{ $t("update_available") }}</span>
    </div>
    <div class="pwa-toast-actions">
      <button
        v-if="needRefresh"
        class="pwa-toast-primary"
        @click="updateServiceWorker()"
      >
        {{ $t("reload") }}
      </button>
      <button @click="close">{{ $t("close") }}</button>
    </div>
  </div>
</template>

<style>
.pwa-toast {
  position: fixed;
  /* The margin below sets the gap, so these only have to clear the bars pinned
     to the bottom of the screen and a side cutout. */
  right: var(--device-inset-right);
  bottom: var(--bottom-bars-height);
  margin: 16px;
  max-width: min(360px, calc(100vw - 32px));
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  /* Renders outside v-app, so this competes with the player bar directly. Just
     enough to clear the bars, leaving everything above them covering it. */
  z-index: 2002;
  text-align: left;
  box-shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.45);
  /* The same tokens the app's other toasts take, so it follows the theme. The
     buttons below inherit the text colour from here. */
  background-color: var(--popover);
  color: var(--popover-foreground);
  font-size: 0.84375rem;
}

/* Without the app frame there are no bars to clear, only the screen's own
   bottom edge. */
.pwa-toast--frameless {
  bottom: var(--device-inset-bottom);
}

.pwa-toast .message {
  margin-bottom: 12px;
  font-weight: 500;
}

.pwa-toast-actions {
  display: flex;
  gap: 8px;
}

.pwa-toast button {
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  outline: none;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 0.78125rem;
  font-weight: 600;
  transition: filter 0.15s ease;
}

.pwa-toast button.pwa-toast-primary {
  background: var(--primary);
  color: var(--primary-foreground);
}

.pwa-toast button:hover {
  filter: brightness(1.08);
}

.pwa-toast button:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
}
</style>

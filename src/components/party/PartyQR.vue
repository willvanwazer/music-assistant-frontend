<template>
  <div ref="qrContainer" class="qr-container">
    <div v-if="loading" class="qr-loading">
      <Spinner class="size-12" />
    </div>
    <div
      v-else-if="qrCodeUrl"
      class="qr-display"
      :class="{ 'qr-display--light-modules': lightModules }"
      :style="{
        '--qr-size': qrSize + 'px',
        '--qr-color': props.qrDark,
      }"
    >
      <button
        type="button"
        class="qr-link"
        :aria-label="$t('providers.party.copy_link')"
        @click="copyUrlToClipboard"
      >
        <svg
          class="qr-code"
          :viewBox="`0 0 ${qrExtent} ${qrExtent}`"
          :width="qrSize"
          :height="qrSize"
          shape-rendering="crispEdges"
          aria-hidden="true"
        >
          <path :d="qrModulesPath" :fill="qrDark" />
        </svg>
        <Transition name="copy-toast">
          <div
            v-if="copyFeedback"
            class="copy-bubble"
            :class="{ 'copy-bubble--error': !copySucceeded }"
          >
            <Check v-if="copySucceeded" :size="16" />
            <AlertCircle v-else :size="16" />
            {{ copyFeedback }}
          </div>
        </Transition>
      </button>
      <p
        v-if="qrText"
        :style="{ width: qrSize + 'px', textAlign: 'center' }"
        class="qr-text"
      >
        {{ qrText }}
      </p>
      <InvitationShareActions
        ref="shareActions"
        class="qr-actions"
        variant="ghost-outline"
        :join-link="qrCodeUrl"
        :title="shareTitle"
        :description="shareDescription"
        :copy-label="$t('providers.party.copy_link')"
        :copied-label="$t('providers.party.link_copy_success')"
        :more-options-label="$t('providers.party.more_share_options')"
        :share-label="$t('providers.party.share_invitation')"
        :share-failed-message="$t('providers.party.share_failed')"
        @copied="handleCopyResult"
      />
    </div>
    <div v-else class="qr-error">
      <AlertCircle :size="64" />
      <p>{{ $t("providers.party.qr_failed") }}</p>
      <p class="qr-hint">{{ $t("providers.party.check_network") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import InvitationShareActions from "@/components/InvitationShareActions.vue";
import { Spinner } from "@/components/ui/spinner";
import { usePartyConfig } from "@/composables/usePartyConfig";
import api from "@/plugins/api";
import { EventType } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { AlertCircle, Check } from "@lucide/vue";
import Color from "color";
import QRCode from "qrcode";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    qrDark?: string;
  }>(),
  {
    qrDark: "#FFFFFF",
  },
);

const emit = defineEmits<{ available: [value: boolean] }>();

// Light modules sit on dark glass, dark modules on light glass, so the code
// keeps its contrast whichever wash the dashboard puts behind it.
const lightModules = computed(() => {
  try {
    return Color(props.qrDark).isLight();
  } catch {
    return true;
  }
});

const { config: partyConfig } = usePartyConfig();

const qrText = computed(
  () =>
    partyConfig.value?.qr_text?.trim() || $t("providers.party.qr_default_text"),
);
const shareTitle = computed(() => {
  const partyName = partyConfig.value?.party_name?.trim();
  return partyName
    ? $t("providers.party.share_named_title", [partyName])
    : $t("providers.party.share_title");
});
const shareDescription = computed(
  () =>
    partyConfig.value?.qr_text?.trim() ||
    $t("providers.party.share_description"),
);

const qrContainer = ref<HTMLElement | null>(null);
const shareActions = ref<InstanceType<typeof InvitationShareActions> | null>(
  null,
);
const qrCodeUrl = ref<string>("");
const guestAccessEnabled = ref<boolean>(false);
const loading = ref(true);
const qrSize = ref(320);
const copyFeedback = ref<string>("");
const copySucceeded = ref(false);
let copyFeedbackTimeout: ReturnType<typeof setTimeout> | undefined;
let resizeObserver: ResizeObserver | null = null;
let unsubProviders: (() => void) | undefined;
let unsubCoreState: (() => void) | undefined;
let unmounted = false;

// Quiet zone around the symbol, in modules.
const QR_MARGIN = 2;

const qrModules = computed(() =>
  qrCodeUrl.value ? QRCode.create(qrCodeUrl.value).modules : null,
);

const qrExtent = computed(() =>
  qrModules.value ? qrModules.value.size + QR_MARGIN * 2 : 1,
);

// One 1x1 module square per dark bit; the viewBox scales it to any size, so
// resizing and recolouring stay pure attribute updates.
const qrModulesPath = computed(() => {
  const modules = qrModules.value;
  if (!modules) return "";
  const { size, data } = modules;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) {
        path += `M${x + QR_MARGIN} ${y + QR_MARGIN}h1v1h-1z`;
      }
    }
  }
  return path;
});

function copyUrlToClipboard() {
  void shareActions.value?.copyLink();
}

function handleCopyResult(success: boolean) {
  copySucceeded.value = success;
  copyFeedback.value = success
    ? $t("providers.party.link_copy_success")
    : $t("providers.party.link_copy_fail");
  if (copyFeedbackTimeout) clearTimeout(copyFeedbackTimeout);
  copyFeedbackTimeout = setTimeout(() => {
    copyFeedback.value = "";
  }, 2000);
}

onMounted(async () => {
  await generateQRCode();
  if (unmounted) return;

  // Set up ResizeObserver to regenerate QR code when container size changes
  if (qrContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      qrSize.value = calculateQRSize();
    });
    resizeObserver.observe(qrContainer.value);
  }

  // Subscribe to PROVIDERS_UPDATED to detect when party provider is
  // loaded/unloaded. Config refresh is handled by the composable automatically.
  unsubProviders = api.subscribe(EventType.PROVIDERS_UPDATED, async () => {
    const hasParty = Object.values(api.providers).some(
      (p) => p.domain === "party",
    );
    if (hasParty) {
      await generateQRCode();
    } else {
      guestAccessEnabled.value = false;
      qrCodeUrl.value = "";
      emit("available", false);
    }
  });
  // Subscribe to CORE_STATE_UPDATED to detect when remote access is toggled,
  // which changes the party join URL between local and remote.
  unsubCoreState = api.subscribe(EventType.CORE_STATE_UPDATED, async () => {
    const hasParty = Object.values(api.providers).some(
      (p) => p.domain === "party",
    );
    if (hasParty) {
      await generateQRCode();
    }
  });
});

onBeforeUnmount(() => {
  unmounted = true;
  if (copyFeedbackTimeout) clearTimeout(copyFeedbackTimeout);
  resizeObserver?.disconnect();
  unsubProviders?.();
  unsubCoreState?.();
});

function calculateQRSize() {
  if (!qrContainer.value) return 320;
  const containerWidth = qrContainer.value.clientWidth;
  const containerHeight = qrContainer.value.clientHeight;
  // Use the smaller dimension, leaving room for the text and sharing controls.
  const availableSize = Math.min(containerWidth, containerHeight) - 180;
  // Clamp between 160 and 1024 for usability (supports 4K displays)
  return Math.max(160, Math.min(1024, availableSize));
}

async function generateQRCode() {
  loading.value = true;
  try {
    const url = (await api.sendCommand("party/url")) as string | null;

    guestAccessEnabled.value = !!url;

    if (!url) {
      qrCodeUrl.value = "";
      return;
    }

    // Setting the URL is enough — the symbol is derived from it.
    qrCodeUrl.value = url;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    guestAccessEnabled.value = false;
    qrCodeUrl.value = "";
  } finally {
    loading.value = false;
    emit("available", guestAccessEnabled.value);
  }
}
</script>

<style scoped>
.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* A frosted glass panel, light or dark against the code's own colour. Alpha is
   precomputed: older Cast and Android TV runtimes lack color-mix(). */
.qr-display {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: clamp(1rem, 2.2vh, 2rem);
  padding-bottom: clamp(0.75rem, 1.6vh, 1.5rem);
  border-radius: clamp(16px, 2vh, 28px);
  background: rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 0 0 1px rgba(10, 10, 20, 0.06),
    0 2.4vh 6vh -2vh rgba(20, 20, 50, 0.28);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
}

.qr-display--light-modules {
  background: rgba(16, 16, 18, 0.38);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    0 2.4vh 6vh -2vh rgba(0, 0, 0, 0.6);
}

.qr-link {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}

.qr-link:hover {
  transform: scale(1.03);
  opacity: 0.92;
}

.qr-link:focus-visible {
  outline: 3px solid var(--qr-color);
  outline-offset: 4px;
}

.qr-text {
  margin: 0;
  font-size: clamp(0.95rem, 1.6vh, 1.5rem);
  font-weight: 500;
  line-height: 1.35;
  color: var(--qr-color);
  opacity: 0.85;
}

.qr-actions {
  margin-top: 0.15rem;
}

.qr-actions :deep([data-slot="button"]) {
  border-color: transparent;
  background: rgba(127, 127, 127, 0.16);
  color: var(--qr-color);
  font-weight: 600;
}

.qr-actions :deep([data-slot="button"]:hover) {
  background: rgba(127, 127, 127, 0.3);
  color: var(--qr-color);
}

/* the confirmation floats over the code, so it is a dark scrim in both
   themes */
.copy-bubble {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  height: 2.5rem;
  padding: 0 1.1rem;
  background: rgba(16, 16, 18, 0.86);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    0 16px 40px -10px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.copy-bubble--error {
  background: var(--destructive);
}

.copy-toast-enter-active {
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.copy-toast-leave-active {
  transition: all 0.3s ease-in;
}

.copy-toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
}

.copy-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
}

.qr-display .qr-code {
  display: block;
  border-radius: 4px;
}

.qr-error {
  text-align: center;
  opacity: 0.7;
}

.qr-error p {
  margin-top: 0.5rem;
  font-weight: 500;
  color: var(--destructive);
}

.qr-hint {
  font-size: 0.8rem;
  margin-top: 0.25rem !important;
  opacity: 0.75;
}

@media (prefers-reduced-motion: reduce) {
  .qr-link,
  .copy-toast-enter-active,
  .copy-toast-leave-active {
    transition: none;
  }

  .qr-link:hover {
    transform: none;
  }
}
</style>

<template>
  <Container>
    <div v-if="loading" class="loading-wrapper">
      <v-progress-circular indeterminate size="64" color="primary" />
    </div>
    <div v-else-if="remoteAccessInfo" class="remote-access-wrapper">
      <v-card class="hero-card mb-6" elevation="0" rounded="lg">
        <v-card-item class="hero-content">
          <div class="hero-icon-wrapper">
            <v-icon size="22">mdi-cloud-lock</v-icon>
          </div>
          <v-card-title class="hero-title">
            {{ $t("settings.remote_access_title") }}
          </v-card-title>
          <p class="hero-description">
            {{ $t("settings.remote_access_explanation_intro") }}
          </p>
          <div class="feature-grid">
            <div class="feature-item">
              <v-icon size="20" color="primary">mdi-check-circle</v-icon>
              <span>{{ $t("settings.remote_access_feature_webrtc") }}</span>
            </div>
            <div class="feature-item">
              <v-icon size="20" color="primary">mdi-check-circle</v-icon>
              <span>{{ $t("settings.remote_access_feature_encrypted") }}</span>
            </div>
            <div class="feature-item">
              <v-icon size="20" color="primary">mdi-check-circle</v-icon>
              <span>
                {{ $t("settings.remote_access_feature_no_port_forwarding") }}
              </span>
            </div>
            <div class="feature-item">
              <v-icon size="20" color="primary">mdi-check-circle</v-icon>
              <span>
                {{ $t("settings.remote_access_explanation_ha_cloud") }}
              </span>
            </div>
          </div>
        </v-card-item>
      </v-card>

      <v-card class="status-card mb-6" elevation="0" rounded="lg">
        <v-card-item class="status-header">
          <div class="d-flex align-center justify-space-between w-100">
            <div>
              <v-card-title class="status-title">
                {{ $t("settings.remote_access_status") }}
              </v-card-title>
              <div class="status-text">
                {{
                  remoteAccessInfo.enabled
                    ? $t("settings.remote_access_enabled")
                    : $t("settings.remote_access_disabled")
                }}
              </div>
            </div>
            <v-switch
              :model-value="remoteAccessInfo.enabled"
              :loading="switching"
              :disabled="switching"
              color="primary"
              hide-details
              class="status-switch"
              @update:model-value="toggleRemoteAccess"
            />
          </div>
        </v-card-item>
        <v-card-text v-if="remoteAccessInfo.enabled" class="status-badges">
          <v-chip
            :color="remoteAccessInfo.connected ? 'success' : 'warning'"
            size="default"
            variant="flat"
            class="status-chip"
          >
            {{
              remoteAccessInfo.connected
                ? $t("settings.remote_access_connected")
                : $t("settings.remote_access_connecting")
            }}
          </v-chip>
          <v-chip
            :color="remoteAccessInfo.using_ha_cloud ? 'success' : 'default'"
            size="default"
            variant="outlined"
            class="status-chip"
          >
            {{
              remoteAccessInfo.using_ha_cloud
                ? $t("settings.remote_access_mode_optimized")
                : $t("settings.remote_access_mode_basic")
            }}
          </v-chip>
        </v-card-text>
      </v-card>

      <v-card
        v-if="remoteAccessInfo.enabled && !remoteAccessInfo.using_ha_cloud"
        class="upgrade-card mb-6"
        elevation="0"
        rounded="lg"
      >
        <v-card-item class="upgrade-content">
          <v-icon size="32" color="primary" class="upgrade-icon">
            mdi-cloud-alert
          </v-icon>
          <v-card-title class="upgrade-title">
            {{ $t("settings.remote_access_mode_basic") }}
          </v-card-title>
          <p class="upgrade-description">
            {{ $t("settings.remote_access_mode_basic_description") }}
          </p>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            class="upgrade-button"
            href="https://www.nabucasa.com"
            target="_blank"
          >
            {{ $t("settings.remote_access_upgrade_to_optimized") }}
            <v-icon end>mdi-open-in-new</v-icon>
          </v-btn>
        </v-card-item>
      </v-card>

      <!-- Two-card layout for ID and QR code -->
      <div
        v-if="remoteAccessInfo.enabled && remoteAccessInfo.remote_id"
        class="remote-id-grid mb-6"
      >
        <!-- Text ID Card -->
        <v-card class="remote-id-card" elevation="0" rounded="lg">
          <v-card-item class="remote-id-header">
            <v-icon size="18" class="remote-id-icon mr-2"
              >mdi-identifier</v-icon
            >
            <v-card-title class="remote-id-title">
              {{ $t("settings.remote_access_your_id") }}
            </v-card-title>
          </v-card-item>
          <v-card-text class="remote-id-content">
            <p class="remote-id-explanation">
              {{ $t("settings.remote_access_id_explanation") }}
            </p>
            <div class="remote-id-display-wrapper">
              <SegmentedCodeInput
                readonly
                class="min-w-0 flex-1"
                :model-value="remoteIdParts"
                :layout="remoteIdLayout"
              />
              <v-btn
                icon="mdi-content-copy"
                variant="text"
                size="small"
                color="primary"
                class="copy-button"
                :title="$t('settings.remote_access_copy_id')"
                @click="copyRemoteId"
              />
            </div>
          </v-card-text>
        </v-card>

        <!-- QR Code Card -->
        <v-card class="remote-id-card" elevation="0" rounded="lg">
          <v-card-item class="remote-id-header">
            <v-icon size="18" class="remote-id-icon mr-2">mdi-qrcode</v-icon>
            <v-card-title class="remote-id-title">
              {{ $t("settings.remote_access_qr_code") }}
            </v-card-title>
          </v-card-item>
          <v-card-text class="remote-id-content">
            <p class="remote-id-explanation">
              {{ $t("settings.remote_access_qr_code_description") }}
            </p>
            <div class="qr-code-wrapper">
              <img
                v-if="qrCodeDataUrl"
                :src="qrCodeDataUrl"
                alt="Remote ID QR Code"
                class="qr-code-image"
              />
              <v-progress-circular
                v-else
                indeterminate
                size="32"
                color="primary"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>

      <v-card
        v-if="remoteAccessInfo.enabled && remoteAccessInfo.remote_id"
        class="usage-card mb-6"
        elevation="0"
        rounded="lg"
      >
        <v-card-text class="usage-content">
          <div>
            <div class="usage-title">
              {{ $t("settings.remote_access_how_to_use") }}
            </div>
            <div class="steps-list">
              <div class="step-item">
                <div class="step-number">1</div>
                <div class="step-content">
                  {{ $t("settings.remote_access_step_1") }}
                  <v-btn
                    color="primary"
                    variant="text"
                    size="small"
                    href="https://app.music-assistant.io"
                    target="_blank"
                    class="step-link"
                  >
                    app.music-assistant.io
                    <v-icon end size="small">mdi-open-in-new</v-icon>
                  </v-btn>
                </div>
              </div>
              <div class="step-item">
                <div class="step-number">2</div>
                <div class="step-content">
                  {{ $t("settings.remote_access_step_2") }}
                </div>
              </div>
              <div class="step-item">
                <div class="step-number">3</div>
                <div class="step-content">
                  {{ $t("settings.remote_access_step_3") }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Technical Details -->
      <v-expansion-panels
        v-if="remoteAccessInfo.enabled"
        class="technical-panels"
      >
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon start>mdi-information-outline</v-icon>
            {{ $t("settings.remote_access_technical_details") }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Connection Flow Diagram -->
            <div class="diagram-section">
              <div class="diagram-title">
                {{ $t("settings.remote_access_connection_flow") }}
              </div>
              <v-card variant="outlined" class="diagram-card">
                <img
                  :src="remoteAccessDiagram"
                  alt="Remote Access Connection Flow"
                  class="diagram-image"
                />
              </v-card>
            </div>

            <!-- Technical Specifications -->
            <div class="specs-section">
              <div class="spec-item">
                <v-avatar size="36" class="spec-icon">
                  <v-icon size="18">mdi-access-point-network</v-icon>
                </v-avatar>
                <div class="spec-content">
                  <div class="spec-title">
                    {{ $t("settings.remote_access_signaling_server") }}
                  </div>
                  <div class="spec-description">
                    {{
                      $t("settings.remote_access_signaling_server_description")
                    }}
                  </div>
                </div>
              </div>
              <div class="spec-item">
                <v-avatar size="36" class="spec-icon">
                  <v-icon size="18">mdi-lan-connect</v-icon>
                </v-avatar>
                <div class="spec-content">
                  <div class="spec-title">
                    {{ $t("settings.remote_access_protocol") }}
                  </div>
                  <div class="spec-description">
                    <span v-if="remoteAccessInfo.using_ha_cloud">
                      {{ $t("settings.remote_access_protocol_optimized") }}
                    </span>
                    <span v-else>
                      {{ $t("settings.remote_access_protocol_basic") }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="spec-item">
                <v-avatar size="36" class="spec-icon">
                  <v-icon size="18">mdi-lock</v-icon>
                </v-avatar>
                <div class="spec-content">
                  <div class="spec-title">
                    {{ $t("settings.remote_access_encryption") }}
                  </div>
                  <div class="spec-description">
                    {{ $t("settings.remote_access_encryption_description") }}
                  </div>
                </div>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- Error state -->
    <v-alert v-else type="error" variant="tonal" class="error-alert">
      {{ $t("settings.remote_access_error_loading") }}
    </v-alert>
  </Container>
</template>

<script setup lang="ts">
import remoteAccessDiagram from "@/assets/remote-access-diagram.svg";
import Container from "@/components/Container.vue";
import SegmentedCodeInput from "@/components/SegmentedCodeInput.vue";
import { splitCode } from "@/helpers/segmented_code";
import { copyToClipboard } from "@/helpers/utils";
import { api } from "@/plugins/api";
import type { RemoteAccessInfo } from "@/plugins/api/interfaces";
import QRCode from "qrcode";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const { t } = useI18n();

const loading = ref(true);
const switching = ref(false);
const remoteAccessInfo = ref<RemoteAccessInfo | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Set by the unmount hook, so the startup below can tell that the view it is
// setting things up for is already gone.
let unmounted = false;

// Split remote ID into 4 parts: 8-5-5-8 characters
const remoteIdLengths = [8, 5, 5, 8];
const remoteIdLayout = remoteIdLengths.map((length) => ({ length }));
const remoteIdParts = computed(() =>
  splitCode(remoteAccessInfo.value?.remote_id || "", remoteIdLengths),
);

onMounted(async () => {
  await loadRemoteAccessInfo();
  // The first load can outlast the view, and the unmount hook only reaches
  // what was already set up by the time it ran.
  if (unmounted) return;

  pollInterval = setInterval(async () => {
    await loadRemoteAccessInfo(true);
  }, 5000);
});

onUnmounted(() => {
  unmounted = true;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
});

const loadRemoteAccessInfo = async (silent = false) => {
  if (!silent) {
    loading.value = true;
  }
  try {
    remoteAccessInfo.value = await api.getRemoteAccessInfo();
  } catch (error) {
    console.error("Error loading remote access info:", error);
    if (!silent) {
      toast.error(t("settings.remote_access_error_loading"));
    }
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
};

const toggleRemoteAccess = async (enabled: boolean | null) => {
  if (!remoteAccessInfo.value || enabled === null) return;

  switching.value = true;
  try {
    remoteAccessInfo.value = await api.configureRemoteAccess(enabled);
    toast.success(
      enabled
        ? t("settings.remote_access_enabled_success")
        : t("settings.remote_access_disabled_success"),
    );
  } catch (error) {
    console.error("Error toggling remote access:", error);
    toast.error(t("settings.remote_access_error_toggle"));
  } finally {
    switching.value = false;
  }
};

const copyRemoteId = async () => {
  if (!remoteAccessInfo.value?.remote_id) return;

  // Format with dashes for user-friendly sharing
  const formattedId = remoteIdParts.value.join("-");
  const success = await copyToClipboard(formattedId);
  if (success) {
    toast.success(t("settings.remote_access_id_copied"));
  } else {
    toast.error(t("settings.remote_access_error_copy"));
  }
};

// QR Code generation
const qrCodeDataUrl = ref<string | null>(null);

const generateQrCode = async (remoteId: string) => {
  if (!remoteId) {
    qrCodeDataUrl.value = null;
    return;
  }

  try {
    // Generate QR code with the remote ID
    // The QR code contains a URL that will auto-fill the remote ID on the login page
    const qrData = `https://app.music-assistant.io/?remote_id=${remoteId}`;
    qrCodeDataUrl.value = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    qrCodeDataUrl.value = null;
  }
};

// Watch for remote ID changes and regenerate QR code
watch(
  () => remoteAccessInfo.value?.remote_id,
  (newRemoteId) => {
    if (newRemoteId) {
      generateQrCode(newRemoteId);
    } else {
      qrCodeDataUrl.value = null;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.remote-access-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 0;
}

/* every block is a flat group container */
.remote-access-wrapper .v-card {
  background: var(--card) !important;
  color: var(--card-foreground) !important;
  border: 1px solid var(--border);
  border-radius: 14px !important;
  box-shadow: none !important;
}

.remote-access-wrapper .v-card-title {
  padding: 0;
  white-space: normal;
}

/* the introduction reads as the page head: no box, serif title */
.remote-access-wrapper .hero-card {
  background: transparent !important;
  border: none;
}

.hero-content {
  padding: 4px 0 8px;
  position: relative;
  z-index: 1;
}

.hero-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--primary) 12%, transparent);
  color: var(--primary);
}

.hero-title {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.15;
  margin-bottom: 8px;
  color: var(--foreground);
}

.hero-description {
  max-width: 64ch;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--muted-foreground);
  margin-bottom: 16px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px 16px;
  margin-top: 8px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--muted-foreground);
}

.feature-item .v-icon {
  color: var(--primary);
}

.status-header {
  padding: 16px 20px;
}

.status-header + .status-badges {
  border-top: 1px solid var(--border);
}

.status-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin-bottom: 2px;
}

.status-text {
  font-size: 12.5px;
  color: var(--subtle-foreground);
}

.status-switch {
  flex-shrink: 0;
}

.status-badges {
  padding: 12px 20px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-chip {
  font-weight: 500;
  font-size: 12px;
  border-radius: 999px;
}

.upgrade-content {
  padding: 28px 24px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.upgrade-icon {
  margin-bottom: 12px;
}

.upgrade-title {
  font-family: var(--font-heading);
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}

.upgrade-description {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--muted-foreground);
  margin-bottom: 20px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.upgrade-button {
  margin-top: 4px;
  border-radius: 999px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.remote-id-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.remote-id-header {
  padding: 16px 20px 0;
  display: flex;
  align-items: center;
}

.remote-id-icon {
  color: var(--muted-foreground);
}

.remote-id-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.remote-id-content {
  padding: 12px 20px 20px;
}

.remote-id-explanation {
  font-size: 12.5px;
  color: var(--muted-foreground);
  margin-bottom: 14px;
  line-height: 1.45;
}

.usage-content {
  padding: 18px 20px;
}

.remote-id-display-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.copy-button {
  flex-shrink: 0;
}

.qr-code-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

/* a QR code needs a light quiet zone to scan, in both themes */
.qr-code-image {
  width: 160px;
  height: 160px;
  border-radius: 10px;
  background: white;
  padding: 8px;
  border: 1px solid var(--border);
}

.usage-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin-bottom: 14px;
  color: var(--foreground);
}

.steps-list {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 10px 0;
}

.step-item + .step-item {
  border-top: 1px solid var(--border);
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--foreground);
  padding-top: 3px;
}

.step-link {
  margin-left: 4px;
  text-transform: none;
  letter-spacing: 0;
}

.technical-panels {
  margin-bottom: 24px;
}

.technical-panels :deep(.v-expansion-panel) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: 14px !important;
}

.technical-panels :deep(.v-expansion-panel__shadow) {
  box-shadow: none;
}

.technical-panels :deep(.v-expansion-panel-title) {
  font-size: 14px;
  font-weight: 500;
}

.diagram-section {
  margin: 16px 0;
}

.diagram-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 12px;
  color: var(--subtle-foreground);
}

.diagram-section .diagram-card {
  background: var(--background) !important;
  border-radius: 12px !important;
  padding: 24px;
}

.diagram-image {
  width: 100%;
  height: auto;
  max-width: 800px;
  display: block;
  margin: 0 auto;
  border-radius: 4px;
}

.specs-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
}

.spec-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 0;
}

.spec-item + .spec-item {
  border-top: 1px solid var(--border);
}

.spec-icon {
  flex-shrink: 0;
  background: var(--secondary);
  color: var(--foreground);
}

.spec-content {
  flex: 1;
}

.spec-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--foreground);
}

.spec-description {
  font-size: 12.5px;
  color: var(--subtle-foreground);
  line-height: 1.45;
}

.error-alert {
  margin: 24px;
}

@media (max-width: 1160px) {
  .remote-id-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .status-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .status-switch {
    width: 100%;
    justify-content: flex-start;
  }

  .step-item {
    gap: 12px;
  }
}

@media (max-width: 500px) {
  .remote-id-display-wrapper {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .copy-button {
    align-self: flex-end;
  }
}
</style>

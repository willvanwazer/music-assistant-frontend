<template>
  <div
    class="config-entry"
    :class="{
      'config-entry-advanced': confEntry.advanced,
      'config-entry-hass-picker': isHassControlPickerEntry(confEntry),
    }"
  >
    <ConfigEntryField
      :conf-entry="confEntry"
      :show-password-values="showPasswordValues"
      :disabled="disabled"
      :provider-domain="providerDomain"
      @toggle-password="emit('toggle-password')"
      @update:value="emit('update:value', $event)"
      @action="emit('action')"
      @set-entry-value="
        (key: string, value: ConfigValueType, label?: string) =>
          emit('set-entry-value', key, value, label)
      "
    />
    <v-chip
      v-if="confEntry.advanced"
      size="x-small"
      color="grey"
      variant="outlined"
      class="advanced-badge"
    >
      {{ $t("settings.advanced") }}
    </v-chip>
    <Button
      v-if="hasDescriptionOrHelpLink"
      type="button"
      variant="ghost"
      size="icon"
      class="help-btn"
      :aria-label="$t('tooltip.help')"
      @click="emit('help')"
    >
      <HelpCircle :size="20" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "@lucide/vue";
import {
  ConfigEntryUI,
  isHassControlPickerEntry,
} from "@/helpers/config_entry_ui";
import { ConfigValueType } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import ConfigEntryField from "./ConfigEntryField.vue";

const props = defineProps<{
  confEntry: ConfigEntryUI;
  showPasswordValues: boolean;
  disabled: boolean;
  providerDomain?: string;
}>();

const emit = defineEmits<{
  (e: "update:value", value: ConfigValueType): void;
  (e: "toggle-password"): void;
  (e: "action"): void;
  (e: "help"): void;
  (
    e: "set-entry-value",
    key: string,
    value: ConfigValueType,
    label?: string,
  ): void;
}>();

const hasDescriptionOrHelpLink = computed(() => {
  const entry = props.confEntry;
  // description is resolved server-side (or set by the frontend for its own settings); the entry
  // either has one, or a help link
  return ((entry.description || entry.help_link || " ")?.length ?? 0) > 1;
});
</script>

<style scoped>
/* One setting per row; rows sit flush inside their group and are divided by
   hairlines rather than gaps. */
.config-entry {
  display: flex;
  /* side controls line up with the field's first line, so a tall field
     (options list, chips, a QR code) keeps them at its top */
  align-items: flex-start;
  gap: 8px;
  min-height: 52px;
  padding: 10px 12px 10px 20px;
}

.config-entry + .config-entry {
  border-top: 1px solid var(--border);
}

/* a Home Assistant entity picker belongs to the control above it, so the two
   read as one row */
.config-entry:has(+ .config-entry-hass-picker) {
  padding-bottom: 2px;
}

.config-entry:has(+ .config-entry-hass-picker)
  :deep(.v-input__details:not(:has(.v-messages__message))) {
  display: none;
}

.config-entry + .config-entry-hass-picker {
  border-top: 0;
  padding-top: 0;
  padding-bottom: 14px;
}

/* the hint area under a field only takes room when it has something to say */
.config-entry :deep(.v-input__details:not(:has(.v-messages__message))) {
  display: none;
}

/* Labels of the fields that don't float theirs */
.config-entry :deep(.v-selection-control .v-label),
.config-entry :deep(.config-slider-label) {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--foreground);
  opacity: 1;
}

/* a checkbox reads as a setting: its label on the left, the control on the
   right where every other row keeps its control */
.config-entry :deep(.v-checkbox .v-selection-control) {
  flex-direction: row-reverse;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
}

.config-entry :deep(.v-checkbox .v-selection-control .v-label) {
  flex: 1;
  min-width: 0;
  padding-inline-start: 0;
  white-space: normal;
}

/* calmer outlined fields */
.config-entry :deep(.v-field) {
  border-radius: 10px;
}

/* Advanced entry styling */
.config-entry-advanced {
  opacity: 0.95;
}

/* Advanced badge */
.advanced-badge {
  flex-shrink: 0;
  margin-top: 7px;
  height: 22px;
  padding: 0 9px;
  border: 0;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--muted-foreground) !important;
  font-size: 0.71875rem;
  font-weight: 500;
}

.advanced-badge :deep(.v-chip__underlay),
.advanced-badge :deep(.v-chip__overlay) {
  display: none;
}

/* Help button */
.help-btn {
  flex-shrink: 0;
  color: var(--subtle-foreground);
  transition: color 0.15s ease;
}

.help-btn:hover {
  color: var(--foreground);
}

/* an outlined field is taller than the checkbox and slider rows, so the side
   controls drop to its middle */
.config-entry:has(.v-text-field, .v-combobox) .advanced-badge {
  margin-top: 13px;
}

.config-entry:has(.v-text-field, .v-combobox) .help-btn {
  margin-top: 6px;
}

@media (max-width: 600px) {
  .config-entry {
    padding: 10px 8px 10px 16px;
  }
}
</style>

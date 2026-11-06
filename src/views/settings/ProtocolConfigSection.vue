<template>
  <div
    v-if="protocolGeneralEntries.length > 0 || protocolPanels.length > 0"
    class="category-section"
  >
    <div class="category-header">
      <span class="category-icon">
        <Antenna :size="16" />
      </span>
      <span class="category-title">
        {{ $t("settings.category.protocol_settings") }}
      </span>
    </div>
    <div class="category-content">
      <!-- Explain the multi-protocol setup when more than one is available -->
      <div
        v-if="protocolPanels.length > 1"
        class="protocol-info text-muted-foreground mx-5 my-3.5 rounded-[10px] bg-muted/60 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed"
      >
        {{ $t("settings.protocol_multi_info") }}
      </div>
      <!-- General protocol settings, shown before the protocol list -->
      <ConfigEntryRow
        v-for="conf_entry of protocolGeneralEntries"
        :key="conf_entry.key"
        :conf-entry="conf_entry"
        :show-password-values="showPasswordValues"
        :disabled="isDisabled(conf_entry)"
        @update:value="emit('update:value', conf_entry, $event)"
        @toggle-password="emit('toggle-password')"
        @action="emit('action', conf_entry)"
        @help="emit('help', conf_entry)"
      />

      <template v-if="protocolPanels.length > 0">
        <component
          :is="hasMultipleProtocols ? Accordion : 'div'"
          :type="hasMultipleProtocols ? 'single' : undefined"
          :collapsible="hasMultipleProtocols || undefined"
          class="protocol-panels"
        >
          <component
            :is="hasMultipleProtocols ? AccordionItem : 'div'"
            v-for="panel of protocolPanels"
            :key="panel"
            :value="hasMultipleProtocols ? panel : undefined"
            class="protocol-panel px-0"
          >
            <component
              :is="hasMultipleProtocols ? AccordionTrigger : 'div'"
              :class="
                hasMultipleProtocols
                  ? 'items-center px-5 py-3.5 font-semibold hover:no-underline'
                  : 'flex items-start px-5 py-3.5 text-left text-sm font-semibold'
              "
            >
              <span class="flex items-center gap-2.5">
                <ProviderIcon
                  v-if="getProtocolDomain(panel)"
                  :domain="getProtocolDomain(panel)!"
                  :size="22"
                />
                <span>{{ getProtocolConfigureTitle(panel) }}</span>
                <Badge
                  v-if="getOutputProtocol(panel)?.is_native"
                  variant="secondary"
                >
                  {{ $t("settings.protocol_native_badge") }}
                </Badge>
              </span>
            </component>
            <component
              :is="hasMultipleProtocols ? AccordionContent : 'div'"
              class="protocol-panel-content border-t border-border pt-0 pb-0"
            >
              <div
                v-if="!isProtocolProviderAvailable(panel)"
                class="protocol-empty-message"
              >
                {{ $t("settings.protocol_provider_unavailable") }}
              </div>
              <ConfigEntryRow
                v-for="conf_entry of protocolEntriesForCategory(panel)"
                :key="conf_entry.key"
                :conf-entry="conf_entry"
                :show-password-values="showPasswordValues"
                :disabled="isProtocolEntryDisabled(panel, conf_entry)"
                @update:value="emit('update:value', conf_entry, $event)"
                @toggle-password="emit('toggle-password')"
                @action="emit('action', conf_entry)"
                @help="emit('help', conf_entry)"
              />
              <div
                v-if="
                  isProtocolProviderAvailable(panel) &&
                  entriesForCategory(panel).length === 0
                "
                class="protocol-empty-message"
              >
                {{ getProtocolEmptyMessage(panel) }}
              </div>
            </component>
          </component>
        </component>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProviderIcon from "@/components/ProviderIcon.vue";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ConfigEntryUI } from "@/helpers/config_entry_ui";
import { api } from "@/plugins/api";
import { ConfigValueType, OutputProtocol } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { Antenna } from "@lucide/vue";
import { computed } from "vue";
import ConfigEntryRow from "./ConfigEntryRow.vue";

const props = defineProps<{
  entries: ConfigEntryUI[];
  protocolPanels: string[];
  visibleEntriesByCategory: Record<string, ConfigEntryUI[]>;
  showPasswordValues: boolean;
  isDisabled: (entry: ConfigEntryUI) => boolean;
  // The player's output protocols, used to resolve derived-transport relationships.
  // Empty for non-player configs (providers/core), which have no output protocols.
  outputProtocols?: OutputProtocol[];
}>();

const emit = defineEmits<{
  (e: "update:value", entry: ConfigEntryUI, value: ConfigValueType): void;
  (e: "action", entry: ConfigEntryUI): void;
  (e: "help", entry: ConfigEntryUI): void;
  (e: "toggle-password"): void;
}>();

const entriesForCategory = function (category: string) {
  return props.visibleEntriesByCategory[category] || [];
};

const getCategoryTranslation = function (category: string) {
  // The display name comes from `category_label`: resolved server-side for server entries, and
  // set at construction for frontend-only entries. Read it from any entry in this category.
  const entry =
    entriesForCategory(category)[0] ||
    props.entries.find((e) => e.category === category);
  return entry?.category_label || category;
};

const protocolGeneralEntries = computed(() =>
  entriesForCategory("protocol_general"),
);

const hasMultipleProtocols = computed(() => props.protocolPanels.length > 1);

const getProtocolDomain = function (category: string): string | undefined {
  if (!category.startsWith("protocol_")) return undefined;
  // Extract domain from "protocol_{domain}" format
  return category.replace("protocol_", "");
};

const getProtocolEnabledEntry = function (
  category: string,
): ConfigEntryUI | undefined {
  // Optional protocols carry an entry whose key ends in "||protocol||enabled".
  return props.entries.find(
    (entry) =>
      entry.category === category && entry.key.endsWith("||protocol||enabled"),
  );
};

const protocolEntriesForCategory = function (
  category: string,
): ConfigEntryUI[] {
  const entries = entriesForCategory(category);
  const enabledEntry = getProtocolEnabledEntry(category);
  return enabledEntry ? [enabledEntry, ...entries] : entries;
};

// A protocol's backing provider can be disabled/unavailable independently. Only
// optional protocols (those with an enabled entry) are served by a separate,
// toggleable provider; native protocols have no separate provider.
const isProtocolProviderAvailable = function (category: string): boolean {
  const domain = getProtocolDomain(category);
  if (!domain) return true;
  const provider = api.getProvider(domain);
  // Only treat as unavailable when we resolve a provider that reports unavailable.
  return provider ? provider.available : true;
};

const isProtocolEntryDisabled = function (
  category: string,
  entry: ConfigEntryUI,
): boolean {
  return !isProtocolProviderAvailable(category) || props.isDisabled(entry);
};

// Display name for a protocol — the provider's own name, falling back to the
// category label with the "Enable … support (over …)" scaffolding stripped.
const getProtocolName = function (category: string): string {
  const domain = getProtocolDomain(category);
  const provider = domain ? api.getProvider(domain) : undefined;
  if (provider?.name) return provider.name;
  return getCategoryTranslation(category)
    .replace(/\s*\(over\s+[^)]+\)\s*$/i, "")
    .replace(/^Enable\s+/i, "")
    .replace(/\s+support$/i, "");
};

// The output protocol backing a panel, matched by domain.
const getOutputProtocol = function (
  category: string,
): OutputProtocol | undefined {
  const domain = getProtocolDomain(category);
  if (!domain) return undefined;
  return props.outputProtocols?.find((p) => p.protocol_domain === domain);
};

// Display name of the protocol a derived transport rides on (e.g. AirPlay for a Sendspin
// bridge), or undefined for direct outputs. The relationship is resolved structurally from
// `derived_from`; the name is a provider proper-noun, so no translation is involved.
const getProtocolBaseName = function (category: string): string | undefined {
  const derivedFrom = getOutputProtocol(category)?.derived_from;
  if (!derivedFrom) return undefined;
  const base = props.outputProtocols?.find(
    (p) => p.output_protocol_id === derivedFrom,
  );
  if (!base) return undefined;
  return api.getProvider(base.protocol_domain)?.name || base.name;
};

// Accordion title for a protocol's configuration section; derived transports include
// the protocol they ride on, e.g. "Configure Sendspin (over AirPlay)".
const getProtocolConfigureTitle = function (category: string): string {
  const name = getProtocolName(category);
  const base = getProtocolBaseName(category);
  return base
    ? $t("settings.protocol_configure_title_via", { name, base })
    : $t("settings.protocol_configure_title", { name });
};

const hasHiddenAdvancedSettings = function (category: string): boolean {
  // The category has advanced (non-hidden) settings that the current advanced
  // toggle keeps out of the visible list.
  return props.entries.some(
    (entry) =>
      entry.category === category &&
      entry.advanced &&
      !entry.key.includes("||protocol||enabled") &&
      !entry.hidden,
  );
};

const getProtocolEmptyMessage = function (category: string): string {
  if (hasHiddenAdvancedSettings(category)) {
    return $t("settings.protocol_no_settings_with_advanced");
  }

  return $t("settings.protocol_no_settings");
};
</script>

<style scoped>
/* Mirrors the config category group in EditConfig.vue */
.category-section {
  margin-bottom: 28px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 10px;
}

.category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--muted-foreground);
}

.category-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: var(--foreground);
}

.category-content {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

/* the protocols are rows of the same group, below whatever comes first */
.config-entry + .protocol-panels,
.protocol-info + .protocol-panels {
  border-top: 1px solid var(--border);
}

/* a protocol's own settings sit one step in, on a faint fill */
.category-content :deep(.protocol-panel-content) {
  background: color-mix(in oklab, var(--foreground) 2.5%, transparent);
}

.protocol-empty-message {
  padding: 12px 20px;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
}
</style>

<template>
  <Card
    class="settings-page-head mb-6 gap-0 rounded-none border-0 bg-transparent py-0 shadow-none"
  >
    <CardHeader
      class="flex flex-row items-start gap-4 px-0 pt-1 pb-5 sm:items-center"
    >
      <div
        :class="
          cn(
            'flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-current/12 text-primary',
            iconClass,
          )
        "
      >
        <component :is="icon" class="size-[22px]" />
      </div>
      <div class="min-w-0 flex-1">
        <CardTitle
          class="font-display text-[1.75rem] leading-[1.15] font-medium tracking-[-0.01em] text-foreground"
        >
          {{ title }}
        </CardTitle>
        <CardDescription
          v-if="description"
          class="mt-1 max-w-[64ch] text-[0.84375rem] leading-relaxed"
        >
          {{ description }}
        </CardDescription>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            data-testid="settings-menu"
            variant="ghost"
            size="icon-sm"
            class="shrink-0 text-muted-foreground"
            :aria-label="$t('more_options')"
          >
            <MoreVertical class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid="settings-reset-defaults"
            @click="emit('resetToDefaults')"
          >
            <RotateCcw class="size-4" />
            {{ $t("settings.reset_to_defaults") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
    <CardContent
      v-if="showAdvancedToggle"
      class="flex min-h-[52px] items-center border-t border-b border-border px-0 py-2.5"
    >
      <AdvancedSettingsToggle
        v-model:show-advanced-settings="showAdvancedSettings"
        test-id="settings-advanced-settings"
      />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVertical, RotateCcw } from "@lucide/vue";
import type { Component } from "vue";
import AdvancedSettingsToggle from "./AdvancedSettingsToggle.vue";

/**
 * Header card shared by the settings screens that edit a plain config: it names what
 * is being configured and carries the controls that act on the whole form.
 */
defineProps<{
  icon: Component;
  title: string;
  description?: string;
  /** Tints the icon and its tile, e.g. "text-orange-500"; defaults to the primary colour. */
  iconClass?: string;
  /** Whether the config holds advanced entries the toggle can reveal. */
  showAdvancedToggle?: boolean;
}>();

const emit = defineEmits<{
  (e: "resetToDefaults"): void;
}>();

const showAdvancedSettings = defineModel<boolean>("showAdvancedSettings", {
  default: false,
});
</script>

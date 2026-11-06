<template>
  <Popover @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <!-- custom trigger (e.g. a compact icon button inside an input) -->
      <slot name="trigger">
        <!-- a pill chip: dashed while it is only an offer, inverted once it
             narrows the list -->
        <Button
          variant="outline"
          :class="[
            'h-[30px] gap-1.5 px-3 text-[12.5px] has-[>svg]:px-3',
            selectedCount > 0
              ? 'border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background'
              : 'border-dashed',
          ]"
        >
          <PlusCircle class="h-4 w-4" />
          {{ title }}
          <template v-if="selectedCount > 0">
            <Separator
              orientation="vertical"
              class="mx-1 h-4 bg-background/30"
            />
            <Badge
              class="lg:hidden font-medium bg-background/15 text-background"
              :aria-label="
                $t('faceted_filter.selected', { count: selectedCount })
              "
            >
              {{ $t("faceted_filter.selected", { count: selectedCount }) }}
            </Badge>
            <div class="hidden space-x-1 lg:flex">
              <Badge
                v-if="selectedCount > 2"
                class="gap-2 bg-background/15 text-background"
              >
                {{ $t("faceted_filter.selected", { count: selectedCount }) }}
                <button
                  type="button"
                  :aria-label="$t('faceted_filter.clear_all_for', { title })"
                  class="flex items-center justify-center cursor-pointer hover:opacity-70"
                  @click.stop="clear"
                >
                  <X class="size-2.5" />
                </button>
              </Badge>
              <template v-else>
                <Badge
                  v-for="opt in selectedOptionLabels"
                  :key="opt.value"
                  class="font-medium gap-2 bg-background/15 text-background"
                >
                  {{ opt.label }}
                  <button
                    type="button"
                    :aria-label="
                      $t('faceted_filter.remove_filter', { label: opt.label })
                    "
                    class="flex items-center justify-center cursor-pointer hover:opacity-70"
                    @click.stop="removeFilter(opt.value)"
                  >
                    <X class="size-2.5" />
                  </button>
                </Badge>
              </template>
            </div>
          </template>
        </Button>
      </slot>
    </PopoverTrigger>
    <PopoverContent
      class="w-[220px] p-0"
      align="start"
      @open-auto-focus="preventOnScreenKeyboardOnOpen"
    >
      <div class="faceted-filter-content">
        <Input
          v-if="showSearch"
          v-model="search"
          :placeholder="title"
          :aria-label="$t('faceted_filter.search_for', { title })"
          class="mb-2 h-8"
        />
        <div class="faceted-filter-list">
          <div
            v-for="option in filteredOptions"
            :key="option.value"
            class="faceted-filter-item"
            role="checkbox"
            :aria-checked="selectedSet.has(option.value)"
            tabindex="0"
            @click="toggle(option.value)"
            @keydown.space.prevent="toggle(option.value)"
            @keydown.enter.prevent="toggle(option.value)"
          >
            <Checkbox
              :model-value="selectedSet.has(option.value)"
              class="mr-2 pointer-events-none"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="truncate">
              {{ option.label }}
            </span>
          </div>
        </div>
        <button
          v-if="selectedCount > 0"
          type="button"
          class="faceted-filter-clear"
          :aria-label="$t('faceted_filter.clear_for', { title })"
          @click="clear"
        >
          {{ $t("faceted_filter.clear") }}
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts" generic="TValue extends string">
import { PlusCircle, X } from "@lucide/vue";
import type { HTMLAttributes } from "vue";
import { computed, ref } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { preventOnScreenKeyboardOnOpen } from "@/helpers/dialog_focus";

interface FacetedOption {
  label: string;
  value: TValue;
}

const props = defineProps<{
  title: string;
  options: FacetedOption[];
  modelValue: TValue[];
  class?: HTMLAttributes["class"];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: TValue[]): void;
}>();

// a list this short is quicker to scan than to search - and on a touch device
// a search field opens the on-screen keyboard on top of the options
const MAX_OPTIONS_WITHOUT_SEARCH = 8;

const search = ref("");

const showSearch = computed(
  () => props.options.length > MAX_OPTIONS_WITHOUT_SEARCH,
);

const selectedSet = computed(() => new Set(props.modelValue || []));

const selectedCount = computed(() => selectedSet.value.size);

const selectedOptionLabels = computed(() =>
  props.options.filter((opt) => selectedSet.value.has(opt.value)),
);

const filteredOptions = computed(() => {
  const term = showSearch.value ? search.value.toLowerCase().trim() : "";
  if (!term) return props.options;
  return props.options.filter((opt) => opt.label.toLowerCase().includes(term));
});

const toggle = (value: TValue) => {
  const next = new Set(selectedSet.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  emit("update:modelValue", Array.from(next));
};

const removeFilter = (value: TValue) => {
  const next = new Set(selectedSet.value);
  next.delete(value);
  emit("update:modelValue", Array.from(next));
};

const clear = () => {
  emit("update:modelValue", []);
};

// only the popover content unmounts on close, so a term left in the field has to
// be dropped by hand - on open, to leave the closing animation on the list the
// user last saw
const onOpenChange = (open: boolean) => {
  if (open) search.value = "";
};
</script>

<style scoped>
.faceted-filter-content {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.faceted-filter-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.faceted-filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 9px;
  font-size: 13.5px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.faceted-filter-item:hover {
  background-color: var(--secondary);
}

.faceted-filter-item:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}

.faceted-filter-clear {
  margin-top: 4px;
  width: 100%;
  padding: 6px 8px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}

.faceted-filter-clear:hover {
  color: var(--foreground);
  background-color: var(--secondary);
}
</style>

<script setup lang="ts">
import type { Component } from "vue";
import { VIcon } from "vuetify/components";

// Without a size the icon sits in a menu row: 16px and muted, as the row's own
// icons are, and in the destructive colour on a destructive row. A size is
// asked for where the icon stands on its own, e.g. a toolbar button.
const props = withDefaults(
  defineProps<{ icon?: string | Component; size?: number }>(),
  { icon: undefined, size: undefined },
);

// the icon font draws its glyphs inside some padding, so it takes a couple of
// pixels more to read the same size as a 16px line icon
const MENU_FONT_ICON_SIZE = 18;
const MENU_FONT_ICON_CLASS =
  "text-muted-foreground [[data-variant=destructive]_&]:text-destructive";
</script>

<template>
  <VIcon
    v-if="typeof props.icon === 'string'"
    :icon="props.icon"
    :size="props.size ?? MENU_FONT_ICON_SIZE"
    class="shrink-0"
    :class="props.size ? undefined : MENU_FONT_ICON_CLASS"
  />
  <component
    :is="props.icon"
    v-else-if="props.icon"
    class="shrink-0"
    :class="props.size ? 'size-5 scale-90' : 'size-4'"
  />
</template>

<script setup lang="ts">
import type { DropdownMenuLabelProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuLabel, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  DropdownMenuLabelProps & { class?: HTMLAttributes["class"]; inset?: boolean }
>();

const delegatedProps = reactiveOmit(props, "class", "inset");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuLabel
    data-slot="dropdown-menu-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="
      cn(
        'px-2.5 pt-2.5 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.13em] uppercase text-subtle-foreground data-[inset]:pl-8',
        props.class,
      )
    "
  >
    <slot></slot>
  </DropdownMenuLabel>
</template>

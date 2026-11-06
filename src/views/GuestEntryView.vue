<template>
  <main class="grid min-h-full place-items-center p-4">
    <Card class="w-full max-w-md py-8">
      <CardHeader class="justify-items-center gap-2 text-center">
        <span
          class="bg-secondary text-muted-foreground mb-2 grid size-14 place-items-center rounded-full"
        >
          <CircleHelp class="size-7" aria-hidden="true" />
        </span>
        <CardTitle class="ma-display text-3xl leading-tight font-medium">
          {{ copy.title }}
        </CardTitle>
        <CardDescription class="text-[0.9375rem]">
          {{ copy.description }}
        </CardDescription>
      </CardHeader>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { guestEntryStateKey } from "@/composables/guest/useGuestEntryResolver";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { $t } from "@/plugins/i18n";
import { CircleHelp } from "@lucide/vue";
import { computed, inject, ref } from "vue";

const state = inject(guestEntryStateKey, ref("loading"));
const copy = computed(() => {
  if (state.value === "loading") {
    return {
      title: $t("guest.loading_title"),
      description: $t("guest.loading_description"),
    };
  }
  if (state.value === "error") {
    return {
      title: $t("guest.error_title"),
      description: $t("guest.error_description"),
    };
  }
  if (state.value === "quiz-inactive") {
    return {
      title: $t("guest.no_quiz_title"),
      description: $t("guest.no_quiz_description"),
    };
  }
  return {
    title: $t("guest.nothing_active_title"),
    description: $t("guest.nothing_active_description"),
  };
});
</script>

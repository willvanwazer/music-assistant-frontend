<template>
  <div class="flex items-center gap-4 pt-1">
    <div
      class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"
    >
      <GenreIcon class="size-[22px]" />
    </div>
    <div class="min-w-0">
      <h1
        class="font-display text-[1.75rem] leading-[1.15] font-medium tracking-[-0.01em]"
      >
        {{ $t("settings.genre_management") }}
      </h1>
      <p
        class="mt-1 max-w-[64ch] text-[13.5px] leading-normal text-muted-foreground"
      >
        {{ $t("settings.genre_management_description") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import GenreIcon from "@/components/icons/GenreIcon.vue";
</script>

<template>
  <div
    class="flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2"
    :class="current ? 'border-primary bg-primary/10' : 'border-border bg-card'"
  >
    <MusicQuizAvatar :name="name" class="size-8 shrink-0" />
    <span class="min-w-0 flex-1 truncate font-medium">{{ name }}</span>
    <slot name="trailing"></slot>
  </div>
</template>

<script setup lang="ts">
import MusicQuizAvatar from "@/components/music-quiz/MusicQuizAvatar.vue";

defineProps<{
  name: string;
  current?: boolean;
}>();
</script>

<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue";
import MarkdownText from "@/components/MarkdownText.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";

defineProps<{ text: string }>();
</script>

<template>
  <Alert variant="warning" class="my-1 rounded-[12px]">
    <TriangleAlert />
    <AlertDescription>
      <MarkdownText :text="text" />
    </AlertDescription>
  </Alert>
</template>

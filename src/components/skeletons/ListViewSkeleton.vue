<template>
  <div class="listview-item-skeleton">
    <Skeleton class="skeleton-thumbnail" />
    <div class="skeleton-content">
      <Skeleton class="skeleton-title" />
      <Skeleton class="skeleton-subtitle" />
    </div>
    <Skeleton class="skeleton-duration" />
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<style scoped>
/* the list row's shape: a 44px cover, two lines, the duration at the end */
.listview-item-skeleton {
  display: flex;
  align-items: center;
  height: 54px;
  padding: 5px 10px;
  gap: 12px;
}

.skeleton-thumbnail {
  width: 44px;
  height: 44px;
  border-radius: 3px;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.skeleton-title {
  height: 12px;
  width: 60%;
  max-width: 300px;
  border-radius: 4px;
}

.skeleton-subtitle {
  height: 10px;
  width: 40%;
  max-width: 200px;
  border-radius: 4px;
}

.skeleton-duration {
  width: 34px;
  height: 10px;
  margin-right: 10px;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>

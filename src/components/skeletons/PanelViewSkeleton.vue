<template>
  <div class="panelview-item-skeleton">
    <Skeleton class="skeleton-image" />
    <div class="skeleton-info">
      <Skeleton class="skeleton-title" />
      <Skeleton class="skeleton-artist" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<style scoped>
/* the grid card's shape: a square cover with two lines of text beneath */
.panelview-item-skeleton {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.skeleton-image {
  aspect-ratio: 1;
  width: 100%;
  border-radius: 4px;
}

/* a listing of people pictures them in circles */
.skeleton--round .skeleton-image {
  border-radius: 50%;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.skeleton--round .skeleton-info {
  align-items: center;
}

.skeleton-title {
  height: 12px;
  width: 80%;
  border-radius: 4px;
}

.skeleton-artist {
  height: 10px;
  width: 55%;
  border-radius: 4px;
}
</style>

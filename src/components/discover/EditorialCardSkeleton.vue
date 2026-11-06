<template>
  <div class="ed-card-skeleton" aria-hidden="true">
    <Skeleton class="ed-card-skeleton__art" />
    <Skeleton class="ed-card-skeleton__title" />
    <Skeleton class="ed-card-skeleton__sub" />
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<style scoped>
/* Mirrors .ed-card's sizing (EditorialMediaCard.vue) so a loading row reserves
   exactly the height its resolved cards will occupy - no layout shift. The
   bars sit centred in the card's 18px title and 16px subtitle lines (only top
   margins between them, so nothing collapses). */
.ed-card-skeleton {
  --ed-card-pad: 8px;
  --ed-art-size: var(--ed-tile-art, 168px);
  flex: 0 0 auto;
  width: calc(var(--ed-art-size) + 2 * var(--ed-card-pad));
  box-sizing: border-box;
  padding: var(--ed-card-pad);
}
.ed-card-skeleton__art {
  width: var(--ed-art-size);
  height: var(--ed-art-size);
  border-radius: 4px;
}
.ed-card-skeleton__title {
  width: 70%;
  height: 12px;
  margin-top: 14px;
}
.ed-card-skeleton__sub {
  width: 45%;
  height: 10px;
  margin-top: 7px;
  margin-bottom: 3px;
}

@media (max-width: 500px) {
  .ed-card-skeleton {
    --ed-card-pad: 4px;
  }
  .ed-card-skeleton__title {
    margin-top: 11px;
  }
  .ed-card-skeleton__sub {
    margin-top: 6px;
  }
}
</style>

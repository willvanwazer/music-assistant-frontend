<template>
  <!-- Now playing badge -->
  <span
    v-if="showBadge"
    :style="badgeStyle"
    class="now-playing-badge"
    :aria-label="$t('now_playing')"
  >
    {{ $t("now_playing") }}
  </span>
  <!-- Now playing icon -->
  <div v-if="showIcon" :style="iconStyle" class="now-playing-icon">
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
  </div>
</template>

<script setup lang="ts">
import { CSSProperties } from "vue";

export interface Props {
  showBadge?: boolean;
  showIcon?: boolean;
  badgeStyle?: string | CSSProperties | Array<string | CSSProperties>;
  iconStyle?: string | CSSProperties | Array<string | CSSProperties>;
}

const props = withDefaults(defineProps<Props>(), {
  showBadge: true,
  showIcon: true,
  badgeStyle: "",
  iconStyle: "",
});
</script>

<style>
/* a soft accent micro tag */
.now-playing-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--primary);
  background: color-mix(in oklab, var(--primary) 16%, transparent);
}

.is-playing {
  font-weight: 600;
}

.now-playing-icon {
  display: flex;
  gap: 2px;
  margin-left: 6px;
  margin-right: 6px;
  align-items: flex-end;
  height: 16px;
}

.now-playing-icon .bar {
  width: 3px;
  height: 16px;
  border-radius: 1px;
  background: var(--primary);
  transform-origin: bottom;
  transform: scaleY(0.25);
  animation: eq 1s infinite ease-in-out;
  will-change: transform;
}

.now-playing-icon .bar:nth-child(1) {
  animation-delay: 0s;
}
.now-playing-icon .bar:nth-child(2) {
  animation-delay: 0.2s;
}
.now-playing-icon .bar:nth-child(3) {
  animation-delay: 0.4s;
}
.now-playing-icon .bar:nth-child(4) {
  animation-delay: 0.6s;
}

/* without motion the bars hold still at staggered heights */
@media (prefers-reduced-motion: reduce) {
  .now-playing-icon .bar {
    animation: none;
    transform: scaleY(0.55);
  }
  .now-playing-icon .bar:nth-child(2) {
    transform: scaleY(0.9);
  }
  .now-playing-icon .bar:nth-child(3) {
    transform: scaleY(0.4);
  }
  .now-playing-icon .bar:nth-child(4) {
    transform: scaleY(0.7);
  }
}

@keyframes eq {
  0%,
  100% {
    transform: scaleY(0.25);
  }
  50% {
    transform: scaleY(1);
  }
}
</style>

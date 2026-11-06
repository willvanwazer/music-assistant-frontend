<template>
  <section class="ed-shelf" :class="{ 'ed-shelf--dimmed': dimmed }">
    <div class="ed-shelf__head">
      <slot name="header">
        <div class="ed-shelf__titles">
          <div class="ed-shelf__title-row">
            <h2 class="ed-shelf__title">{{ title }}</h2>
            <slot name="title-append"></slot>
          </div>
          <span v-if="subtitle" class="ed-shelf__subtitle">{{ subtitle }}</span>
        </div>
      </slot>
      <div v-if="provider || $slots.actions || showNav" class="ed-shelf__aside">
        <ProviderIcon
          v-if="provider"
          class="ed-shelf__provider"
          :domain="provider"
          :size="20"
        />
        <div v-if="$slots.actions" class="ed-shelf__actions">
          <slot name="actions"></slot>
        </div>
        <!-- quiet scroll arrows, only while the row overflows -->
        <div v-if="showNav" class="ed-shelf__navs">
          <button
            type="button"
            class="ed-shelf__nav ed-shelf__nav--left"
            :disabled="!canLeft"
            :aria-label="$t('tooltip.scroll_left')"
            @click="scroll(-1)"
          >
            <ChevronLeft :size="16" />
          </button>
          <button
            type="button"
            class="ed-shelf__nav ed-shelf__nav--right"
            :disabled="!canRight"
            :aria-label="$t('tooltip.scroll_right')"
            @click="scroll(1)"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div class="ed-shelf__viewport" @wheel="onWheel">
      <div
        ref="track"
        class="ed-shelf__track ma-scroll"
        :style="{
          '--ed-gap': gap + 'px',
          ...(tileArt != null ? { '--ed-tile-art': tileArt + 'px' } : {}),
        }"
        @scroll="onScroll"
      >
        <slot></slot>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
export interface EditorialShelfExpose {
  scrollToStart: () => void;
  alignItemStart: (selector: string) => void;
}
</script>

<script setup lang="ts">
import ProviderIcon from "@/components/ProviderIcon.vue";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

interface Props {
  title?: string;
  subtitle?: string | null;
  provider?: string;
  gap?: number;
  // Vertical centre of the old floating arrows; the arrows now sit in the
  // header, so this is kept only so existing callers stay valid.
  navCenter?: number;
  dimmed?: boolean;
  tilesPerView?: number;
}
const props = withDefaults(defineProps<Props>(), {
  title: "",
  subtitle: "",
  provider: "",
  gap: 14,
  navCenter: 92,
  dimmed: false,
  tilesPerView: 0,
});

const CARD_PAD = 16;
const PHONE_GAP = 4;
const PHONE_CARD_PAD = 8;
const MIN_ART = 120;
const MAX_ART = 280;

// Only offer the arrows on hover-capable devices; touch users swipe the row.
const canHover = window.matchMedia?.("(hover: hover)")?.matches ?? true;
const track = ref<HTMLElement | null>(null);
const canLeft = ref(false);
const canRight = ref(false);
const tileArt = ref<number | null>(null);

const showNav = computed(() => canHover && (canLeft.value || canRight.value));

const verticalScrollParent = (el: HTMLElement): HTMLElement => {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      /(auto|scroll|overlay)/.test(overflowY) &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return document.documentElement;
};

const onWheel = (e: WheelEvent) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  e.preventDefault();

  if (Math.abs(e.deltaY) < 1) return;

  const scroller = verticalScrollParent(e.currentTarget as HTMLElement);
  scroller.scrollTop += e.deltaY;
};

const updateTileArt = () => {
  const el = track.value;
  if (!el || !props.tilesPerView || props.tilesPerView <= 0) {
    tileArt.value = null;
    return;
  }
  const isPhone = getBreakpointValue({ breakpoint: "bp1", condition: "lt" });
  const gap = isPhone ? Math.min(props.gap, PHONE_GAP) : props.gap;
  const cardPad = isPhone ? PHONE_CARD_PAD : CARD_PAD;
  const size = el.clientWidth / props.tilesPerView - gap - cardPad;
  tileArt.value = Math.round(Math.max(MIN_ART, Math.min(MAX_ART, size)));
};

const update = () => {
  const el = track.value;
  if (!el) return;
  canLeft.value = el.scrollLeft > 1;
  canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  updateTileArt();
};
const onScroll = () => update();

watch(() => props.tilesPerView, updateTileArt);

const scroll = (dir: number) => {
  const el = track.value;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
};

function scrollToStart() {
  const el = track.value;
  if (!el) return;
  el.scrollLeft = 0;
}

function alignItemStart(selector: string) {
  const el = track.value;
  if (!el) return;
  const item = el.querySelector(selector) as HTMLElement | null;
  if (!item) {
    scrollToStart();
    return;
  }
  const delta =
    item.getBoundingClientRect().left - el.getBoundingClientRect().left;
  el.scrollBy({ left: delta, behavior: "smooth" });
}

defineExpose<EditorialShelfExpose>({
  scrollToStart,
  alignItemStart,
});

let ro: ResizeObserver | undefined;
onMounted(() => {
  update();
  window.addEventListener("resize", update);
  if (track.value && "ResizeObserver" in window) {
    ro = new ResizeObserver(update);
    ro.observe(track.value);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", update);
  ro?.disconnect();
});
</script>

<style scoped>
/* A Liner Notes section: serif heading with an optional quiet subtitle beside
   it, controls on the right, then a horizontally scrolling row of cards. The
   gutter follows the page (--ed-page-gutter) where one is set. */
.ed-shelf {
  --ed-gutter: var(--ed-page-gutter, 28px);
  --ed-card-pad: 8px;
  position: relative;
  /* the cards carry 12px of their own space below, so this reads as ~40px */
  margin-bottom: 30px;
}
.ed-shelf__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
  /* the track and card padding add 12px above the covers */
  margin-bottom: 6px;
  padding: 0 var(--ed-gutter);
}
.ed-shelf__titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 14px;
  row-gap: 2px;
  min-width: 0;
}
.ed-shelf__title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}
.ed-shelf__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 26px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-shelf__subtitle {
  min-width: 0;
  max-width: 100%;
  font-size: 13px;
  color: var(--subtle-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed-shelf__aside {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: var(--muted-foreground);
}
.ed-shelf__provider {
  flex-shrink: 0;
  opacity: 0.85;
}
.ed-shelf__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.ed-shelf--dimmed {
  opacity: 0.4;
}

.ed-shelf__viewport {
  position: relative;
  padding-left: calc(var(--ed-gutter) - var(--ed-card-pad));
  padding-right: var(--ed-gutter);
}
.ed-shelf__track {
  display: flex;
  align-items: flex-start;
  gap: var(--ed-gap, 14px);
  position: relative;
  overflow-x: auto;
  overflow-y: visible;
  overscroll-behavior-x: contain;
  padding-block: 4px;
  /* pan-y too: a vertical swipe starting on a tile must scroll the page */
  touch-action: pan-x pan-y;
  scroll-snap-type: x proximity;
  overflow-anchor: none;
  scroll-padding-inline: calc(var(--ed-gutter) - var(--ed-card-pad));
}
.ed-shelf__track::after {
  content: "";
  flex: 0 0 calc(var(--ed-gutter) - var(--ed-gap, 14px));
}
.ma-scroll {
  scrollbar-width: none;
}
.ma-scroll::-webkit-scrollbar {
  display: none;
}

.ed-shelf__navs {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* round hairline arrows, as quiet as the rest of the header */
.ed-shelf__nav {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--muted-foreground);
  background: transparent;
  box-shadow: inset 0 0 0 1px
    color-mix(in oklab, var(--foreground) 14%, transparent);
  transition:
    background 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}
.ed-shelf__nav:hover:not(:disabled) {
  color: var(--foreground);
  background: color-mix(in oklab, var(--foreground) 6%, transparent);
}
.ed-shelf__nav:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.ed-shelf__nav:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (max-width: 600px) {
  .ed-shelf {
    --ed-gutter: 16px;
    margin-bottom: 18px;
  }
  .ed-shelf__head {
    margin-bottom: 0;
  }
  .ed-shelf__title {
    font-size: 21px;
  }
  .ed-shelf__subtitle {
    font-size: 12px;
  }
  .ed-shelf__navs {
    display: none;
  }
}

@media (max-width: 500px) {
  .ed-shelf {
    --ed-card-pad: 4px;
  }
  .ed-shelf__track {
    gap: 4px;
  }
}
</style>

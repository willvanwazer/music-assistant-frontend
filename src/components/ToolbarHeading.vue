<template>
  <div class="toolbar-heading">
    <component
      :is="to ? RouterLink : 'span'"
      :to="to"
      class="toolbar-heading-title"
    >
      {{ title }}
    </component>
    <v-breadcrumbs
      v-if="items.length"
      :items="trail.crumbs"
      class="pa-0 toolbar-heading-trail"
    >
      <template #item="{ item, index }">
        <button
          v-if="index === trail.collapsedIndex"
          type="button"
          class="toolbar-heading-more"
          :aria-label="t('tooltip.show_full_path')"
          :title="t('tooltip.show_full_path')"
          @click="expanded = true"
        >
          {{ ELLIPSIS }}
        </button>
        <v-breadcrumbs-item v-else v-bind="item" />
      </template>
    </v-breadcrumbs>
  </div>
</template>

<script setup lang="ts">
import { isPhoneSizedScreen } from "@/plugins/breakpoint";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, type RouteLocationRaw } from "vue-router";

// beyond this a phone shows only where the trail starts and where you are now
const PHONE_MAX_CRUMBS = 3;
const ELLIPSIS = "…";

// properties
interface Props {
  title: string;
  // leave unset on the section root, where the heading has nowhere to link to
  to?: RouteLocationRaw;
  items?: ToolbarHeadingItem[];
}
const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  items: () => [],
});

const { t } = useI18n();
const expanded = ref(false);

// moving to another page gives a trail that was never collapsed by hand
watch(
  () => props.items,
  () => (expanded.value = false),
);

const trail = computed(() => {
  // crumbs in a trail can share a route and differ only by query, so only an
  // exact match may announce itself as the current page
  const crumbs = props.items.map((item) => ({ ...item, exact: true }));
  if (
    expanded.value ||
    !isPhoneSizedScreen() ||
    crumbs.length <= PHONE_MAX_CRUMBS
  ) {
    return { crumbs, collapsedIndex: -1 };
  }
  return {
    crumbs: [crumbs[0], { title: ELLIPSIS }, crumbs[crumbs.length - 1]],
    collapsedIndex: 1,
  };
});
</script>

<script lang="ts">
export interface ToolbarHeadingItem {
  title: string;
  // marks the page you are on: highlighted and not clickable, even with a route
  disabled: boolean;
  to?: RouteLocationRaw;
}
</script>

<style scoped>
.toolbar-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  line-height: 1.15;
}

/* the trail carries the detail, so the heading only has to name the section,
   in the display serif at the toolbar's title size */
.toolbar-heading-title {
  color: inherit;
  text-decoration: none;
  font-family: var(--font-heading);
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  font-optical-sizing: auto;
}

/* the trail is functional, so it stays small Inter under the serif title. It
   can outgrow the toolbar, so it scrolls rather than pushing the actions off
   the end */
.toolbar-heading-trail {
  max-width: 100%;
  overflow-x: auto;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.4;
  scrollbar-width: none;
}

.toolbar-heading-trail::-webkit-scrollbar {
  display: none;
}

.toolbar-heading-trail :deep(.v-breadcrumbs-item) {
  padding: 0;
  font-size: inherit;
  white-space: nowrap;
  color: var(--muted-foreground);
  opacity: 1;
  transition: color 150ms ease;
}

.toolbar-heading-trail :deep(.v-breadcrumbs-item--link:hover) {
  color: var(--foreground);
}

/* vuetify dims the last crumb as "disabled"; it is the page you are on, so it
   is the one that stands out and the trail above it recedes */
.toolbar-heading-trail :deep(.v-breadcrumbs-item--disabled) {
  color: var(--foreground);
}

.toolbar-heading-trail :deep(.v-breadcrumbs-divider) {
  padding: 0 4px;
  font-size: inherit;
  color: var(--subtle-foreground);
}

/* stands in for the crumbs a phone has no room for, and reveals them on tap */
.toolbar-heading-more {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  font: inherit;
  padding: 0 2px;
}

@media (max-width: 600px) {
  .toolbar-heading-title {
    font-size: 1.25rem;
  }

  .toolbar-heading-trail {
    font-size: 0.65625rem;
  }
}
</style>

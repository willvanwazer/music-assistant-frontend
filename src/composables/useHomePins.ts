import { ref, watch } from "vue";
import { api } from "@/plugins/api";
import type { ItemMapping } from "@/plugins/api/interfaces";
import { setUserPreference } from "@/composables/userPreferences";
import {
  getShortcutUri,
  isSameShortcutUri,
  isShortcutItem,
  isUriMatchingItem,
  type ShortcutItem,
} from "@/composables/useShortcuts";
import { store } from "@/plugins/store";

// Items pinned to the top of the home (Discover) page, in display order.
// Same item kinds and uri form as the sidebar shortcuts, stored separately.
export const HOME_PINS_PREFERENCE_KEY = "home.pins";
export const MAX_HOME_PINS = 24;

export function getHomePinUris(): string[] {
  const value = store.currentUser?.preferences?.[HOME_PINS_PREFERENCE_KEY];
  return Array.isArray(value)
    ? value.filter((uri): uri is string => typeof uri === "string")
    : [];
}

export const canPinToHome = isShortcutItem;

export function isPinnedToHome(item: ShortcutItem | ItemMapping): boolean {
  return getHomePinUris().some((uri) => isUriMatchingItem(uri, item));
}

export function isHomePinCapReached(): boolean {
  return getHomePinUris().length >= MAX_HOME_PINS;
}

export async function pinToHome(
  item: ShortcutItem | ItemMapping,
): Promise<void> {
  const uris = getHomePinUris();
  if (uris.length >= MAX_HOME_PINS || isPinnedToHome(item)) return;
  // newest pin first, like Apple Music
  await setUserPreference(HOME_PINS_PREFERENCE_KEY, [
    getShortcutUri(item),
    ...uris,
  ]);
}

export async function unpinFromHome(
  item: ShortcutItem | ItemMapping,
): Promise<void> {
  await setUserPreference(
    HOME_PINS_PREFERENCE_KEY,
    getHomePinUris().filter((uri) => !isUriMatchingItem(uri, item)),
  );
}

export async function moveHomePin(
  item: ShortcutItem | ItemMapping,
  direction: "left" | "right",
): Promise<void> {
  const uris = getHomePinUris();
  const from = uris.findIndex((uri) => isUriMatchingItem(uri, item));
  const to = direction === "left" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= uris.length) return;
  const next = [...uris];
  [next[from], next[to]] = [next[to], next[from]];
  await setUserPreference(HOME_PINS_PREFERENCE_KEY, next);
}

export function getHomePinMoveAvailability(item: ShortcutItem | ItemMapping): {
  canMoveLeft: boolean;
  canMoveRight: boolean;
} {
  const uris = getHomePinUris();
  const index = uris.findIndex((uri) => isUriMatchingItem(uri, item));
  return {
    canMoveLeft: index > 0,
    canMoveRight: index >= 0 && index < uris.length - 1,
  };
}

/**
 * Pinned items resolved to full media items, kept in preference order and
 * refetched as pins are added. Items that fail to load are skipped but stay
 * pinned, so a provider being offline never loses a pin.
 */
export function useHomePins() {
  const items = ref<ShortcutItem[]>([]);
  const cache = new Map<string, ShortcutItem>();

  const resolve = async (uris: string[]) => {
    const missing = uris.filter(
      (uri) => ![...cache.keys()].some((k) => isSameShortcutUri(k, uri)),
    );
    const settled = await Promise.allSettled(
      missing.map((uri) => api.getItemByUri(uri)),
    );
    settled.forEach((result, i) => {
      if (
        result.status === "fulfilled" &&
        result.value &&
        isShortcutItem(result.value)
      ) {
        cache.set(missing[i], result.value as ShortcutItem);
      }
    });
    // pins may have changed while fetching
    const current = getHomePinUris();
    items.value = current
      .map((uri) => {
        for (const [k, item] of cache) {
          if (isSameShortcutUri(k, uri)) return item;
        }
        return undefined;
      })
      .filter((item): item is ShortcutItem => item !== undefined);
  };

  watch(
    () => getHomePinUris().join("\n"),
    () => resolve(getHomePinUris()),
    {
      immediate: true,
    },
  );

  return { items };
}

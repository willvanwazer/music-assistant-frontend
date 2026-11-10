import {
  getPinnedUris,
  getShortcutMoveAvailability,
  isShortcutCapReached,
  isShortcutItem,
  isShortcutPinnedItem,
  MAX_SHORTCUTS,
  moveShortcutStandaloneItem,
  pinShortcutStandalone,
  unpinShortcutStandaloneItem,
  useShortcuts,
  type ShortcutItem,
} from "@/composables/useShortcuts";
import type { ItemMapping } from "@/plugins/api/interfaces";

// Legacy key remains readable; the first edit migrates both lists atomically.
export const HOME_PINS_PREFERENCE_KEY = "home.pins";
export const MAX_HOME_PINS = MAX_SHORTCUTS;
export const getHomePinUris = getPinnedUris;
export const canPinToHome = isShortcutItem;
export const isPinnedToHome = isShortcutPinnedItem;
export const isHomePinCapReached = isShortcutCapReached;
export const pinToHome = pinShortcutStandalone;
export const unpinFromHome = unpinShortcutStandaloneItem;

export async function moveHomePin(
  item: ShortcutItem | ItemMapping,
  direction: "left" | "right",
): Promise<void> {
  await moveShortcutStandaloneItem(item, direction === "left" ? "up" : "down");
}

export function getHomePinMoveAvailability(item: ShortcutItem | ItemMapping) {
  const { canMoveUp, canMoveDown } = getShortcutMoveAvailability(item);
  return { canMoveLeft: canMoveUp, canMoveRight: canMoveDown };
}

export function useHomePins() {
  const { pinnedItems } = useShortcuts();
  return { items: pinnedItems };
}

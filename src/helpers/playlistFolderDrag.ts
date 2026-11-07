export const PLAYLIST_DRAG_TYPE = "application/x-music-assistant-playlists";

export function playlistIdsFromDrop(event: DragEvent): string[] {
  try {
    const ids: unknown = JSON.parse(
      event.dataTransfer?.getData(PLAYLIST_DRAG_TYPE) || "null",
    );
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 500 ||
      !ids.every((id) => typeof id === "string" && /^[1-9]\d*$/.test(id))
    )
      return [];
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export function startPlaylistDrag(
  event: DragEvent,
  item: { provider: string; item_id: string },
) {
  if (item.provider !== "library" || !event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    PLAYLIST_DRAG_TYPE,
    JSON.stringify([item.item_id]),
  );
}

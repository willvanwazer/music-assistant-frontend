import {
  MediaType,
  type MediaItemTypeOrItemMapping,
  type RecommendationFolder,
} from "@/plugins/api/interfaces";

export function isImportRecommendation(folder: RecommendationFolder): boolean {
  return /^recently[-_]added(?:[-_]|$)/.test(folder.item_id);
}

export function topPickItems(
  folder: RecommendationFolder,
  items: MediaItemTypeOrItemMapping[],
  now = Date.now(),
): MediaItemTypeOrItemMapping[] {
  const media = items.filter((item) => item.media_type !== MediaType.FOLDER);
  if (!isImportRecommendation(folder)) return media;
  return media.filter((item) => {
    const release =
      "metadata" in item ? item.metadata?.release_date : undefined;
    // Import timestamps and a year alone cannot establish that a release is new.
    if (!release || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(release)) return false;
    const date = Date.parse(release);
    return Number.isFinite(date) && date <= now && now - date <= 90 * 86400000;
  });
}

import { setUserPreference } from "@/composables/userPreferences";
import {
  MediaType,
  type MediaItemTypeOrItemMapping,
} from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";

// Frontend-rendered rows that are not recommendation folders from the server.
// Server rows are keyed by their folder uri (e.g. library://folder/recently_played).
export const PLAYERS_ROW_ID = "players";
export const PINNED_ROW_ID = "pinned";
export const TOP_PICKS_ROW_ID = "top_picks";
export const PODCASTS_ROW_ID = "podcasts";
export const GENRES_ROW_ID = "genres";
export const RECENTLY_PLAYED_ROW_ID = "library://folder/recently_played";
export const IN_PROGRESS_ROW_ID = "library://folder/in_progress";

// Provider domains whose recommendation rows are spoken word (audiobooks and
// podcasts). These rows sink below the music rows by default.
const AUDIOBOOK_PROVIDER_DOMAINS: ReadonlySet<string> = new Set([
  "audible",
  "audiobookshelf",
  "storytel",
]);

export const SPOKEN_WORD_PROVIDER_DOMAINS: ReadonlySet<string> = new Set([
  ...AUDIOBOOK_PROVIDER_DOMAINS,
  "bbc_sounds",
  "gpodder",
  "itunes_podcasts",
  "overcast",
  "overcast_mac",
  "pocketcasts",
  "podcast_index",
  "podcastfeed",
]);

export interface DiscoverFolderRef {
  uri: string;
  item_id: string;
  provider: string;
}

/** Domain for a provider instance id, falling back to the id's domain prefix. */
export type ProviderDomainLookup = (instanceId: string) => string | undefined;

const providerDomain = (
  folder: DiscoverFolderRef,
  domainOf: ProviderDomainLookup,
): string => domainOf(folder.provider) ?? folder.provider.split("--")[0];

/** Whether a recommendation row holds audiobooks or podcasts. */
export function isSpokenWordRow(
  folder: DiscoverFolderRef,
  domainOf: ProviderDomainLookup,
): boolean {
  // the library "in progress" row only fills with audiobooks and episodes:
  // tracks and albums have no resume position
  if (folder.uri === IN_PROGRESS_ROW_ID) return true;
  return SPOKEN_WORD_PROVIDER_DOMAINS.has(providerDomain(folder, domainOf));
}

/** Spoken-word rows that start hidden, on top of server default-off rows. */
export function isDefaultHiddenSpokenRow(
  folder: DiscoverFolderRef,
  domainOf: ProviderDomainLookup,
): boolean {
  return AUDIOBOOK_PROVIDER_DOMAINS.has(providerDomain(folder, domainOf));
}

/** Keep shared music shelves free of spoken word, and podcast shelves free of books. */
export function discoverRowItems(
  folder: DiscoverFolderRef,
  items: MediaItemTypeOrItemMapping[],
  domainOf: ProviderDomainLookup,
): MediaItemTypeOrItemMapping[] {
  // Dedicated audiobook shelves are opt-in, so respect an explicit choice
  // to show one. Shared history and in-progress shelves never promote books.
  if (isDefaultHiddenSpokenRow(folder, domainOf)) return items;
  const spokenWord = isSpokenWordRow(folder, domainOf);
  return items.filter(
    (item) =>
      item.media_type !== MediaType.AUDIOBOOK &&
      (spokenWord ||
        (item.media_type !== MediaType.PODCAST &&
          item.media_type !== MediaType.PODCAST_EPISODE)),
  );
}

export interface DefaultRowOrderInput {
  hasPlayers: boolean;
  hasPinned: boolean;
  hasTopPicks: boolean;
  hasGenres: boolean;
  // recommendation rows in server order; `recentlyPlayed` marks any
  // provider's recently played row (e.g. Spotify's), kept with the library's
  folders: Array<{
    uri: string;
    spokenWord: boolean;
    recentlyPlayed?: boolean;
  }>;
}

/**
 * Default order of every candidate row: players, pinned items and top picks
 * first, then the recently played rows (library first) and the other music
 * rows in server order, the genre
 * grid, and finally podcasts and audiobook rows.
 */
export function defaultDiscoverRowOrder(input: DefaultRowOrderInput): string[] {
  const ids: string[] = [];
  if (input.hasPlayers) ids.push(PLAYERS_ROW_ID);
  if (input.hasPinned) ids.push(PINNED_ROW_ID);
  if (input.hasTopPicks) ids.push(TOP_PICKS_ROW_ID);
  const musicFolders = input.folders.filter((f) => !f.spokenWord);
  const spoken = input.folders.filter((f) => f.spokenWord).map((f) => f.uri);
  const recent = musicFolders
    .filter((f) => f.recentlyPlayed || f.uri === RECENTLY_PLAYED_ROW_ID)
    .map((f) => f.uri)
    .sort(
      (a, b) =>
        Number(b === RECENTLY_PLAYED_ROW_ID) -
        Number(a === RECENTLY_PLAYED_ROW_ID),
    );
  ids.push(...recent);
  ids.push(
    ...musicFolders.map((f) => f.uri).filter((uri) => !recent.includes(uri)),
  );
  if (input.hasGenres) ids.push(GENRES_ROW_ID);
  ids.push(PODCASTS_ROW_ID);
  if (spoken.includes(IN_PROGRESS_ROW_ID)) ids.push(IN_PROGRESS_ROW_ID);
  ids.push(...spoken.filter((uri) => uri !== IN_PROGRESS_ROW_ID));
  return ids;
}

// Per-user discover page customization, stored as a single preference object.
// Visibility is hybrid: normal rows are visible by default and can be opted out
// via `hidden`; rows the server marks default-off (enabled_by_default=false) are
// hidden by default and must be opted in via `shown`. New normal rows (e.g. from
// a freshly added provider) still show up automatically. An id is in at most one
// of `hidden`/`shown`; the resolver treats `hidden` as authoritative if both.
export interface DiscoverRowsConfig {
  // Layout revision the saved order was made against. A saved order from an
  // older revision is dropped once, so a changed default order takes effect.
  version?: number;
  hidden?: string[];
  shown?: string[];
  order?: string[];
}

export interface ResolvedDiscoverRowsConfig {
  hidden: Set<string>;
  // Display order: every currently available row id exactly once.
  order: string[];
}

export const DISCOVER_ROWS_PREFERENCE_KEY = "discover.rows";
// 2: music before podcasts and audiobooks, pinned row added
export const DISCOVER_ROWS_LAYOUT_VERSION = 2;

// Legacy per-key preferences, written by older frontends. Read-only fallback:
// the first edit through this module snapshots them into the new format.
const LEGACY_ROW_SETTINGS_KEY = "discoverRowSettings";
const LEGACY_ENABLED_KEYS: Array<[key: string, rowId: string]> = [
  ["discoverPlayersEnabled", PLAYERS_ROW_ID],
  ["discoverTopPicksEnabled", TOP_PICKS_ROW_ID],
  ["discoverGenresEnabled", GENRES_ROW_ID],
];

interface LegacyRowSetting {
  enabled: boolean;
}

/**
 * The effective discover rows configuration for the current user, resolved
 * against the currently available rows.
 *
 * `availableIds` is the default order of all rows that can be shown right now.
 * `defaultHidden` lists rows the server marks default-off; each is hidden unless
 * the user opted it in via `shown`, while a normal row is visible unless the user
 * hid it. Rows the user ordered previously but that are currently unavailable
 * (e.g. their provider is offline) are left out of the result but keep their
 * saved state.
 */
export function resolveDiscoverRowsConfig(
  availableIds: string[],
  defaultHidden: string[] = [],
): ResolvedDiscoverRowsConfig {
  const cfg = effectiveConfig();
  const available = new Set(availableIds);
  const userHidden = new Set(
    (cfg.hidden ?? []).filter((id) => available.has(id)),
  );
  const userShown = new Set(
    (cfg.shown ?? []).filter((id) => available.has(id)),
  );
  const defaultHiddenSet = new Set(
    defaultHidden.filter((id) => available.has(id)),
  );
  const hidden = new Set(
    availableIds.filter(
      (id) =>
        userHidden.has(id) || (defaultHiddenSet.has(id) && !userShown.has(id)),
    ),
  );
  const order = mergeOrder(cfg.order ?? [], availableIds, false);
  return { hidden, order };
}

/** Hide or unhide a single row. */
export async function setDiscoverRowHidden(
  id: string,
  hidden: boolean,
): Promise<void> {
  const cfg = effectiveConfig();
  const hiddenSet = new Set(cfg.hidden ?? []);
  const shownSet = new Set(cfg.shown ?? []);
  if (hidden) {
    hiddenSet.add(id);
    shownSet.delete(id);
  } else {
    hiddenSet.delete(id);
    shownSet.add(id);
  }
  await writeConfig({ ...cfg, hidden: [...hiddenSet], shown: [...shownSet] });
}

/**
 * Reorder the currently available rows. The given ids are rearranged within
 * the positions they already occupy in the full saved order; rows that are
 * currently unavailable keep their exact slots.
 */
export async function setDiscoverRowsOrder(
  orderedIds: string[],
  availableIds: string[],
): Promise<void> {
  const cfg = effectiveConfig();
  const fullOrder = mergeOrder(cfg.order ?? [], availableIds, true);
  const moving = new Set(orderedIds);
  if (moving.size !== orderedIds.length) return;
  const queue = [...orderedIds];
  const nextOrder = fullOrder.map((id) =>
    moving.has(id) ? queue.shift()! : id,
  );
  // Every given id must already exist in the full order.
  if (queue.length > 0) return;
  await writeConfig({ ...cfg, order: nextOrder });
}

function effectiveConfig(): DiscoverRowsConfig {
  const pref = store.currentUser?.preferences?.[DISCOVER_ROWS_PREFERENCE_KEY];
  if (pref && typeof pref === "object") {
    const cfg = pref as DiscoverRowsConfig;
    const current = cfg.version === DISCOVER_ROWS_LAYOUT_VERSION;
    return {
      hidden: Array.isArray(cfg.hidden) ? cfg.hidden : [],
      shown: Array.isArray(cfg.shown) ? cfg.shown : [],
      order: current && Array.isArray(cfg.order) ? cfg.order : [],
    };
  }
  // legacy layouts predate the current default order: keep their visibility
  return legacyConfig();
}

/** Visibility assembled from the legacy per-key preferences. */
function legacyConfig(): DiscoverRowsConfig {
  const prefs = store.currentUser?.preferences;
  if (!prefs) return {};
  const hidden: string[] = [];
  for (const [key, rowId] of LEGACY_ENABLED_KEYS) {
    if (prefs[key] === false) hidden.push(rowId);
  }
  const rowSettings = prefs[LEGACY_ROW_SETTINGS_KEY] as
    | Record<string, LegacyRowSetting>
    | undefined;
  if (rowSettings && typeof rowSettings === "object") {
    for (const [uri, setting] of Object.entries(rowSettings)) {
      if (setting?.enabled === false) hidden.push(uri);
    }
  }
  return { hidden };
}

async function writeConfig(cfg: DiscoverRowsConfig): Promise<void> {
  const pref: DiscoverRowsConfig = {
    version: DISCOVER_ROWS_LAYOUT_VERSION,
    hidden: cfg.hidden ?? [],
    shown: cfg.shown ?? [],
    order: cfg.order ?? [],
  };
  await setUserPreference(DISCOVER_ROWS_PREFERENCE_KEY, pref);
}

/**
 * Merge the user's saved order with the available ids: give every id the
 * user hasn't ordered yet its default position — right after its nearest
 * preceding default sibling. Saved ids that are not currently available are
 * dropped from the result unless `keepUnavailable` (used when writing, so
 * a temporarily offline provider's rows keep their slots).
 */
function mergeOrder(
  userOrder: string[],
  availableIds: string[],
  keepUnavailable: boolean,
): string[] {
  const available = new Set(availableIds);
  const order = userOrder.filter(
    (id, index) =>
      userOrder.indexOf(id) === index && (keepUnavailable || available.has(id)),
  );
  for (let i = 0; i < availableIds.length; i++) {
    const id = availableIds[i];
    if (order.includes(id)) continue;
    let insertAt = 0;
    for (let j = i - 1; j >= 0; j--) {
      const prevIndex = order.indexOf(availableIds[j]);
      if (prevIndex >= 0) {
        insertAt = prevIndex + 1;
        break;
      }
    }
    order.splice(insertAt, 0, id);
  }
  return order;
}

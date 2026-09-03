import type { RadioCategory } from '@tiko/data'

/**
 * Curated Tiko Media artwork per built-in collection.
 *
 * These are pinned URLs rather than a live media search: the search endpoint
 * ranks poorly for bare collection words ("Animals" returns Milk and Grass,
 * "Music" returns Sea Conch), so picking at runtime would put the wrong picture
 * on a child's tile. This mirrors `TikoAppConfig.appIconImageUrl` and the same
 * pinned list in the iOS app (`RadioLibraryStore.swift`).
 */
function mediaArtwork(path: string): string {
  return `https://data.tikocdn.org/uploads/${path}`
}

export const defaultRadioCollections: RadioCategory[] = [
  { id: 'animals', name: 'Animals', icon: 'animals/cat-head', color: 'yellow', order: 0, imageUrl: mediaArtwork('1781443435229-cat.png') },
  { id: 'stories', name: 'Stories', icon: 'ui/books', color: 'purple', order: 1, imageUrl: mediaArtwork('1781474706796-teddy-bear-with-book.png') },
  { id: 'music', name: 'Music', icon: 'media/music-note', color: 'orange', order: 2, imageUrl: mediaArtwork('1755106316235-music-note.png') },
  { id: 'calm', name: 'Calm', icon: 'media/headphones', color: 'blue', order: 3, imageUrl: mediaArtwork('1756035358916-moon.png') },
  { id: 'favorites', name: 'Favorites', icon: 'ui/heart-m', color: 'gold', order: 4, imageUrl: mediaArtwork('1756035319481-hearts.png') },
]

/**
 * Artwork for collections that already exist on a device from an earlier
 * release, keyed by the id they were seeded with. Collections a parent makes
 * carry their own `imageUrl` and never come through here.
 */
export const radioCollectionArtworkById: Record<string, string> = {
  ...Object.fromEntries(defaultRadioCollections.map(collection => [collection.id, collection.imageUrl as string])),
  bedtime: mediaArtwork('1756035358916-moon.png'),
  songs: mediaArtwork('1755106316235-music-note.png'),
  uncategorized: mediaArtwork('1755105859570-folders.png'),
}

/** Artwork for a collection card, or an empty string when only the icon exists. */
export function radioCollectionArtwork(collection: Pick<RadioCategory, 'id' | 'imageUrl'>): string {
  return collection.imageUrl || radioCollectionArtworkById[collection.id] || ''
}

/**
 * Starter songs come from a curated kids' channel rather than pinned video ids,
 * so a video that gets taken down never leaves a dead tile in a child's library.
 */
export const defaultSongsChannelId = 'UCLXC88sF7_PSymrmXrw5f5w'

/** Collection the starter songs land in. */
export const defaultSongsCollectionId = 'music'

/** How many starter songs to seed on a first run. */
export const defaultSongsCount = 8

export const colorNamesForNewCollections = [
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan', 'teal', 'lime',
] as const

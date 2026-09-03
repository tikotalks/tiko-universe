# Tiko Radio

## Job

A listening app for a child who cannot read a playlist. A parent fills collections
with songs and stories; the child taps a picture and it plays. Nothing on screen
moves, nothing autoplays a video — Radio is sound.

## Collections

Collections are Radio's shelves. Every collection carries a Tiko Media picture, a
colour, and a name; the picture leads, and the icon only stands in while a
collection has no artwork yet. The five that ship — Animals, Stories, Music,
Calm, Favorites — use the same pinned artwork on web and iOS
(`apps/radio/web/src/radioCollections.ts`, `RadioLibraryStore.swift`).

Pinned rather than searched: the media search ranks poorly for bare collection
words ("Music" returns Sea Conch), and a child's tile is the wrong place to
discover that.

Parent Mode sees every collection, including an empty one just made — it is where
the next song goes. Child Mode sees only collections with something to play.

### Managing them

- **+ in the header** asks what to add: a song, or a collection.
- **Long press** (or right click) a collection card opens edit and delete.
- **Edit** changes the name, colour, and picture, picked from the Tiko Media
  library.
- **Delete** warns by name and count — "Deleting “Animals” also removes its 5
  songs." — and deletes the songs with it.

## Adding songs

The add flow always names the collection a song lands in ("Add to Music"), never
"this collection" on a screen that is not one.

| Source | How a parent adds it | How it plays |
| --- | --- | --- |
| YouTube | Search, or paste any watch/shorts/music link | Hidden embed, audio only |
| Upload | Pick an MP3, WAV or M4A | Directly, in the browser |
| Spotify | Paste a track link (once linked) | Spotify's own embed, off-screen |
| Apple Music | Paste a song link (once linked) | Opens in Apple Music |

YouTube search runs through `GET /v1/youtube/search` on media-api with strict
safe search and embeddable-only results, so the key stays server-side and the
child's browser never talks to Google. Without a key the route answers
`503 youtube_not_configured` and the popup falls back to pasting a link.

### Linked subscriptions

A parent links Spotify or Apple Music under Settings → Music services. Linking
tells Radio the family has that subscription; songs are added from share links,
resolved server-side by `GET /v1/music/resolve` (Spotify oEmbed, iTunes lookup) so
no credential and no CORS policy is involved.

What playback honestly is:

- **Spotify** plays inside Radio through Spotify's own embed. A browser signed in
  to Spotify hears the full song; a signed-out one hears the 30-second preview
  Spotify allows. Volume stays with Spotify — the embed exposes no control.
- **Apple Music** cannot be played by a third-party web page without MusicKit
  credentials, so those songs open in Apple Music instead. iOS does the same,
  handing the song to the Apple Music app.

## Starter songs

A first run seeds a handful of songs from a curated kids' channel
(`defaultSongsChannelId`) into Music, fetched live rather than pinned as video
ids, so a video taken down never leaves a dead tile. Seeding runs once, is
skipped when a library already has songs, and needs the YouTube key.

## Configuration

| Secret | Worker | Without it |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | media-api | No YouTube search and no starter songs; link paste still works |

Set it with `npx wrangler secret put YOUTUBE_API_KEY` in `workers/media-api`, or
bind `YOUTUBE_SECRET` from the Secrets Store.

## Data

`RadioTrack` gained `externalId` and `externalUrl` for subscription songs, and
`TrackSource` gained `spotify` and `apple-music`; `RadioCategory` gained
`imageUrl`. Both platforms decode the same shapes, so a Spotify song added on the
web never breaks the iOS library.

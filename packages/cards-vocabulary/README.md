# Cards vocabulary

The default collections and cards of Tiko Cards, authored once.

- `source/vocabulary.json`: every default collection and card, in English, with the picture each card is pinned to.
- `source/translations/<locale>.json`: titles and spoken text in another language.

Both the content API and the copy bundled in the iOS app are generated from these files:

```bash
node tools/generate-cards-vocabulary.mjs                 # write the migration and the app bundle
node tools/generate-cards-vocabulary.mjs --check         # fail if either is stale (part of generated:check)
node tools/generate-cards-vocabulary.mjs --verify-media  # check every pinned picture against the live media library
```

Never edit `workers/content-api/migrations/0014_cards_default_vocabulary.sql` or `apps/cards/ios/Sources/CardsDefaultVocabulary.json` by hand.

## A card

```json
{
  "id": "__default_quick_help",
  "title": "Help",
  "speech": "I need help",
  "fitzgerald": "action",
  "picture": { "media": "acd2c5c5-…", "title": "girl-help", "url": "https://data.tikocdn.org/uploads/…" }
}
```

- `speech` is left out when the card speaks its own title.
- `fitzgerald` is one of `person`, `action`, `thing`, `describing`, `social`, `miscellaneous`.
- `picture.media` is the id of an image in the Tiko media library; `title` and `url` are that image's own, kept so a reader can tell what was chosen. A picture is chosen by a person who has looked at it. Nothing is matched by title when the app runs.
- `"picture": null` means the card has no picture on purpose. The colour cards do this: the tile colour is the picture, so they also set `color`.

## A collection

`parent` makes it a sub-collection. `cover` names the card whose picture is shown on the collection's tile; a collection that only holds other collections borrows the cover of its first child. A collection whose cards have no pictures (Colours) names a `picture` of its own instead, in the same shape as a card's.

## A translation

```json
{ "locale": "nl", "strings": { "Dog": "Hond" }, "byId": { "__default_colours_orange": { "title": "Oranje" } } }
```

`strings` translates an English title or spoken text wherever it occurs. `byId` overrides one card or collection where the same English word means something else (the fruit and the colour). A card with no translation stays English.

The generator refuses a locale in which two cards of one collection end up with the same word: a child cannot tell them apart, and the app would speak the same audio for both.

# Tiko Globe — the people pack

A fifth mode beside countries, cities, animals and landmarks: the people who
live, and lived, in a place. Every country has somebody except Heard Island and
the Siachen Glacier, where nobody lives but weather stations and soldiers.

## The rule

> Name a people or a tradition, never a costume for a modern nationality.
> Historical figures are named as history: a Viking is a Viking, not a Norwegian.

It is written into `content/country-people.json` so it travels with the data.
"A Frenchman in a beret" is the failure this is guarding against; "Breton" is
the same country done right.

## The files

| File | What it is |
| --- | --- |
| `packages/geography/content/country-people.json` | The authored source — 240 countries, hand-written. |
| `packages/geography/content/people.json` | The compiled pack the app bundles. |
| `tools/geography/additions/people-*.json` | Batches waiting to be merged in. |
| `packages/geography/content/images/<id>.png` | The artwork, one file per person. |

## Adding somebody

1. Write them into a new `tools/geography/additions/people-<somewhere>.json`:

   ```json
   { "countries": { "MLI": {
     "id": "dogon", "name": "Dogon", "era": "living", "importance": 2,
     "glyph": "🎭", "lat": 14.35, "lon": -3.6,
     "note": "Cliff dwellers of Bandiagara, with masks as tall as a house."
   } } }
   ```

2. `node tools/geography/add-country-people.mjs --write` — merges it in, and
   checks every position. A marker outside its own country is moved to the
   capital, then to the label point, and the move is printed rather than done
   quietly. A country that already has that person is left alone, so this is
   safe to run again.

3. `node tools/geography/build-people.mjs --write` — compiles the pack and finds
   the artwork.

4. `node tools/geography/check-placements.mjs` — the gate. It fails the build if
   anybody stands outside their own country.

## The artwork

`build-people.mjs` looks for a picture in three places, in order: a file already
sitting in `content/images/<id>.png`, the title mapped in its `ARTWORK` table,
and then the person's own name — plus `"<Name> Person"`, which is the shape the
media library tends to use. **So a picture published to Tiko media under the
person's name is picked up by the next build with no code change at all.**

To draw the missing ones instead:

```bash
cp .env.example .env        # then put TIKO_API_KEY in it — .env is gitignored
npm run geography:people-art -- --write
```

The brief asks for a **standing figure, head to feet** rather than a bust, in
the plain soft clay of the Viking and the Roman: two dark eyes, a soft mouth,
no skin texture and no rendered face. At the size the globe draws these — about
a centimetre — a silhouette is everything and an eyelash is noise. The canvas
knows about it: art noticeably taller than it is wide stands *on* its spot,
feet at the marker, rather than hanging with the point through its waist.

Without `--write` it prints what it would draw and three sample prompts.

# Fitzgerald Key implementation plan

Use the six-category modified Fitzgerald Key: people/pronouns yellow, verbs green, nouns orange, adjectives/adverbs blue, social words pink, miscellaneous neutral. Reference: https://uwaterloo.ca/childrens-communication-lab/sites/default/files/uploads/documents/aac-final-full-report-3-sept-2025-.pdf

## Scope

Tiko Talk (web and iOS): opt-in setting, existing grammatical metadata, word cloud, word tiles and sentence strip. Tiko Cards (web and iOS): explicit optional classification, card editor, persisted API contract and full-screen card. Auno Communicate: opt-in setting, existing vocabulary classes, editable classifications for cards, shared rendering. No other suite apps are affected.

## Behaviour

The setting defaults off. Existing custom colours and positions are retained. Turning the setting off restores existing presentation. No classification is inferred from text, icons or collection names. Unknown/unclassified words are miscellaneous; a phrase is not automatically social. Explicit card classification wins over vocabulary metadata. Colour never replaces labels, symbols or accessibility names. Auno retains its contrast and grayscale controls.

## Implementation sequence

1. Add one six-category contract per repository, with matching reference fixtures.
2. Wire settings and all communication surfaces.
3. Persist optional category metadata through editors, local storage, API and export.
4. Verify mapping, unknown values, round trips and opt-out regression. Run web checks and native tests where tools are available.

## Verification boundary

Native build and VoiceOver/device checks require Xcode on macOS. Submit changes through a feature pull request. Deployment is outside this change.

## Persisted contract

Cards use optional `fitzgeraldCategory`: `person`, `action`, `thing`, `describing`, `social`, or `miscellaneous`. Missing classifications render neutral when enabled. Invalid API writes return 400; legacy writes without a category preserve existing classification. No database migration is required because this uses existing metadata JSON.

Auno stores optional classification in card appearance overrides and the default-off flag in accessibility settings. Existing profiles decode with the setting off. Existing colour, placement and contrast controls remain intact. Older clients may discard new optional fields when rewriting data.

## Validation results

- Both Tiko web production builds pass. Vite reports large-chunk advisories.
- Repository-wide Vue/TypeScript checking passes.
- Targeted lint has no errors, with two pre-existing warnings.
- 52 targeted tests cover category mapping, reference palette contrast, API validation, persistence, card order and opt-out behaviour.
- Swift regression tests were added but not run: this Linux environment has no Swift/Xcode. Native compile, device, VoiceOver and grayscale/contrast checks remain required.
- Auno changes were prepared from source files pinned to commit `7cbdce450c68ef0eef5328e8ad1ba70faf50eba4`; this is a partial source snapshot.
- Changes are submitted for review through feature pull requests. No production deployment was performed.

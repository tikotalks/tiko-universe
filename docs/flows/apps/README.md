# App User Flow Contracts

Every Tiko app must have a user flow contract in this directory before implementation or migration is considered complete.

Use `../shared/app-flow-template.md` for each app.

## Current app flow contracts

- `yes-no.md` — first proof app.

## Required next app flow contracts

Create these before implementation/migration work expands:

- `type.md`
- `cards.md`
- `sequence.md`
- `timer.md`

## Rules

Each app flow contract must:

1. Use the shared startup/session flow.
2. Use the shared identity/account flow.
3. Use the shared settings/state flow.
4. Use the shared offline/sync flow.
5. Use the shared data model from `docs/architecture/data-model.md`.
6. Document reset app, reset progress, reset my data, and deletion impact where relevant.
7. Document platform-specific differences.
8. Define acceptance criteria.

An app is not done if its flow is undocumented, even if the code works.

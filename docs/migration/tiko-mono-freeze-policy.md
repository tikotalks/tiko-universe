# tiko-mono Freeze Policy

`tiko-mono` is the frozen reference implementation for Tiko until `tiko-universe` replaces each app/domain.

## Allowed in `tiko-mono`

- Emergency production fixes.
- Security fixes.
- Documentation clarifying current behavior.
- Migration notes and references.

## Not allowed in `tiko-mono`

- New product features.
- New app architecture.
- New native app work.
- Broad refactors.
- Worker consolidation unless needed for emergency stability.

## Migration rule

Every feature copied from `tiko-mono` into `tiko-universe` needs:

- source reference
- intended behavior
- tests/smoke checks
- parity checklist update
- note if behavior intentionally changes

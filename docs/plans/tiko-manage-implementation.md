# Tiko Manage Implementation Plan

## Objective

Implement Tiko Manage as another application in `tiko-universe`, using the same TikoAppKit/TikoKit foundations while adding shared spaces, kids, device pairing, wallet, reward, notification, and subscription capabilities.

The implementation must not fork identity, app bootstrap, account navigation, language, theme, subscription state, or native-wrapper conventions.

## Target repository shape

Proposed additions:

```text
apps/
  manage/
    package.json
    src/
    public/

packages/
  manage-types/
  manage-client/
  wallet/
  entitlements/

packages/ui/
  shared kid, wallet, reward, and space components

packages/tikokit-ios/
  shared kid, wallet, pairing, entitlement, and notification surfaces
```

Exact package names may be consolidated with existing packages if the responsibilities already fit there.

## Workstream 1: contracts and ADRs

### Deliverables

- Approve `docs/apps/manage.md`.
- Approve `docs/architecture/manage-identity-and-pairing.md`.
- Approve `docs/architecture/manage-subscriptions.md`.
- Add ADRs for:
  - spaces and membership capabilities
  - kid identities replacing global Profile Manager roles
  - device pairing tokens
  - space-scoped wallets
  - backend-validated store entitlements

### Exit criteria

- Naming is agreed: Tiko Manage, Kids, Spaces.
- Home free limit is agreed.
- Initial paid plans are agreed.
- Migration strategy from Profile Manager is accepted.

## Workstream 2: shared types

### Add types

- `TikoSpace`
- `SpaceMembership`
- `SpaceRole`
- `ManagedKid`
- `KidSpaceMembership`
- `DeviceAssignment`
- `DevicePairingRequest`
- `AdultContextGrant`
- `Wallet`
- `WalletAssetType`
- `WalletTransaction`
- `Reward`
- `RewardRequest`
- `EntitlementSet`
- `SubscriptionSummary`

### Requirements

- Types are platform-neutral.
- API payloads are explicitly versioned.
- Existing identity types remain compatible during migration.

## Workstream 3: database and API foundation

### Initial tables

```text
spaces
space_memberships
managed_kids
kid_space_memberships
device_assignments
device_pairing_requests
adult_context_grants
wallets
wallet_asset_types
wallet_transactions
rewards
reward_requests
reward_rules
subscriptions
entitlement_sets
billing_events
```

### API modules

- spaces
- memberships
- kids
- device assignments
- pairing
- wallet
- rewards
- notifications
- subscriptions
- entitlements

### Required qualities

- server-side capability checks
- idempotent writes
- audit metadata for adult actions
- D1 transaction boundaries where needed
- migration and rollback scripts
- deletion/export classification

## Workstream 4: identity migration

### Steps

1. Introduce space and membership storage without removing legacy fields.
2. Create compatibility capability resolution for Profile Managers.
3. Create Home spaces for current Profile Managers.
4. Convert manager relationships into memberships.
5. Link existing Child Account subjects as Managed Kids.
6. Preserve existing child sessions where possible.
7. Add new Spaces/Kids endpoints.
8. Move Tiko Manage to new endpoints only.
9. Migrate existing child-facing apps to new kid/device session summaries.
10. Deprecate legacy Profile Manager endpoints.

### Safety

- Do not generate new child identities if an existing subject can be preserved.
- Do not delete legacy relationships until validation completes.
- Produce migration reports for unmatched or orphaned records.

## Workstream 5: TikoAppKit foundation

### Shared additions

- active space provider
- available space list
- active kid provider
- device assignment provider
- capability resolver
- entitlement provider
- pairing deep-link handler
- adult context grant handler
- notification registration and routing

### Shared shell additions

Child-facing shell:

- kid avatar/name
- optional wallet balance
- compact wallet sheet
- reward-earned celebration
- reward request status

Adult-facing shell:

- space switcher
- plan/entitlement state
- notification inbox badge
- Manage deep links

### Requirements

- Features are optional for apps that do not yet adopt them.
- No app duplicates shared identity or wallet state.
- Web and iOS behaviour remain contractually aligned.

## Workstream 6: Tiko Manage application shell

### Initial routes

```text
/
/kids
/kids/:kidId
/devices
/wallet
/wallet/requests
/wallet/rewards
/apps
/activity
/settings
/settings/members
/settings/billing
```

### Navigation

- Home
- Kids
- Devices
- Wallet
- Apps
- Activity

### Responsive behaviour

- desktop sidebar
- tablet split-view where useful
- mobile bottom or compact navigation
- native-safe QR scanner and push flows

### Exit criteria

- App boots through shared TikoAppKit.
- Account, language, theme, and workspace behaviour use shared components.
- No app-local auth implementation exists.

## Workstream 7: spaces and Kids MVP

### Features

- create Home space
- list accessible spaces
- switch active space
- invite an adult member
- create up to four kids on Family Free
- edit kid name, avatar, language, and safe preferences
- archive kid
- view kid overview

### Validation

- limits enforced by backend entitlements
- no legal name or exact birth date required
- Kid records have separate subject IDs

## Workstream 8: QR pairing MVP

### Manage features

- create pairing request
- show QR and manual code
- show expiry countdown
- cancel pairing request
- live completion state
- list connected devices
- revoke assignment

### Child app features

- Connect to Tiko Manage action
- QR scanner
- manual code entry
- pairing confirmation
- durable kid session storage
- automatic Child Mode launch

### Tests

- expired token
- reused token
- wrong kid or space
- revoked assignment
- reinstall and restore
- multiple apps sharing the same device assignment

## Workstream 9: wallet and rewards MVP

### Wallet foundation

- create default Stars asset
- award points
- derive balance from immutable ledger
- transaction history
- active goal

### Rewards

- create reward with cost
- assign to kids or space
- request approval
- reserve points
- approve and charge
- approve without charge
- decline
- refund/cancel

### Shared app integration

- balance in child shell
- wallet sheet
- reward request action
- Give Reward adult action

## Workstream 10: notifications

### Native notifications

- register adult devices
- route reward requests to authorised adults
- deep-link to request detail
- notify child session of resolution through push or sync

### Preferences

- reward requests
- goal reached
- device issues
- invitation
- daily summary later

### Privacy

- generic lock-screen text option
- no child-sensitive details by default
- no billing notifications in child sessions

## Workstream 11: subscriptions and entitlements

### Backend

- plan definitions
- entitlement resolver
- usage counters
- Apple validation
- Google validation
- provider notifications/webhooks
- restore binding
- expiration and grace-period jobs

### App Store products

Create products for at least:

- Family Plus monthly
- Family Plus yearly
- Teacher monthly
- Teacher yearly

Final pricing is a product decision and must not be hard-coded into clients.

### Tiko Manage UI

- current plan
- usage versus limits
- plan comparison
- upgrade
- restore purchases
- manage subscription
- billing status
- downgrade-over-capacity guidance

### Shared integration

- TikoAppKit entitlement provider
- feature helpers
- automatic refresh after purchase
- no billing prompts in kid-facing apps

## Workstream 12: classroom phase

### Features

- create Classroom space
- Teacher entitlement requirement
- groups
- bulk kid creation
- shared classroom devices
- teacher-selected active kid
- assistants
- group rewards
- bulk app/content assignment
- classroom activity summary

### Important rule

Classroom data and Home data remain access-scoped. A teacher does not gain Home-space visibility through a shared kid identity.

## Workstream 13: content and apps management

### App configuration

- enable/hide apps
- assign per-kid settings
- inspect sync state
- configure reward rules

### Content management

Begin with the apps where adult-created content is most valuable:

1. Cards
2. Talk
3. Todo
4. Sequence
5. Radio

Use shared assignment concepts instead of copying content for each kid.

## Workstream 14: activity and progress

### MVP

- reward history
- pairing events
- app configuration changes
- routine/sequence completion summaries where already available

### Later

- weekly summaries
- exports
- professional reports

### Guardrails

- no child ranking
- no hidden monitoring
- no continuous screen-time tracking
- no punitive scoring

## Suggested milestones

### Milestone 0: contracts

- documentation
- ADRs
- types
- migration design

### Milestone 1: spaces and kids

- backend
- TikoAppKit context
- Manage shell
- Home space
- create kids

### Milestone 2: pairing

- QR request
- scanner
- personal assignment
- child session
- revoke

### Milestone 3: wallet

- Stars
- rewards
- requests
- notifications
- shared wallet UI

### Milestone 4: billing

- entitlements
- Family Plus
- Teacher
- App Store/Play purchases
- restore

### Milestone 5: classroom

- classroom space
- groups
- shared devices
- group actions

### Milestone 6: content and progress

- central content management
- app configuration
- summaries and reports

## Initial issue breakdown

1. Define shared Manage domain types.
2. Add spaces and membership schema.
3. Add Managed Kids schema and APIs.
4. Add capability resolver.
5. Add entitlement schema and Family Free defaults.
6. Add Manage app scaffold using TikoAppKit.
7. Build Home and Kids screens.
8. Add pairing request API.
9. Add QR pairing UI in Manage.
10. Add pairing scanner to shared child-app shell.
11. Add device assignments and revoke flow.
12. Add wallet ledger.
13. Add rewards and reward requests.
14. Add shared wallet sheet.
15. Add push notification routing.
16. Add Apple StoreKit purchase validation.
17. Add Google Play purchase validation.
18. Add plan and billing screens.
19. Migrate legacy Profile Manager data.
20. Add Classroom space and Teacher entitlements.

## Definition of done for MVP

- Tiko Manage exists under `apps/manage` and uses shared TikoAppKit.
- A verified adult can create a Home space.
- Family Free permits up to four kids.
- An adult can create a kid.
- A Tiko child app can scan a QR code and become assigned to that kid.
- The assignment works across Tiko apps on the same device.
- The kid sees identity and wallet state in the shared app shell.
- An adult can create a reward, assign a cost, and give points.
- A kid can request a reward.
- An authorised adult receives a notification and resolves it.
- The wallet ledger remains immutable and consistent.
- Family Plus and Teacher can be purchased and restored through native stores.
- Backend entitlements enforce limits.
- Core child-facing functionality remains available without a paid plan.

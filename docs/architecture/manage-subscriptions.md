# Tiko Manage Subscriptions and Entitlements

## Status

Proposed billing and entitlement architecture for Tiko Manage.

## Purpose

Define how Tiko Manage supports Family Free, Family Plus, Teacher, and Organisation plans while remaining compatible with Apple App Store subscriptions, Google Play Billing, and optional web billing.

## Principles

1. Store products are purchase channels, not the internal entitlement model.
2. Tiko entitlements are the server-side source of truth.
3. Subscription ownership is attached to a space or organisation, not a child.
4. Core child-facing accessibility and communication features remain available without payment.
5. Paid plans cover management scale, collaboration, automation, reporting, administration, and support.
6. Clients must support purchase, upgrade, downgrade, restore, grace period, expiration, and billing issue states.
7. Family and professional plans may use different sales channels while sharing one entitlement system.

## Product plans

Stable internal plan identifiers:

```ts
type PlanId =
  | 'family_free'
  | 'family_plus'
  | 'teacher'
  | 'organisation'
```

Product names, prices, and included limits may change without changing these identifiers.

## Family Free

Recommended entitlements:

```text
spaces.home.max = 1
kids.home.max = 4
members.home.max = 3
devices.max = 10
wallet.enabled = true
wallet.rewards.enabled = true
wallet.requests.enabled = true
wallet.automation.enabled = false
activity.history.days = 30
reports.basic.enabled = true
reports.advanced.enabled = false
exports.basic.enabled = true
spaces.classroom.enabled = false
spaces.therapy.enabled = false
```

## Family Plus

Potential entitlements:

```text
spaces.home.max = 2
kids.home.max = 8
members.home.max = 8
devices.max = 30
wallet.automation.enabled = true
activity.history.days = 365
reports.advanced.enabled = true
exports.advanced.enabled = true
content.templates.premium = true
support.priority = true
```

Family Plus must not gate essential communication, accessibility, or basic kid usage.

## Teacher

Potential entitlements:

```text
spaces.classroom.enabled = true
spaces.classroom.max = 3
kids.classroom.max = 30
members.classroom.max = 8
groups.enabled = true
devices.shared.max = 50
wallet.group_awards.enabled = true
wallet.automation.enabled = true
content.bulk_assign.enabled = true
reports.classroom.enabled = true
exports.classroom.enabled = true
activity.history.days = 365
```

Teacher may later support capacity variants. These should map to entitlement values, not separate code paths.

Examples:

```text
teacher_10
teacher_30
teacher_100
```

These can all resolve to `planId: teacher` with different `kids.classroom.max` values.

## Organisation

Organisation plans are likely contract-based or web-purchased.

Potential entitlements:

```text
organisations.enabled = true
spaces.classroom.max = custom
spaces.therapy.max = custom
kids.total.max = custom
members.total.max = custom
sso.enabled = optional
central_admin.enabled = true
audit.enabled = true
billing.consolidated.enabled = true
content.organisation_library.enabled = true
reports.organisation.enabled = true
support.sla = custom
```

## Subscription ownership

```ts
interface SubscriptionOwner {
  type: 'space' | 'organisation'
  id: string
}
```

Family and Teacher subscriptions normally belong to a space.

Organisation subscriptions belong to an organisation and may grant entitlements to multiple spaces.

A child never owns or purchases a subscription.

## Store product mapping

```ts
type BillingProvider = 'apple' | 'google' | 'web' | 'manual'

interface BillingProductMapping {
  provider: BillingProvider
  productId: string
  planId: PlanId
  billingPeriod?: 'monthly' | 'yearly'
  entitlementOverrides?: Record<string, boolean | number | string>
  active: boolean
}
```

Example product IDs:

```text
app.tikotalks.manage.family_plus.monthly
app.tikotalks.manage.family_plus.yearly
app.tikotalks.manage.teacher.monthly
app.tikotalks.manage.teacher.yearly
```

Final product IDs must follow the actual bundle identifier and store configuration.

## Server-side subscription model

```ts
interface TikoSubscription {
  id: string
  ownerType: 'space' | 'organisation'
  ownerId: string
  provider: BillingProvider
  providerAccountId?: string
  providerOriginalTransactionId?: string
  providerProductId: string
  planId: PlanId
  status:
    | 'active'
    | 'trialing'
    | 'grace_period'
    | 'billing_retry'
    | 'cancelled'
    | 'expired'
    | 'revoked'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  autoRenew?: boolean
  createdAt: string
  updatedAt: string
}
```

## Entitlements

```ts
interface EntitlementSet {
  ownerType: 'space' | 'organisation'
  ownerId: string
  planId: PlanId
  values: Record<string, boolean | number | string>
  sourceSubscriptionId?: string
  validUntil?: string
  version: number
}
```

Entitlements are resolved from:

- base plan defaults
- active subscription
- capacity variant
- organisation inheritance
- promotional grants
- support/admin overrides

The resolved set should be cached but versioned and refreshable.

## Client contract

TikoAppKit should expose:

```ts
interface SubscriptionSummary {
  planId: PlanId
  status: string
  provider?: BillingProvider
  currentPeriodEnd?: string
  autoRenew?: boolean
  canManageInApp: boolean
}

interface EntitlementClient {
  getEntitlements(spaceId: string): Promise<EntitlementSet>
  refreshEntitlements(spaceId: string): Promise<EntitlementSet>
  getSubscription(spaceId: string): Promise<SubscriptionSummary>
}
```

Manage-specific billing UI may build on these shared clients.

## Apple App Store purchase flow

1. User opens Plans in Tiko Manage.
2. App loads StoreKit products configured for the current storefront.
3. User selects Family Plus or Teacher.
4. App initiates StoreKit purchase.
5. StoreKit returns a transaction.
6. App sends signed transaction data and target space ID to Tiko backend.
7. Backend validates the transaction with Apple data/server APIs.
8. Backend creates or updates `TikoSubscription`.
9. Backend recalculates entitlements.
10. App refreshes entitlements and updates UI.

The client must never unlock paid functionality solely from a local StoreKit result.

## Google Play purchase flow

Equivalent flow:

1. Load Play Billing products.
2. Start purchase.
3. Receive purchase token.
4. Send purchase token, product ID, package name, and target space ID to backend.
5. Backend validates with Google Play Developer API.
6. Backend updates subscription and entitlements.
7. Client acknowledges purchase as required.
8. Client refreshes entitlements.

## Web billing

Web billing may be used for:

- Organisation plans
- invoices
- custom capacity
- professional annual plans
- jurisdictions or platforms where external billing is allowed

The app must follow current Apple and Google rules for external purchase links and in-app messaging. Store-compliance decisions must be reviewed at implementation and release time because policies can change.

## Restore purchases

Tiko Manage must provide Restore Purchases.

Restore flow:

1. Client retrieves current store transactions/purchases.
2. Client sends all relevant transaction identifiers to backend.
3. Backend validates them.
4. Backend identifies or asks the user to select the target eligible space.
5. Backend restores subscription ownership and entitlements.
6. Client refreshes the active space.

A purchase already bound to another unrelated Tiko account or space requires an explicit recovery/transfer policy. It must not be silently duplicated.

## Upgrade and downgrade

### Family Free to Family Plus

Upgrade applies immediately after validation.

### Family Plus to Teacher

The user chooses or creates a Classroom space. Teacher entitlements should not silently convert an existing Home space into a classroom unless the product explicitly supports mixed space types.

### Downgrade

When limits are exceeded after downgrade:

- do not delete kids, devices, content, or history
- block creation of additional items
- allow the user to archive or reduce usage
- preserve read access where possible
- clearly show which limit is exceeded

Example:

```text
Your plan supports 4 kids. This space currently has 6.
Existing kids remain available, but new kids cannot be added until the space is within the limit or the plan is upgraded.
```

## Grace period and billing retry

During grace period or billing retry:

- preserve paid entitlements temporarily according to provider status
- show a non-blocking billing warning to authorised billing managers
- never show billing warnings in kid-facing apps
- continue to allow export and account management

## Expiration

On expiration:

- resolve entitlements to the applicable free plan
- retain data
- disable paid-only mutations and professional features
- preserve access needed to manage, export, or reduce data
- do not break child-facing core functionality

## Family Sharing

Apple Family Sharing should not automatically be assumed to map to Tiko household membership.

If store products enable Family Sharing, the backend still needs a deliberate policy for:

- which Tiko account owns the subscription
- which Home space receives entitlements
- whether multiple spaces can share one purchase

Initial recommendation: one store subscription grants entitlements to one selected Tiko space.

## Trials and promotions

Trials and offers are represented as subscription states and entitlement validity.

Possible support:

- introductory App Store offers
- Play trials
- Tiko-issued promotional entitlement grants
- organisation pilots

Promotional grants should be auditable and expire automatically.

## Billing permissions

Only members with `billing.manage` can:

- purchase for a space
- change plan
- restore or bind purchases
- view billing history
- open provider subscription management

Kids and scoped professionals without billing permission must not see purchase controls.

## APIs

```text
GET  /v1/spaces/{spaceId}/subscription
GET  /v1/spaces/{spaceId}/entitlements
POST /v1/spaces/{spaceId}/entitlements/refresh

POST /v1/billing/apple/transactions/validate
POST /v1/billing/google/purchases/validate
POST /v1/billing/restore
POST /v1/billing/web/checkout
POST /v1/billing/web/portal
```

Provider webhook/server notification endpoints:

```text
POST /v1/billing/apple/notifications
POST /v1/billing/google/notifications
POST /v1/billing/web/webhooks
```

These endpoints must validate signatures and process events idempotently.

## Idempotency

Store events may arrive repeatedly or out of order.

Use provider transaction identifiers and event IDs as idempotency keys. Subscription updates must be monotonic according to provider timestamps and status precedence.

## App Store UI requirements

The native app should include:

- plan comparison
- localised price and billing period from the store
- purchase button
- restore purchases
- terms and privacy links
- auto-renewal explanation
- manage subscription link
- current plan and renewal date
- cancellation/expiration explanation

Do not hard-code store prices in the client.

## Web UI requirements

The web app should show:

- active plan
- included limits
- current usage
- upgrade options available for the platform
- invoice or billing portal access where supported
- warning when a subscription can only be managed through Apple or Google

## TikoAppKit integration

Tiko Manage uses shared TikoAppKit billing primitives rather than implementing isolated subscription state.

Shared responsibilities:

- entitlement fetch and cache
- active-space entitlement context
- plan-aware capability helpers
- store transaction handoff
- deep links from notifications or upgrade prompts
- restore flow coordination
- expired/grace-period status

Manage-specific responsibilities:

- plan comparison screens
- usage and limits
- billing member permissions
- purchase target space selection
- organisation billing workflows

## Testing

Required tests:

- Family Free defaults without purchase
- successful Apple validation
- successful Google validation
- invalid or forged transaction rejection
- restore purchase
- duplicate notification idempotency
- grace period
- expiration
- downgrade over capacity
- upgrade entitlement refresh
- purchase bound to wrong account/space
- offline purchase completion followed by later validation
- organisation override inheritance

## Open product decisions

Before implementation, define:

- exact prices
- monthly versus yearly availability
- Teacher capacity bands
- whether Therapy uses Teacher or a separate professional plan
- whether Family Plus allows more than four kids
- which advanced reports are paid
- whether web billing is available for Teacher
- purchase transfer policy
- refund and revocation behaviour

## Acceptance criteria

- Family Free works without a purchase.
- Native clients can buy Family Plus and Teacher through their platform stores.
- Purchases are validated by the backend.
- Entitlements are attached to the selected space.
- Restore Purchases works after reinstall or device change.
- Plan upgrades apply without app restart.
- Expiration never deletes kid data.
- Downgrade over capacity preserves existing records.
- Kid-facing apps never display billing prompts.
- TikoAppKit exposes shared entitlement state to all applications.

# Tiko Manage

## Status

Proposed application and platform capability.

## Summary

Tiko Manage is the adult-facing management application for the Tiko ecosystem. It is used by parents, caregivers, teachers, therapists, assistants, and organisation administrators to create and manage kids, connect devices, configure Tiko apps, manage wallets and rewards, review requests, and view appropriate progress.

Tiko Manage is **another Tiko application in the same universe**, not a separate product stack. It must use the same identity system, API platform, shared packages, design language, application shell, and native wrappers as the existing Tiko applications.

It has more functionality and denser management interfaces than child-facing apps, but it must still fit into the same TikoAppKit/TikoKit architecture.

## Product principles

1. Child-facing Tiko apps remain simple.
2. Management complexity belongs in Tiko Manage.
3. Tiko Manage serves all authorised adults, not only parents.
4. Kids are separate identity subjects with independent data, wallets, app state, and device assignments.
5. Adults receive permissions through space membership and roles.
6. QR pairing is the primary way to connect a kid device.
7. Wallet and rewards are shared platform capabilities visible from every Tiko app.
8. Tiko does not become screen-time or device-control software.
9. Paid plans apply to scale, professional management, collaboration, reporting, and support—not to basic child-facing access.
10. App Store and Play Store subscriptions must be supported for eligible plans.

## Naming

The primary navigation label is **Kids**, not People.

The app is named **Tiko Manage** because it must work for multiple adult roles:

- Parent
- Caregiver
- Teacher
- Therapist
- Assistant
- Organisation administrator

The app may adapt terminology by space type. For example, a classroom can label Kids as Students, but the canonical data model remains Kids.

## Core concepts

```text
Adult account
└── Spaces
    ├── Kids
    ├── Adult members
    ├── Devices
    ├── Apps and content
    ├── Wallets and rewards
    └── Activity and progress
```

### Adult account

A verified, recoverable Tiko account authenticated using OTP or magic link. No password is introduced.

### Space

A managed environment containing kids, adult memberships, devices, app configuration, wallet configuration, and activity.

Initial space types:

- `home`
- `classroom`
- `therapy`
- `organisation`

Space type controls defaults, limits, terminology, and available professional features. It must not create separate incompatible systems.

### Kid

A separately addressable Tiko identity managed through one or more spaces.

A kid has:

- display name
- avatar
- language and accessibility preferences
- assigned devices
- app settings and content
- wallet and reward state
- progress and activity
- child-scoped sessions

A kid does not require:

- email
- password
- billing access
- account recovery UI
- adult settings

### Device

A physical installation that can be assigned to:

- one kid
- a shared home space
- a classroom or group
- no kid yet

### Wallet

A shared Tiko platform capability containing spendable points, collectibles, reward goals, reward requests, and immutable transactions.

## Navigation

The first version of Tiko Manage uses:

```text
Home
Kids
Devices
Wallet
Apps
Activity
```

Workspace switching, account settings, memberships, billing, and plan management live under the shared account/workspace menu.

## Home

The home screen is an action-oriented dashboard, not a large analytics dashboard.

It shows:

- pending reward requests
- kids requiring attention
- active goals
- device setup or sync issues
- recent activity
- quick reward action
- current space and plan

Example:

```text
2 requests waiting

Tig
24 stars · Saving for Swimming
Requested “Choose tonight’s movie”

Anna
8 stars · No active goal

Devices
Tig’s iPad · Online
Family iPad · Needs assignment
```

## Kids

The Kids section lists all kids the active adult is authorised to manage in the current space.

Each list item may show:

- avatar
- name
- wallet balance
- active goal
- pending request count
- assigned-device status
- recent activity

Kid detail sections:

```text
Overview
Wallet
Apps
Content
Progress
Devices
Settings
```

### Creating a kid

A verified adult with the required space permission can create a kid without manual Tiko administrator promotion.

Creation flow:

1. Add display name and avatar.
2. Choose language and optional accessibility defaults.
3. Configure an initial wallet or skip it.
4. Connect a device by QR code or do it later.

Avoid requiring legal names, exact birth dates, diagnoses, or medical information.

## Spaces and roles

Adults can belong to multiple spaces and can hold different roles in each.

Recommended roles:

- `owner`
- `administrator`
- `parent`
- `caregiver`
- `teacher`
- `therapist`
- `assistant`
- `viewer`

Capabilities derive from memberships and role policies. They must not derive from a single global `profile_manager` account type.

Examples:

- A user may own a Home space.
- The same user may be a teacher in a Classroom space.
- A parent may have access to only one kid in a school space.
- A therapist may manage assigned kids without receiving billing privileges.

## Device pairing

QR pairing is the default way to connect a kid device.

### Manage-side flow

1. Open a kid.
2. Select Devices.
3. Select Connect device.
4. Tiko Manage creates a short-lived pairing request.
5. Tiko Manage displays a QR code and manual fallback code.
6. The screen waits for confirmation.

Example:

```text
Connect Tig’s device

1. Open any Tiko app on the kid’s device.
2. Choose “Connect to Tiko Manage”.
3. Scan this code.

[QR]

Code: M7K4-PQ
Expires in 10 minutes
```

### Kid-device flow

On an unassigned device, any Tiko app can expose:

```text
Start using Tiko

Use on this device
Connect to Tiko Manage
```

After scanning:

1. The device sends the pairing token and device identity to the API.
2. The API validates and consumes the single-use token.
3. The API assigns the device to the kid and space.
4. The API creates a durable, device-bound, kid-scoped session.
5. The app opens automatically in Child Mode.
6. Both devices receive confirmation.

### Pairing security

Pairing tokens must:

- expire after approximately ten minutes
- be single-use
- be scoped to one kid and one space
- not contain a permanent session credential
- not grant adult or wallet-management capability
- become invalid immediately after exchange

### Device modes

#### Personal kid device

Assigned to one kid. Every Tiko app automatically restores that kid identity and opens in Child Mode.

#### Shared home device

Assigned to a Home space. The device presents a kid picker or adult-selected kid context.

#### Classroom device

Assigned to a classroom, group, or temporarily selected student. Teacher-controlled selection must be supported.

#### Adult device

Runs Tiko Manage and may open child apps in preview or management context, but must not silently become a kid device.

## Parent, teacher, and therapist mode inside apps

Existing Tiko apps retain their shared Child Mode and adult-management affordances.

When a kid device is assigned to Tig, entering adult mode operates in Tig’s context. It must not transform the kid identity into an adult identity.

The app receives a short-lived adult grant scoped to actions such as:

- manage the current app
- edit the active kid’s content
- change app-specific settings
- give a reward
- open the kid in Tiko Manage

Sensitive actions may require stronger authentication or opening Tiko Manage.

## Wallet and rewards

Wallet is a shared platform feature, not functionality owned exclusively by Tiko Manage.

Tiko Manage provides the complete adult management interface. Every child-facing app may display a compact wallet surface through TikoAppKit.

### Default concepts

- **Points:** spendable currency, initially Stars by default.
- **Cards and badges:** collectibles that normally remain owned.
- **Rewards:** things a kid can request or redeem by spending points.

### Reward catalogue

Adults can create rewards with:

- name
- icon or image
- description
- point cost
- currency
- applicable kids or groups
- redemption mode
- optional stock
- optional availability schedule
- optional cooldown
- active state

Redemption modes:

- `instant`
- `request_approval`
- `adult_only`

Real-world rewards do not require technical enforcement. Tiko records requests, approvals, reservations, redemptions, and refunds. It does not need to verify whether an outing, snack, movie, or device-time agreement was fulfilled.

### Reward requests

A kid can request a reward from the shared wallet sheet.

The requested cost is reserved until the request is resolved.

An authorised adult receives a notification and can:

- approve and charge
- approve without charging
- decline
- later cancel and refund where allowed

### Notifications

Tiko Manage should support push notifications for:

- reward requested
- goal reached
- device pairing completed
- device re-link required
- invitation received
- important sync or account issue

Avoid notifying adults for every earned point. Daily or weekly summaries may be added later.

### Giving rewards

Rewards can be given from:

- Tiko Manage
- a kid detail page
- a quick action on Home
- Parent/Teacher/Therapist Mode inside any Tiko app

Teachers can give group rewards, but the wallet service must create separate ledger entries for each kid.

### Automatic rewards

Apps emit events. They do not directly mutate wallet balances.

A central reward-rules service evaluates:

- rule ownership
- active space
- kid identity
- event uniqueness
- daily limits
- eligibility
- app identity

Automatic rewards must be configurable and limited. Basic communication actions should not become automatically transactional by default.

### Goals

A kid may select or receive an active reward goal. The shared app shell can show progress after points are earned.

## Apps and content

Tiko Manage can configure Tiko apps for each kid or group.

Initial controls:

- enable or hide an app
- assign content
- configure kid-safe settings
- configure reward rules
- inspect sync state
- reset app state where permitted
- open app-specific management views

Later shared content management can include:

- Cards boards
- Talk categories
- Todo routines
- Sequence sets
- Radio content
- saved phrases
- assigned media

Content may be assigned to one kid, multiple kids, a group, or a complete space.

## Activity and progress

Tiko Manage should surface useful activity without becoming surveillance software.

Appropriate information includes:

- routines completed
- reward history
- goals reached
- frequently used communication cards
- sequence completion
- recently active apps
- content changes

Avoid:

- continuous screen tracking
- ranking kids against each other
- hidden monitoring
- punitive scoring
- detailed behavioural surveillance

Data access must be scoped to the active space. School staff must not automatically see Home activity.

## Classroom and therapy scale

Professional spaces add scale and collaboration rather than creating separate products.

Classroom capabilities may include:

- groups
- bulk kid creation
- shared devices
- teacher and assistant roles
- group rewards
- bulk content assignment
- academic-year archive
- reports and export

Therapy capabilities may include:

- caseloads
- assigned activities
- therapist roles
- parent collaboration
- progress reports
- multiple locations or professionals

## Wallet separation between spaces

Wallets are separate by space by default.

Example:

```text
Home Wallet
Classroom Wallet
Therapy Wallet
```

This prevents classroom points from being spent on Home rewards unless an explicit future sharing feature is configured.

## TikoAppKit integration

Tiko Manage must use the same shared application system as other Tiko apps.

### Shared foundations

It must use:

- the existing Tiko identity client and session conventions
- shared API client patterns
- shared i18n
- shared UI tokens and components
- shared account and workspace navigation
- shared notifications and deep-link conventions
- shared native wrapper strategy
- shared logging and error handling

### Shared application shell

Tiko Manage remains a Tiko app and should use TikoAppKit/TikoKit for:

- app bootstrap
- identity/session restoration
- account avatar and account menu
- workspace switching
- theme and language
- notifications
- routing/deep linking
- offline/sync indicators
- update prompts
- subscription entitlement refresh

It may use a denser desktop/tablet layout and management navigation, but it must not fork identity, settings, account menus, typography, tokens, or component behaviour.

### Shared child-facing integration

TikoAppKit should gain reusable platform features consumable by every Tiko app:

- active kid identity display
- compact wallet balance
- wallet sheet
- reward-earned celebration
- reward request action
- adult Give Reward action
- current space context
- device assignment state

Tiko Manage is the full management surface for these capabilities. Other apps use the shared compact surfaces.

## Platform strategy

### Web

Build Tiko Manage as a responsive web app using the same monorepo and web packages as the existing applications.

Desktop and tablet are important because management includes forms, lists, content editing, device lists, and bulk actions.

### Native

Tiko Manage should also ship through native app stores because it needs:

- push notifications
- QR scanning
- deep links
- secure credential storage
- App Store / Play Store subscriptions
- app badges

A native wrapper around the shared web application is acceptable initially if it follows the existing Tiko native-platform strategy and provides a high-quality native shell.

## Plans

Initial product plans:

- `family_free`
- `family_plus`
- `teacher`
- `organisation`

Plan names are product-facing and can change. Entitlement identifiers must remain stable.

### Family Free

Recommended baseline:

- one Home space
- up to four kids
- limited adult memberships
- personal and shared device pairing
- wallet and rewards
- basic app configuration
- basic activity and progress
- core child-facing functionality

### Family Plus

Potential benefits:

- additional adults or spaces
- advanced reward rules
- expanded history
- richer exports and backups
- premium management templates
- extended collaboration
- priority support

Basic accessibility, communication, and child-facing app functionality must not be placed behind Family Plus.

### Teacher

Potential benefits:

- classroom spaces
- higher kid limits
- groups
- teacher and assistant roles
- shared classroom devices
- bulk actions
- class reward tools
- progress summaries
- exports

Teacher pricing may have capacity bands, such as 10, 30, or more kids, but capacity must be implemented through entitlements rather than hard-coded UI forks.

### Organisation

Potential benefits:

- multiple classrooms or therapy spaces
- central administration
- staff provisioning
- organisation-wide content
- audit history
- consolidated billing
- organisation exports and reports
- support agreements

## Subscription purchasing

Tiko Manage must support subscription purchase and upgrade through:

- Apple App Store subscriptions on iOS/iPadOS
- Google Play Billing subscriptions on Android
- web billing where permitted and appropriate

The application must include:

- plan comparison
- upgrade flow
- restore purchases
- manage subscription link
- entitlement refresh
- grace-period handling
- expired/cancelled handling
- billing issue messaging

Store purchases must never be treated as the primary source of truth in clients. Purchase receipts are validated by the backend and converted into stable Tiko entitlements.

See `docs/architecture/manage-subscriptions.md` for the technical plan.

## MVP

### Identity and spaces

- verified adult authentication
- create one Home space
- invite another adult
- create up to four kids

### Pairing

- create QR pairing request
- scan from any Tiko app
- assign a personal device
- revoke a device

### Wallet

- one spendable currency
- give points
- create rewards with costs
- request reward
- approve or decline
- push notification
- immutable history
- active goal

### App integration

- kid identity in shared shell
- compact wallet balance
- shared wallet sheet
- Give Reward action in adult mode

### Manage interface

- Home
- Kids
- Devices
- Wallet
- basic Apps configuration
- Activity

### Billing foundation

- entitlement API
- Family Free defaults
- App Store/Play product mapping
- purchase validation
- restore purchases
- plan screen

## Later phases

### Phase 2

- shared family devices
- multiple currencies
- cards and badges
- automatic reward rules
- content management
- richer progress summaries
- classroom spaces
- groups and group rewards

### Phase 3

- therapy spaces
- cross-space kid linking
- professional reports
- organisation accounts
- bulk imports
- advanced exports
- templates and shared content libraries

## Decisions locked by this plan

1. The navigation label is Kids.
2. Tiko Manage serves all authorised adults.
3. It remains a TikoAppKit application in the existing monorepo.
4. Kids are separate identity subjects.
5. Adult permissions come from space memberships.
6. QR pairing is the primary device setup method.
7. Wallet is a shared platform service available in every Tiko app.
8. Tiko Manage is the full adult management surface.
9. A dedicated child Wallet app is optional.
10. Tiko does not implement screen-time enforcement.
11. Home use supports up to four kids by default.
12. Family Plus, Teacher, and Organisation are entitlement-based plans.
13. Native store subscriptions must support upgrade and restore.
14. Home, classroom, and therapy wallets remain separate by default.
15. Paid features apply to management scale and professional capability, not core child accessibility.

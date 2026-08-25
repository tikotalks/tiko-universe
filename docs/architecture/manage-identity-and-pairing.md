# Tiko Manage Identity, Spaces, Kids, and Device Pairing

## Status

Proposed replacement and extension for the current Profile Manager / Child Account model.

## Purpose

Define the identity and authorisation model required by Tiko Manage while preserving the existing Tiko principles:

- no login wall for child-facing apps
- no passwords
- automatic device bootstrap
- OTP or magic-link recovery for adults
- Child Mode by default on assigned kid devices
- shared identity and session infrastructure across all Tiko apps

## Problem with the current model

The current identity contract supports:

- Temporary Accounts
- Verified Accounts
- admin-promoted Profile Manager Accounts
- Child Accounts created by Profile Managers
- Parent Mode and Child Mode

That model is not sufficient for Tiko Manage because:

- normal verified adults cannot create kids
- Profile Manager is a global account type rather than a scoped permission
- a kid can have only one manager relationship
- classrooms and therapy spaces need several adult roles
- shared devices need active-kid selection
- a user can hold different roles in different spaces
- plans and subscriptions need space-scoped entitlements

## Target identity model

### Subject kinds

Retain the identity-subject abstraction.

```ts
type SubjectKind = 'anonymous' | 'device' | 'account' | 'service'
```

### Account types

Simplify account type to identity lifecycle rather than management role.

```ts
type AccountType =
  | 'temporary'
  | 'verified'
  | 'kid'
  | 'service'
```

Management capability comes from space memberships and grants.

### Runtime modes

```ts
type RuntimeMode = 'adult' | 'child'
```

Existing `parent` may remain temporarily for compatibility, but new APIs and documentation should use adult-oriented terminology because the same mode is used by teachers, therapists, and caregivers.

## Spaces

```ts
type SpaceType = 'home' | 'classroom' | 'therapy' | 'organisation'

interface TikoSpace {
  id: string
  type: SpaceType
  name: string
  ownerSubjectId: string
  planId: string
  status: 'active' | 'suspended' | 'archived'
  createdAt: string
  updatedAt: string
}
```

A space is the primary scope for:

- memberships
- kids
- devices
- wallet configuration
- app assignments
- content assignments
- subscriptions and entitlements
- activity visibility

## Adult memberships

```ts
type SpaceRole =
  | 'owner'
  | 'administrator'
  | 'parent'
  | 'caregiver'
  | 'teacher'
  | 'therapist'
  | 'assistant'
  | 'viewer'

interface SpaceMembership {
  id: string
  spaceId: string
  subjectId: string
  role: SpaceRole
  status: 'invited' | 'active' | 'suspended'
  kidScope?: string[]
  createdAt: string
  updatedAt: string
}
```

`kidScope` optionally limits a membership to selected kids.

Capabilities must be resolved server-side from:

- active identity subject
- active space
- membership status
- membership role
- kid scope
- plan entitlements
- temporary grants

## Kids

A kid is represented by a separate account/subject.

```ts
interface ManagedKid {
  id: string
  subjectId: string
  displayName: string
  avatarId?: string
  language?: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

interface KidSpaceMembership {
  id: string
  kidSubjectId: string
  spaceId: string
  status: 'active' | 'archived'
  displayNameOverride?: string
  createdAt: string
}
```

A kid may belong to multiple spaces while retaining one Tiko identity.

Data visibility remains space-scoped. Home, classroom, and therapy activity must not automatically merge in adult-facing interfaces.

## Device identities

The existing device bootstrap remains useful.

A physical installation has a device identity independent of the current kid or adult session.

```ts
interface TikoDevice {
  id: string
  secretHash: string
  name?: string
  platform?: string
  appId?: string
  createdAt: string
  lastActiveAt: string
}
```

## Device assignments

```ts
type DeviceAssignmentMode = 'personal' | 'shared' | 'classroom'

interface DeviceAssignment {
  id: string
  deviceId: string
  spaceId: string
  mode: DeviceAssignmentMode
  kidSubjectId?: string
  groupId?: string
  status: 'active' | 'revoked'
  assignedBySubjectId: string
  createdAt: string
  revokedAt?: string
}
```

Rules:

- `personal` requires `kidSubjectId`.
- `shared` is scoped to a space and permits controlled kid selection.
- `classroom` may use `groupId` or teacher-selected kid context.
- Revoking an assignment invalidates associated kid sessions.
- Deleting an assignment does not delete the kid.

## Sessions

### Adult session

Created through OTP or magic-link login for a verified account.

Contains:

- adult subject
- active space or available spaces
- memberships
- plan entitlements
- adult runtime mode

### Kid device session

Created after successful pairing or authorised kid selection.

Contains:

- kid subject
- device identity
- active space
- assignment ID
- child runtime mode
- child-safe capabilities

A kid session must not contain adult management capabilities.

### Adult grant over kid context

When an adult unlocks management inside a kid-facing app, create a short-lived scoped grant rather than changing the kid account type.

```ts
interface AdultContextGrant {
  token: string
  adultSubjectId: string
  kidSubjectId: string
  deviceId: string
  spaceId: string
  purposes: string[]
  expiresAt: string
}
```

Example purposes:

- `manage_current_app`
- `edit_kid_content`
- `give_reward`
- `manage_device_assignment`

The server validates the adult membership and kid scope before issuing the grant.

## Pairing requests

```ts
interface DevicePairingRequest {
  id: string
  tokenHash: string
  manualCodeHash: string
  spaceId: string
  kidSubjectId: string
  createdBySubjectId: string
  expiresAt: string
  consumedAt?: string
  status: 'pending' | 'consumed' | 'expired' | 'cancelled'
}
```

The raw token is returned only once to Tiko Manage and rendered as QR content.

The QR should contain an opaque URL or payload such as:

```text
tiko://pair?token=<opaque-single-use-token>
```

Do not embed permanent session credentials, child details, or manager information.

## Pairing API

```text
POST   /v1/spaces/{spaceId}/kids/{kidId}/pairing-requests
GET    /v1/spaces/{spaceId}/pairing-requests/{requestId}
DELETE /v1/spaces/{spaceId}/pairing-requests/{requestId}
POST   /v1/device-pairing/exchange
```

### Create request

Authorisation:

- active adult session
- membership with `kids.devices.connect`
- kid is active in the space
- plan permits another device assignment

Response:

```json
{
  "pairingRequest": {
    "id": "pair_123",
    "token": "single-use-secret",
    "manualCode": "M7K4-PQ",
    "expiresAt": "2026-08-06T14:00:00Z"
  }
}
```

### Exchange request

Input:

```json
{
  "token": "single-use-secret",
  "device": {
    "id": "device-id",
    "secret": "device-secret",
    "name": "Tig’s iPad",
    "platform": "ios"
  }
}
```

The server:

1. hashes and locates the token
2. checks status and expiry
3. verifies kid and space status
4. verifies plan capacity
5. creates or restores the device identity
6. creates the personal assignment
7. creates a kid-scoped session
8. consumes the pairing request atomically
9. emits pairing-completed activity
10. triggers Manage notification/update

## Shared-device selection

Shared devices require explicit active-kid selection.

Recommended flow:

1. Device holds a shared space assignment.
2. Adult or kid selects an allowed kid.
3. Server validates assignment and selection policy.
4. Server issues a short-lived or refreshable kid session tied to the shared assignment.
5. Switching kids revokes or replaces the previous runtime session.

Selection policies may include:

- adult selection only
- kid PIN/code
- visual code
- teacher selection
- scan kid card

## Capability model

Suggested capability namespaces:

```text
spaces.read
spaces.manage
members.read
members.invite
members.manage
kids.read
kids.create
kids.manage
kids.archive
kids.devices.read
kids.devices.connect
kids.devices.revoke
wallet.read
wallet.award
wallet.manage_rewards
wallet.resolve_requests
apps.read
apps.configure
content.read
content.manage
progress.read
billing.read
billing.manage
```

The API must enforce capabilities. Client-side hiding is not sufficient.

## Plan enforcement

Plan limits are resolved through entitlements, not role names.

Examples:

```text
spaces.home.max = 1
kids.home.max = 4
members.home.max = 3
devices.max = 10
spaces.classroom.enabled = false
wallet.automation.enabled = false
reports.advanced.enabled = false
```

The server checks entitlements during mutation. Tiko Manage may show upgrade UI before attempting a blocked action, but the backend remains authoritative.

## Migration from Profile Manager

Recommended migration:

1. Keep existing account types and endpoints operational during transition.
2. Create a Home space for every existing Profile Manager.
3. Add the manager as owner.
4. Convert each managed Child Account into a Managed Kid plus KidSpaceMembership.
5. Convert manager relationships into memberships.
6. Preserve existing kid subject IDs and sessions where possible.
7. Add compatibility adapters for old child-account endpoints.
8. Move clients to Spaces/Kids APIs.
9. Deprecate admin-only Profile Manager promotion.
10. Remove legacy endpoints only after all clients migrate.

## Data ownership and deletion

- A kid identity is not owned by a physical device.
- Removing a device revokes access but does not delete data.
- Removing a kid from one space does not necessarily delete the kid identity if other memberships exist.
- Deleting a Home space must define handling for kids with no remaining space.
- Organisation deletion must not silently orphan kids or memberships.
- Wallet ledger and subscription records follow their own retention policies.

## TikoAppKit responsibilities

TikoAppKit/TikoKit should expose shared clients and state for:

- available spaces
- active space
- active kid
- device assignment
- session type
- resolved capabilities
- entitlements
- pairing deep links
- adult grants

Apps should not implement custom pairing, membership, or entitlement logic independently.

## Acceptance criteria

- Any verified adult can create a Home space.
- Authorised Home members can create kids within plan limits.
- A kid is a separate subject with no email or adult UI.
- A QR token can pair a device to one kid.
- The token expires and cannot be reused.
- The paired device opens all Tiko apps in Child Mode for that kid.
- Revoking the assignment invalidates access without deleting kid data.
- Adult actions inside kid apps require a valid scoped grant.
- Teachers and therapists receive capabilities through space roles.
- Plan limits are enforced server-side through entitlements.
- Existing Profile Manager data can migrate without changing kid subject ownership.

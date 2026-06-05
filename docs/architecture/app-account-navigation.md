# Tiko app account navigation and parent/child mode

This is the shared app contract for Tiko account navigation across iOS and web. The platforms use different UI systems, but the navigation items, labels, and flows must match. If a behavior changes, update the shared contract first and then bring both platform implementations back into parity.

## Shared principle

The account/avatar control is not an app-specific settings shortcut. It is the shared caregiver/account surface in every Tiko app shell.

Each platform should feel native to its implementation system, but it must expose the same concepts:

- the same header affordances;
- the same account menu items;
- the same parent/child mode transitions;
- the same profile/setup-user flow;
- the same no-password, no-login-wall identity doctrine.

## Required header behavior

Every Tiko app shell exposes:

- **Settings** — parent-mode only. Opens the shared settings surface.
- **Account** — always visible as the user/avatar button.
- **App actions** — app-specific actions such as History, Edit, Add, or Manage. These are shown only when appropriate for parent mode.

In child mode:

- parent-only actions are hidden;
- the Settings affordance is hidden;
- the Account button remains visible so a caregiver can return to parent mode.

## Account button flow

When the app is in parent mode, tapping/clicking the Account avatar opens the shared profile menu.

The profile menu items are always:

1. **Profile** — opens the shared account/profile setup surface.
2. **Child mode** — switches the app into child mode. If no parent PIN exists yet, the app first opens the shared create-PIN flow.
3. **Log out** — clears the current device/session and returns to the default device-user state.

Do not replace **Log out** with **Log in** in one platform. Tiko apps bootstrap a device session and do not use login-first navigation.

When the app is in child mode, tapping/clicking the Account avatar opens the parent PIN entry surface. A valid PIN returns to parent mode.

## Shared settings surface

Settings always includes the shared Tiko section:

- **Account** — opens the same account/profile surface as the Profile menu item.
- **Language**.
- **Color mode**.

Apps may inject app-specific settings below the shared section, but they must not duplicate or fork the global account/language/color-mode UI.

## Shared profile/setup surface

The Profile flow follows Tiko identity doctrine:

- no password UI;
- no login wall;
- apps open immediately as device users;
- the first explicit account action is setup user: name first, email for recovery/transfer;
- recovery uses magic links/OTP with generic responses;
- a recoverable user means email exists and is verified.

The profile surface may also expose account-owned app profile fields such as avatar, display name, and favorite color. Those fields belong in shared account/profile UI, not in per-app copies.

## Parent PIN storage contract

The parent PIN hash must be shared across native and web clients through the identity profile API:

- `GET /v1/identity/profile` returns `{ profile }`.
- `PUT /v1/identity/profile` merges profile fields.
- `profile.parentCodeHash` stores the SHA-256 hash from the shared parent-PIN flow.

Do not store `parentCodeHash` only in platform-local storage. Local state may remember whether the current device is in parent or child mode, but the PIN hash belongs on the identity subject profile.

## Platform implementation mapping

- iOS: `packages/tikokit-ios` owns `TikoAppShell`, `TikoProfileMenuSheet`, settings sheets, account/profile sheets, and parent PIN sheets.
- Web: `packages/ui` owns `TikoAppShell`, `TikoProfileMenu`, `TikoPinPopup`, and shared shell/header behavior.
- App code should only pass app identity, app color, app-specific actions, and app-specific settings content.

## Parity checklist

For every app and platform:

1. Keep the shared shell; do not build an app-local header.
2. Account avatar opens the profile menu in parent mode.
3. Account avatar opens parent PIN entry in child mode.
4. Profile menu items are exactly: Profile, Child mode, Log out.
5. Settings includes Account, Language, and Color mode.
6. Parent-only actions are hidden in child mode.
7. Parent PIN hash is loaded from and saved to identity profile data.
8. Regression tests or platform smoke checks cover the account avatar path and child-mode return path.

## Visual rule

Match the iOS sheet/menu structure and spacing as closely as the platform allows. Web should look like the same Tiko product built with web components, not a different navigation model. Use shared Tiko UI components and open-icon icons; do not use emoji glyphs or per-app hardcoded account menus.

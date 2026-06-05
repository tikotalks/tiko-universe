# Tiko web app account menu and parent/child mode

All Tiko web apps should mirror the shared native iOS `TikoAppShell` account behavior. The account/avatar control is not an app-specific settings shortcut; it is the shared caregiver/account surface.

## Required behavior

- The app header uses the shared `TikoAppShell` account avatar (`avatar="ui/avatar"`) and labels the button `Account`.
- In parent mode, tapping the avatar opens the shared profile menu as a centered, rounded, iOS-style popup.
- The profile menu offers:
  - **Profile** — opens the shared account/profile sheet.
  - **Child mode** — switches the app into child mode; if no parent PIN exists yet, first creates the PIN.
  - **Log out** — clears the current device/session.
- In child mode:
  - Parent-only header actions, including settings and management buttons, are hidden.
  - Tapping the avatar opens the parent PIN entry popup.
  - A valid PIN returns the app to parent mode.
- Apps still open directly into their child-facing core flow. There must be no login wall, onboarding wall, or password flow before use.

## State and storage contract

- Parent mode defaults to `true` for a new session so caregivers can configure the app immediately.
- The parent PIN hash is shared across web and native clients via the identity profile API:
  - `GET /v1/identity/profile` returns `{ profile }`.
  - `PUT /v1/identity/profile` merges profile fields.
  - `profile.parentCodeHash` stores the SHA-256 hash from `TikoPinPopup`.
- Do **not** store `parentCodeHash` only in `localStorage`; native apps need the same code.
- Local app state may remember the current parent/child mode for the browser session, but the PIN itself belongs on the identity subject profile.

## Shared implementation pieces

- `packages/ui/src/TikoProfileMenu.vue` owns the shared iOS-style avatar menu look and menu labels.
- `packages/ui/src/TikoPinPopup.vue` owns parent PIN create/verify UX.
- `packages/ui/src/index.ts` exposes `TikoAppShell`/`TikoAppHeader` with `showSettingsButton` so child mode can hide parent-only header actions without replacing the shared shell.
- Each app wires the same high-level flow; app-specific code should only decide which app settings/actions are hidden in child mode.

## App integration checklist

For every Tiko web app:

1. Keep the shared shell; do not build a local header.
2. Pass `avatar="ui/avatar"` to `TikoAppShell`.
3. Provide `popupService` at app bootstrap and render `<Popup />` once in the app shell/content.
4. Load `parentCodeHash` from `identityClient.getProfile(sessionToken)` after identity bootstrap.
5. Use `TikoProfileMenu` on avatar click while in parent mode.
6. Use `TikoPinPopup` for parent PIN setup and unlock.
7. Hide settings/manage/history actions that should be parent-only when `parentMode === false`.
8. Add a regression test that clicking the avatar opens `TikoProfileMenu`, not the app settings panel.

## Visual rules

- Match native iOS sheet feel: centered modal, large rounded corners, soft translucent surface, large rows, app-friendly spacing.
- Use `@sil/ui`/open-icon icons, not emoji glyphs.
- Do not override `@sil/ui` internal classes from app CSS. If the shared menu needs visual changes, fix `TikoProfileMenu` in `@tiko/ui`.

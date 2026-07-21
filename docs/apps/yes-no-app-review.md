# Yes No — App Store review notes

Submission ID: `52bd80b3-0b8d-4a88-84e7-f8970719f5d6`
Reviewed build: 1.0 (2) — iPad Air 11-inch (M3), iPadOS 26.5
Rejection: Guideline 2.1(a) — "reverted back to previous page after inputting an email address; unable to login."

## Root cause

The account/sign-in sheet (`tikoAccountPopup` in TikoKit) used the default popup
config with `dragToDismiss(true)` + `closeOnTapOutside(true)` + `useKeyboardSafeArea(true)`.
On iPad, when the email keyboard appears the popup shifts, and any drag or outside
tap dismisses it → `isPresented = false` → the reviewer lands "back on the previous
page," which looks like login is broken. This is an iPad-only UX bug, not a real
auth failure.

Sign-in is **optional** — Yes No is device-first, so the app is fully usable without
an account. The email + OTP flow only verifies an email so the account can be
recovered across devices. Any email the user controls works; an account is created
automatically (no password, no pre-registration) and is deletable from
Account → Delete account.

## Fix shipped

- `packages/tikokit-ios/Sources/TikoKit/TikoPopupSheets.swift`
  - `tikoPopup` gained a `dismissible` flag (default `true`).
  - `tikoAccountPopup` passes `dismissible: false` — the account/login sheet can no
    longer be dismissed by drag or outside-tap; only via the explicit Close / Skip /
    Sign-out buttons. Fixes the iPad dismissal. Logout/delete remain gated behind
    Account → Account actions, so nothing destructive becomes easier for kids.
  - New `signInHelp` copy under the email field (EN + MT): "Use any email address —
    your account is created automatically, and you can delete it afterwards."
- `apps/yes-no/ios/Sources/Info.plist` — `CFBundleVersion` bumped to `3`.

Regenerate before archiving: `cd apps/yes-no/ios && xcodegen generate`.

## Reviewer reply (App Store Connect)

> Thanks for the detail. This is fixed in the next build: on iPad the sign-in sheet
> was dismissing when the keyboard appeared (the "reverted back" behavior).
>
> Note that sign-in is optional — Yes No is device-first, so the app is fully usable
> without an account. To test sign-in: tap the avatar → Profile → enter any email you
> can access → enter the 6-digit code from that inbox (an account is created
> automatically, no password). It can be removed via Account → Delete account.

## App Review Information notes (submission field)

> Sign-in is optional; the app works fully as a guest. To test: avatar → Profile →
> any email you own → enter the 6-digit code emailed to that inbox. Account is
> created automatically and deletable from Account → Delete account.

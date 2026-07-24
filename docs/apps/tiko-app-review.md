# Tiko apps — shared App Store review notes & account model

One source of truth for **every** Tiko app (Yes No, Talk, Radio, Cards, Timer,
Type). All Tiko apps share the same TikoKit account/parent-mode system, so the
same reviewer explanation applies to each. Per-app submission notes live in
`_appstore/metadata/<app>/ios/review_information/notes.txt` and should be kept in
sync with the "Reviewer notes" block at the bottom of this file.

The recurring App Review risk for these apps is a **misunderstanding of the
account system** (e.g. the 2.1(a) "reverted back after inputting an email"
rejection on Yes No). This document exists so that never happens again.

---

## 1. What the apps are

Tiko is a family of simple, single-purpose, child-friendly apps. Each does one
calm thing well:

| App    | What it does |
|--------|--------------|
| Yes No | A yes/no communication & decision board for kids and AAC-style use. |
| Talk   | Tap words/tiles to build spoken sentences (assistive communication). |
| Radio  | A kid-safe collection player for songs/stories (YouTube-backed tracks). |
| Cards  | Simple picture/word cards for learning and communication. |
| Timer  | A friendly visual timer for routines and transitions. |
| Type   | A gentle early-typing / text playground. |

Every app is **fully usable on-device with no account, no sign-up, and no
network** — a guest can open the app and use its core features immediately.

## 2. The account system is OPTIONAL and privacy-first

This is the single most important thing for a reviewer to understand:

- **By default there is no account and nothing is collected.** No email, no
  password, no name, no personal data is required to use any Tiko app. The app
  is device-first; a guest gets the full experience.
- **The only reason an account exists at all** is so a user who *chooses* to can:
  1. **Recover their data across devices**, and
  2. **Recover their PIN** if they forget it (see Parent/Child mode below).
- **Signing in requires only an email you control** — no password. The user
  enters any email, receives a 6-digit code in that inbox, and an account is
  **created automatically** on first verification. There is no pre-registration.

If we did not need PIN/data recovery, we would not ask for an email at all. That
is the whole design philosophy: privacy by default, email only as an opt-in
recovery key.

### How a reviewer tests sign-in
1. Tap the account avatar (top-right) → **Profile**.
2. Enter **any email address you control**.
3. Enter the **6-digit code** emailed to that inbox.
4. You are signed in — no password, account created automatically.

The sign-in sheet is intentionally **non-dismissible** by drag or outside-tap
(only the explicit Close / Skip buttons dismiss it). This is deliberate: on iPad
the previous behaviour let the keyboard's appearance dismiss the sheet, which
looked like "the app reverted back / login is broken." It is fixed and it is
not a bug — it is the fix.

## 3. Parent mode vs Child mode — kids cannot remove themselves

- Apps start in **Parent mode**. A parent can set a **PIN** and enable
  **Child mode**.
- In **Child mode**, settings, the account panel, and every destructive action
  (sign out, delete account, delete/reset data) are **hidden and unreachable**.
  A child **cannot** change settings, sign the account out, delete the account,
  or remove themselves.
- **Leaving Child mode back to Parent mode requires the PIN.** A child cannot
  exit on their own.
- Enabling Child mode requires a **verified email** first — specifically so a
  parent can recover the PIN if they forget it. This is the one place email is
  gently encouraged, and only for the parent's benefit.

Implementation: `parentMode = !isChildMode`; in `TikoAppShell` the header
actions and settings button are only rendered when `parentMode` is true, and
child-mode entry/exit is gated by `TikoParentCodeEntrySheet` (PIN).

## 4. Account deletion works, in-app, and is done correctly

App Store Guideline 5.1.1(v) — account deletion is fully supported in every app.

- **Where:** account avatar → **Account actions → Delete account** (Parent mode
  only — a child cannot reach it).
- **Flow:**
  1. A **one-time code is emailed to the signed-in address** to re-verify the
     user actually controls that inbox.
  2. The user enters the 6-digit code.
  3. The account is deleted **server-side** (`createDeletionRequest(scope:
     .account)` against the identity API).
  4. The **local session is cleared only after the server confirms** deletion,
     and the host app then wipes its own local data (`onAccountDeleted`).
- **Why the order matters:** we never sign the user out while the account still
  exists server-side — that "fake delete" is exactly what reviewers reject.
  Deletion is real and server-side.
- **Guest users** have no server account; their data is entirely local and is
  cleared through the same Account actions (local-device scope).
- **Scopes supported:** whole `account`, `localDevice` (guest/local data), and
  `childAccount` (a parent removing a child) — plus non-destructive
  data **reset**.

Code: `TikoKit/TikoPopupSheets.swift` → `sendDeletionCode` →
`confirmDeletionWithCode` → `performAccountDeletion`; client in
`TikoKit/TikoIdentity.swift` (`createDeletionRequest`, `deleteSelf`,
`deleteChildAccount`, `resetAccountData`).

## 5. Data & privacy summary (for App Privacy answers)

- No account, email, or personal data required to use the app.
- Email is collected **only if the user opts into recovery / parent mode**, and
  is used solely to send the sign-in / recovery / deletion one-time codes.
- No password is ever stored (OTP-only).
- Users can delete their account and data in-app at any time (section 4).

---

## Reviewer notes (paste into App Store Connect → App Review Information → Notes)

> This app is fully usable with **no account** — open it and use it as a guest,
> no sign-up, no network needed.
>
> **Sign-in is optional and passwordless.** To test: tap the avatar → Profile →
> enter any email you control → enter the 6-digit code emailed to that inbox. An
> account is created automatically (no password). The only purpose of an account
> is to recover data across devices and to recover a forgotten parent PIN.
>
> **Delete account:** avatar → Account actions → Delete account. A one-time code
> is emailed to confirm, then the account is deleted server-side and local data
> is wiped. (Guest users have only local data, cleared the same way.)
>
> **Parent/Child mode:** the app starts in Parent mode. A parent can set a PIN
> and enable Child mode, in which settings and all account/destructive actions
> are hidden — a child cannot change settings, sign out, or delete the account.
> Returning to Parent mode requires the PIN.

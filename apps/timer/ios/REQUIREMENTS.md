# Tiko Timer — Requirements & Test Coverage

Tiko Timer is a simple visual countdown timer for young children. Its core job is
to show a big countdown **ring** with the remaining time, started from one of a
few **quick presets** (1 / 3 / 5 / 10 minutes) or a custom duration, with
**pause / resume / reset** controls. **The app must be fully usable without an
account; login is optional.**

This document is the requirements-based test spec that the pilot XCTest /
XCUITest suite verifies. Each requirement notes how it is covered:

- **[unit]** — covered by an XCTest unit test in `Tests/TikoTimerTests.swift`
- **[ui]** — covered by an XCUITest in `UITests/TikoTimerUITests.swift`
- **[manual]** — not yet automated (documented gap)

The timer *logic* lives in a pure, deterministic engine, `TimerEngine`
(`Sources/TimerEngine.swift`), which the SwiftUI `TimerView` renders. Every
time-dependent method takes an explicit `now: Date`, so the countdown behaviour
is unit-testable without waiting on the wall clock.

## Launch & usability without an account

1. On launch the app shows the countdown timer (ring + `mm:ss` display) and the
   quick-preset buttons, without any account, sign-in or network being required.
   **[ui]** (`testAppIsUsableWithoutLogin`)
2. Selecting a preset starts the countdown with no account required. **[ui]**
   (`testSelectingPresetStartsCountdown`)
3. Selecting a preset switches the UI into the running state — a **Pause** and a
   **Reset** control appear and the preset grid hides. **[ui]**
   (`testSelectingPresetStartsCountdown`)

## Presets & starting

4. The app offers exactly the **1 / 3 / 5 / 10 minute** presets, in that order,
   and selecting one starts a countdown of that exact duration. **[unit]**
   (`testPresetCatalogIsOneThreeFiveTenMinutes`, `testSelectingPresetStartsThatDuration`)
5. Before anything is started the timer is **idle**: nothing is counting, the
   ring is empty and the display reads `00:00`. **[unit]** (`testFreshEngineIsIdle`)
13. A **custom** duration (minutes + seconds) can be started; a zero-length
    custom start is ignored, and any non-positive duration never starts a run.
    **[unit]** (`testStartCustomDurationAndZeroGuard`, `testStartIgnoresNonPositiveDuration`)
    **[manual]** (custom-duration picker UI)

## Countdown behaviour

6. While running, the remaining time counts down as real time advances and is
   clamped to zero (never negative) once the target passes. **[unit]**
   (`testRemainingCountsDownAndClampsAtZero`)
7. The countdown ring fills from **0 → 1** across the run, clamped to `0...1`,
   and is 0 while idle. **[unit]** (`testProgressGoesZeroToOne`, `testProgressIsZeroWhenIdle`)
8. The remaining time is shown as a zero-padded **`mm:ss`** string. **[unit]**
   (`testDisplayTimeFormatting`)
11. When the countdown reaches zero the timer transitions to an **expired**
    state exactly once; progress pins to 1 and the display reads `00:00`.
    **[unit]** (`testExpiresWhenCountdownReachesZero`) **[manual]** (completion
    sound / haptic — audio asset TODO in `TimerView`)

## Pause / resume / reset

9. **Pause** freezes the remaining time; it does not keep counting down while
   paused, regardless of how much real time passes. Pause is a no-op unless the
   timer is running. **[unit]** (`testPauseFreezesRemaining`, `testPauseResumeGuards`)
10. **Resume** continues from the frozen remaining time, re-anchored to the
    moment of resume (the paused interval is not counted). Resume is a no-op
    unless paused. **[unit]** (`testResumeContinuesFromFrozenRemaining`,
    `testPauseResumeGuards`)
12. **Reset** returns the timer to idle from any active state (running, paused
    or expired), clearing the run. **[unit]** (`testResetReturnsToIdle`)

## Persistence

14. The current run is persisted and restored across app launches: a still-future
    running timer restores as running with the correct remaining time; an
    already-elapsed running timer restores as expired; a paused timer restores
    paused with its frozen remaining time; idle/unknown restores to idle.
    **[unit]** (`testRestoreRunningStillInFuture`,
    `testRestoreRunningAlreadyElapsedBecomesExpired`, `testRestorePausedAndIdle`)

## Account is OPTIONAL (the App Review fix)

15. The app is fully usable without an account — the timer runs with no login.
    **[ui]** (`testAppIsUsableWithoutLogin`)
16. Login is optional and reachable from the account menu (email + one-time
    code). A **"Skip for now"** action dismisses the login popup and returns the
    user to the working app. **[ui]** (`testSkipForNowReturnsToUsableApp`)
17. **REGRESSION (App Review 2.1 — "app reverted back after inputting an
    email"):** the account/login popup must be **non-dismissible** by the
    keyboard, an outside tap, or a drag. Opening the login popup, tapping the
    email field and typing an email must **NOT** dismiss the card — it stays
    present so the user can finish signing in. This is the shared TikoKit
    regression, verified per-app. **[ui]** (`testLoginPopupSurvivesEmailInput`)

## Settings, language, appearance, lifecycle

18. A completion sound can be toggled in settings. **[manual]**
19. Language is selectable and drives localisation of the app name and preset
    labels. **[manual]**
20. Colour mode (system / light / dark) is selectable via the shared shell. **[manual]**

---

### Coverage summary

- **Unit (XCTest):** requirements 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 — the
  full `TimerEngine`: preset catalog, countdown math, ring progress, `mm:ss`
  formatting, the idle → running → paused → running → expired state machine, the
  reset/custom-start guards and persistence/restore.
- **UI (XCUITest):** requirements 1, 2, 3, 15, 16, 17 — launch usability without
  an account, selecting a preset to start the countdown, "Skip for now", and the
  shared non-dismissible login-popup regression.
- **Manual / not yet automated:** 11 (sound/haptic), 13 (custom-picker UI), 18,
  19, 20. These need additional coverage in future iterations.

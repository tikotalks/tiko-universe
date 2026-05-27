# Identity Architecture

## States

1. **Device user**
   - Created automatically.
   - No email.
   - No password.
   - Can use apps immediately.

2. **Recoverable user**
   - Same user after caregiver attaches/verifies email.
   - Can receive magic links.
   - Can transfer/recover to another device.

3. **Linked device user**
   - Existing recoverable user linked to another device after magic-link verification.

## D1 tables, initial shape

- `users`
- `devices`
- `sessions`
- `magic_links`
- `user_profile_events`

## Security rules

- Store session and magic-link tokens as hashes.
- Magic-link request responses must be generic.
- Rate-limit email/magic-link requests.
- Native clients use bearer session tokens.
- Web clients may use HttpOnly Secure cookies plus explicit session bundle storage when needed.
- Do not create passwords.

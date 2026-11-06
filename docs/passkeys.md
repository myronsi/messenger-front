# Passkey sign-in

The sign-in page offers passkeys in two ways: the "Sign in with a passkey" button, and browser autofill on
the username field (`autocomplete="username webauthn"`). The code is in
`src/features/auth/components/PasskeySignIn.tsx` and `src/shared/api/passkeys.ts`.

## Autofill and the server challenge

Autofill starts a conditional WebAuthn request when the page opens. Its server challenge expires after
five minutes (backend `BeginPasskeyLogin`), and browsers usually keep a conditional request open longer than
that. So the page restarts the autofill request every four minutes, each time with a new challenge.

When the server rejects a passkey picked from autofill, the page shows the passkey error and starts a new
autofill request. A failed options request or a cancelled ceremony shows nothing and does not retry, so a
backend without passkeys does not cause a request loop.

## Known limitation

If the user picks a passkey in the moment the four-minute restart happens, the restart cancels that sign-in
and nothing is shown. Autofill is already listening again, so picking the passkey a second time works. The
button flow is not affected: the restart waits while a button sign-in is running.

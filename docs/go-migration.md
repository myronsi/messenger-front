> Historical record: the Go migration is complete and Python has been retired. Use the current Go deployment and backend startup scripts.

# Go backend staging

Set `VITE_BASE_URL=https://staging.messenger.viserix.com/api/v2` and
`VITE_WS_URL=wss://staging.messenger.viserix.com` when building the staging frontend.
The transport selects Go when the API base ends in `/api/v2`; other bases retain
the Python behavior for rollback.

`shared/api/goTransport.ts` translates screen requests into the v2 contract and
maps responses into the existing screen models. It covers profiles, security,
privacy, user lookup, blocks, chat lists, chat creation, groups, message history,
media and search. HTTP errors are preserved so session refresh still works.
Uploads first create an attachment, then send the attachment ID to the chat.
Avatar changes use the same two-step process with `purpose=avatar`.

The WebSocket uses a one-time ticket at `/api/v2/ws`. Outgoing events carry
`chat_id`, `client_temp_id` and nested `data`. Incoming global events are filtered
by chat. The first connection catches up after history loading to close the
snapshot/subscription gap. Live messages survive a stale history response.

Server IDs remain strings throughout links, state, caches and events. Negative
numeric IDs are only local optimistic messages; zero represents a draft chat.
Comparisons use BigInt without rounding Snowflake IDs. Protected media is fetched
with authentication and displayed with temporary object URLs. Tokens are never
added to media URLs or sent to external media hosts.

Run these checks before deploying:

```sh
npm run typecheck
npm run lint
npm run check:contract
npm test
npm run build
npx playwright test --config playwright.staging.config.ts
```

The staging browser suite creates synthetic accounts. It checks registration,
logout/login, direct-chat creation, realtime delivery, upload/download, profile
and avatar updates, privacy settings, sessions, groups and blocking. Do not point
this suite at production.

For repeated settings checks, existing synthetic fixtures can be supplied with
`GO_TEST_USER_A`, `GO_TEST_PASSWORD_A`, `GO_TEST_USER_B`, and `GO_TEST_PASSWORD_B`.
This avoids exhausting registration limits. Keep those values outside the repo.

`go-permissions.spec.ts` checks member/admin/owner transitions and both history
paging directions through the screen transport. `go-security.spec.ts` uses
`GO_SECURITY_FIXTURE`, a path outside the repo containing a dedicated test
account's `username` and `password`. Start with 2FA disabled. The test saves its
new setup secret privately in that fixture for cleanup if interrupted. It waits
for fresh authenticator time steps because Go rejects reused TOTP codes.

The staging API trusts only its local proxy gateway (`172.21.0.1/32`), with the
published port bound to `127.0.0.1`. Without `TRUSTED_PROXIES`, all clients share
the Docker gateway's authentication rate-limit bucket. Determine the actual
gateway for other deployments rather than copying this address blindly.

The production database rehearsal was validated separately. Production still
needs a fresh consistent migration snapshot at cutover because Python continues
accepting writes. Staging API checks passed for TOTP, single-use backup codes,
challenge/code replay protection, group roles and permissions, older/newer/around
history paging, and multi-page image media. A modest five-client read check
completed 60 requests without errors (p95 approximately 420 ms from the test
client); this is not a capacity or peak-load certification.
Browser checks also passed for two-factor setup, backup-code login, disabling
2FA, and member/admin/owner changes plus bidirectional history through the screen
transport. Typecheck, lint (existing warnings), build and 168 unit tests passed.

## Recovery keys

The recovery backend is implemented in messenger-back PR #131 (API 2.1.0-alpha.1).
New registrations show a one-time recovery key with an explicit save acknowledgement.
Existing accounts without a key get a setup prompt and can enroll in Security & devices
using their current password and 2FA when enabled. The forgot-password screen uses the
key plus an authenticator/backup code when required and shows a replacement key after
success. Recovery signs out other sessions and delays security-method changes for 24 hours.
Keys stay in component memory and are never written to browser storage.

`go-recovery.spec.ts` verifies registration, saving the key, password reset, a second
live browser receiving the security notice and being signed out, key replay and old
password/session rejection, and the security-delay display. Its optional enrollment
case requires GO_LEGACY_USERNAME and GO_LEGACY_PASSWORD for an existing synthetic
account that has not enrolled yet. The fixture is enrolled by the test; use a fresh
unenrolled fixture when repeating that case. Never run these tests against production.

The old Shamir shares are retained in the database but are not accepted by the new
key endpoint; the old recovery endpoint remains 501. Agree on and communicate the
existing-user recovery transition before production cutover. Publish/review the new
API contract, finish review of both draft PRs, and take a fresh consistent production
snapshot with a rollback window. The Go UI offers member and admin roles; the contract
has no moderator role. Production continues to run Python.

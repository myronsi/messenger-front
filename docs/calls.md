# Audio calls

One-to-one and group audio calls for the web app and the installed PWA. Audio is end-to-end encrypted: the media
server (LiveKit) and the API only relay encrypted frames and sealed keys. Backend behaviour and the encryption design
are in the backend docs: [calls.md](https://github.com/myronsi/messenger-back/blob/master/docs/calls.md) and the ADR
[calls-e2ee.md](https://github.com/myronsi/messenger-back/blob/master/docs/calls-e2ee.md).

## What users see

- A phone button in the header of a direct chat or group, when `GET /calls/config` says calls are enabled, the browser
  can encrypt calls and the app does not run in the Capacitor shell.
- An "Ongoing call · Join" bar in a chat whose call is running.
- An incoming call card (caller or group, people in the call, Accept / Decline, ring countdown, a short ring tone in a
  visible tab). Escape declines.
- A call panel that stays open while you move between chats: participants, mute, microphone and (where the browser
  supports `setSinkId`) audio output, duration, reconnecting and poor-network state, encryption status, the security
  code with a "mark as verified" switch, Leave, and End for everyone (group calls, for the initiator and the group
  owner, admins and moderators; in a direct call Leave already ends it for both).
- A `call` system message in the timeline: "Call · 3:12", "Missed call", "No answer", "Cancelled call", and so on.
- Privacy → Calls → "Allow calls" (`calls_enabled`), shown when calls are enabled on the server.

## Files

| Path | Purpose |
|---|---|
| `src/features/calls/api/callsApi.ts` | Typed client for the `calls` endpoints |
| `src/features/calls/model/callState.ts` | Pure call reducer: keep the highest `version`, roster, ringing calls |
| `src/features/calls/model/stores.ts` | Calls, session and config stores |
| `src/features/calls/model/callController.ts` | Start, join (with takeover), decline, leave, end, reconnect, ownership loss |
| `src/features/calls/model/callSync.ts` | `call_updated` / `call_keys` events, `GET /calls` and a key catch-up after every socket (re)connect, logout cleanup |
| `src/features/calls/model/tabOwnership.ts` | One media owner per browser (Web Locks + BroadcastChannel) |
| `src/features/calls/model/permissions.ts` | Who may end a call for everyone |
| `src/features/calls/crypto/*` | Identity keys (IndexedDB), HPKE sealing, security code, trust on first use |
| `src/features/calls/media/*` | Lazy chunk: LiveKit room, per-participant key provider, epoch key exchange |
| `src/features/calls/ui/*` | Call button, ongoing call bar, incoming card, call panel, provider |
| `public/notification-worker.js` | Call push (`type: "call"`, `ring` / `cancel`) |
| `e2e/smoke/go-calls.spec.ts` | Direct call with fake audio: audio both ways, mute, codes, encrypted frames, decline, missed |
| `e2e/smoke/go-calls-group.spec.ts` | Group call of three: key rotation on leave and rejoin, a revoked session leaves the room |
| `e2e/smoke/callHelpers.ts`, `e2e/smoke/livekitHelpers.ts` | Audio level, frame and transport probes; LiveKit room checks |

`livekit-client` and `@hpke/core` live only in the lazily loaded `callEngine` chunk, which is fetched when the user
starts or answers a call. The LiveKit encryption worker is emitted as `assets/livekit-client.e2ee.worker-*.js` on the
app origin and precached by the service worker; API and LiveKit requests are never cached.

## Encryption details

- Identity: one ECDH P-256 key pair per account and session, private key non-extractable, stored in IndexedDB
  (`messenger-calls` / `identities`). The public key (65-byte uncompressed point, base64url) is registered with
  `PUT /me/call-identity` before every join. Signing out deletes the stored identities.
- Per epoch: a random 32-byte sender key, sealed for every other joined session with HPKE Auth
  (DHKEM P-256/HKDF-SHA256, HKDF-SHA256, AES-128-GCM), `info = "messenger-call-key/v1"`,
  `aad = call_id|epoch|sender_session_id|recipient_session_id`, posted to `POST /calls/{id}/keys`. A `409 stale_epoch`
  reloads the call and moves straight to its epoch. The own key is installed (and the microphone unmuted) only after
  the server accepted the envelopes; until then the microphone track is disabled.
- Received envelopes are opened only for the current or previous epoch, only from a session on that epoch's roster
  with the roster's identity key. Keys of later epochs wait until the matching `call_updated` arrives.
- Catch-up: on every new epoch, after every realtime socket reconnect and after a LiveKit reconnect the client loads the
  stored envelopes with `GET /calls/{id}/keys`, so keys pushed while the socket was down are not lost.
- If the server holds an older identity key for this session, the client registers its key again; a failed attempt
  shows "keys could not be exchanged" and is retried on the next epoch.
- The security code is computed asynchronously; a result for an older epoch than the latest one seen is dropped.
- LiveKit uses a per-participant key provider (`sharedKey: false`, no ratchet), participant identity
  `<user_id>:<session_id>`, key index `epoch % 16`.
- Security code: `SHA-256("messenger-call-code/v1|<call_id>|<epoch>|<entries>")`, where the entries are
  `<user_id>|<session_id>|<hex SHA-256 of the raw identity key>`, sorted as strings and joined with `|`. The first
  24 bytes are read as six big-endian `uint32` values, each shown as `value mod 100000` with five digits.
- Trust on first use: the last seen identity fingerprint per `(user, session)` is kept in `localStorage`; a change shows
  a warning in the call panel.
- No fallback: a browser without encoded transforms (`isE2EESupported()` false) gets an upgrade message and never joins.

## Run it locally

1. Start the backend with calls enabled (`CALLS_ENABLED=true` and a local LiveKit, see the backend docs; the dev LiveKit
   listens on `ws://localhost:7880`, UDP 50000-50001 and TCP 7881, without TURN). The client takes the media URL from
   the grant, nothing is configured in the frontend.
2. `npm run dev` and open the app in two browser profiles (or one normal and one private window) with two users who
   share a direct chat. Microphone access needs `localhost` or HTTPS.
3. Press the phone button in the chat header, answer in the other window, open "Show security code" in both and compare.
4. Browser test: `npx playwright test e2e/smoke/go-calls.spec.ts e2e/smoke/go-calls-group.spec.ts` against the local
   stack. It uses Chromium's fake audio device and skips itself when `GET /calls/config` reports calls disabled. With
   `E2E_LIVEKIT_URL`, `E2E_LIVEKIT_KEY` and `E2E_LIVEKIT_SECRET` (the backend's `CALLS_*` values) it also checks the
   LiveKit room: tracks marked encrypted, a revoked session removed, foreign participants removed.

## Deployment

The nginx snippet `deploy/nginx/security-headers.conf` allows the LiveKit host in the Content Security Policy through
`$messenger_calls_host` and sends `Permissions-Policy` with `microphone=(self)`. Releases never install or reload this
snippet; update it on the server by hand as described in [releasing.md](releasing.md), defining the variable first.

## Browser support and limits

- Chrome / Edge, Firefox 117+, Safari 15.4+ (desktop and mobile), and the installed PWA. Everything else gets the
  upgrade message.
- Web only: the Capacitor app hides all call UI and does not receive call pushes.
- Ringing while the app is closed is best effort: the service worker shows one notification per call
  (`tag: call-<call_id>`, `requireInteraction` where supported) and closes it on `cancel` or when the ring expires.
  Because the browser may stop the worker before that timer fires, every later push and notification click also
  closes call notifications whose `expires_at` has passed.
  Opening it shows the chat, which loads the call again and offers Join only while it still runs.
- Audio output selection is shown only where the browser supports it (`setSinkId`); there is no speakerphone switch.
- One tab per browser owns the microphone; other tabs show "You are in a call in another tab". Joining from another
  device asks before moving the call (`takeover`).
- The update banner and the automatic reload after a stale chunk are held while a call runs.
- Encryption protects the audio, not who called whom and when, not a compromised device, and not malicious code from a
  compromised web origin. The design has not been externally audited.

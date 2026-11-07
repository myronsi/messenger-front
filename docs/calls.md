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
| `src/features/calls/model/callController.ts` | Start, join (with takeover), decline, leave, end, ownership loss |
| `src/features/calls/model/callRuntime.ts`, `callConnection.ts` | The one live engine, attempt tokens, engine events, reconnect with bounded retries |
| `src/features/calls/model/callSecurity.ts` | Security code per epoch and trust-on-first-use key change warnings |
| `src/features/calls/model/engineLoader.ts` | Lazy engine chunk import that is retried after a failed load |
| `src/features/calls/model/callSync.ts` | `call_updated` / `call_keys` events, `GET /calls` and a key catch-up after every socket (re)connect, logout cleanup |
| `src/features/calls/model/tabOwnership.ts` | One media owner per browser (Web Locks + BroadcastChannel) |
| `src/features/calls/model/permissions.ts` | Who may end a call for everyone |
| `src/features/calls/crypto/*` | Identity keys (IndexedDB), HPKE sealing, security code, trust on first use |
| `src/features/calls/media/*` | Lazy chunk: LiveKit room, per-participant key provider, epoch key exchange, microphone gate, remote audio filter |
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
  the server accepted the envelopes; until then the microphone is muted through LiveKit (`track.mute()`), so a
  track restart (device ended, default device changed, mobile re-acquisition) cannot send audio under the previous
  key. The user's own mute is kept apart from this gate.
- A failed key post is retried for the current epoch with backoff (1.5 s doubling, at most 30 s) with the same sender
  key until it is accepted or the epoch or call changes; the panel shows "keys could not be exchanged" meanwhile. A
  `409 stale_epoch` whose reload fails is retried the same way.
- Remote audio is played only for tracks LiveKit marks as encrypted, from a `<user_id>:<session_id>` on the current
  roster; other tracks are ignored and logged, and the check runs again on every roster change.
- Received envelopes are opened only for the current or previous epoch, only from a session on that epoch's roster
  with the roster's identity key. Keys of later epochs wait until the matching `call_updated` arrives.
- Catch-up: on every new epoch, after every realtime socket reconnect and after a LiveKit reconnect the client loads the
  stored envelopes with `GET /calls/{id}/keys`, so keys pushed while the socket was down are not lost, and posts its
  own key again if it is still missing for the current epoch.
- If the server holds an older identity key for this session, the client registers its key again; a failed attempt
  shows "keys could not be exchanged" and is retried on the next epoch.
- The security code is computed asynchronously; a result for an older epoch than the latest one seen is dropped, but
  key changes found for any epoch are always kept for the call.
- LiveKit uses a per-participant key provider (`sharedKey: false`, no ratchet), participant identity
  `<user_id>:<session_id>`, key index `epoch % 16`.
- Security code: `SHA-256("messenger-call-code/v1|<call_id>|<epoch>|<entries>")`, where the entries are
  `<user_id>|<session_id>|<hex SHA-256 of the raw identity key>`, sorted as strings and joined with `|`. The first
  24 bytes are read as six big-endian `uint32` values, each shown as `value mod 100000` with five digits.
- Trust on first use: the last seen identity fingerprint per `(user, session)` is kept in `localStorage`, written only
  after a change was recorded for the running call; a change shows a warning (`role="alert"`) in the call panel, also
  when it is minimized, like "keys could not be exchanged".
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
  (`tag: call-<call_id>`, `requireInteraction` where supported). Call pushes carry the chat in `call_chat_id`. Every
  accepted call push leaves a notification: when the ring expires, or on `cancel`, the ring is replaced under the same
  tag by a short "Missed call" / "Call ended" / "Answered on another device" notification (from the optional
  `reason`). Late or already-cancelled rings show that result instead of ringing. Later pushes and clicks also replace
  rings whose `expires_at` has passed. Opening one shows the chat in the running app without a reload; it loads the
  call again and offers Join only while it still runs. The calls config is retried with backoff and reloaded on every
  reconnect and when the tab becomes visible. A tab waiting on another tab's call notices when the browser frees the
  media lock (tab closed, reloaded or crashed).
- Audio output selection is shown only where the browser supports it (`setSinkId`); there is no speakerphone switch.
- One tab per browser owns the microphone; other tabs show "You are in a call in another tab". Joining from another
  device asks before moving the call (`takeover`).
- The update banner and the automatic reload after a stale chunk are held while a call runs (from the moment an
  engine exists): a stale chunk then offers the update banner for after the call, and a lazy page that fails to load
  falls back inside an error boundary instead of unmounting the app and the call panel.
- Encryption protects the audio, not who called whom and when, not a compromised device, and not malicious code from a
  compromised web origin. The design has not been externally audited.

## Joining, starting and reconnecting

- Starting a call takes the media lock, opens the microphone and registers the identity before `POST /chats/{id}/call`,
  so a denied or missing microphone never rings anyone. If the caller created the call (`201`) and its own join then
  fails or the takeover question is cancelled, it posts `leave`, which cancels the call.
- After a failed connect the client posts `leave` only while this session still holds the call; it never does after
  a takeover by another device, a removal or a local hang-up.
- Only one join or reconnect attempt runs per call. Engine events count only for the engine that is live, and a lost
  room is reported only after `connect()` resolved. A lost room is reconnected up to four times (after 0, 1, 3 and
  7 s), each time with a fresh grant, the newest stored call state and a new microphone track; the previous engine is
  disposed first. After that the panel offers Rejoin.
- "Default device" switches the microphone without an exact constraint (and audio output to `''`), so it works in
  Firefox and Safari; a failing switch shows a notice and falls back to the default microphone.

# Offline message database

Every message, photo, video and voice message the app loads stays on the device, encrypted, so chats can be read, scrolled and searched without a connection.

## Where the data lives

- One IndexedDB database per session: `messenger-offline-<hash of the session scope>`. Logging out, a remote sign-out or an account switch deletes it (`src/shared/offline/offlineSession.ts`).
- Stores: `messages` (key `[chatId, padded id]`, plus a `tokens` index for search), `chats` (when a chat was last opened), `media` (attachment files by URL, with the expiry the server allowed) and `meta` (keys and the sync cursor).
- Every message and file is encrypted with AES-GCM. The key comes from the server once per session (`POST /me/storage-key`). The app derives two keys from it (HKDF): one for the data, one HMAC key for search words. Both are kept as non-extractable `CryptoKey`s in the `meta` store, so the app starts instantly and works without a connection, while the raw key never stays on the device.
- Search words are stored only as HMAC hashes of their prefixes (2 to 10 characters), never as text.

## How data gets in

- `getMessageHistory` (`src/entities/message/api/messageApi.ts`) stores every page it loads, and the open chat is written again a moment after it changes (`useHistorySnapshotSync`).
- Media that `mediaCache` downloads is stored with the lifetime from `Cache-Control`. Videos and music that stream through a playback URL are downloaded once more in the background (`keepOfflineCopy`).
- The recent chats are prefetched after start (`usePrefetchRecentChats`).

## How it stays correct

- `GET /sync/changes` returns what changed since a cursor: edits and reactions (as the message's current state), deletions for everyone or only for me, pins, cleared histories and chats deleted for me. The app applies them on start, after every reconnect, and a moment after realtime events of any chat (`src/shared/offline/offlineSync.ts`). An old cursor answers `reset_required`, and the app drops what it stored.
- New messages are not in that log; they arrive with the next page load of the chat.
- Chats that are missing from the chat list (left, removed, deleted) are dropped (`usePruneOfflineChats`).
- Deletions and cleared histories in the open chat are mirrored at once (`offlineMirror.ts`).

## Without a connection

- When the server cannot be reached (network error, 502, 503 or 504), history pages and the in-chat search are answered from the database.
- The search in the chat list (all chats, media, links, files) shows device results first and adds server results when they arrive. Without the server it shows only device results with an "On this device" note.
- Recent searches are stored encrypted in the `meta` store (`sealed`); "Clear offline data" removes them too.
- History pages load with a remembered session even before a new access token exists.

## Storage limit

Settings > Data and storage shows the space used and sets the limit: 100 MB, 500 MB (default), 2 GB or no limit, per device. Above the limit, the least recently used media go first, then the chats that were opened longest ago. "Clear offline data" empties the database of this session.

## Not covered yet

- The chat list snapshot (`messenger-chat-snapshots`) and the persisted query cache (`messenger-query-cache`) are still stored without encryption.
- Opening a direct chat by link (`/dm/@name`) needs the network to resolve the name; opening it from the chat list works offline.

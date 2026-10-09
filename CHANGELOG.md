# Changelog

## [0.6.2](https://github.com/myronsi/messenger-front/compare/v0.6.1...v0.6.2) (2026-10-09)


### Bug Fixes

* **chat:** keep sockets across token refreshes and catch up after reconnects ([#110](https://github.com/myronsi/messenger-front/issues/110)) ([4d25ac0](https://github.com/myronsi/messenger-front/commit/4d25ac06559f3ef11e81564652b756ff3797a5b8))

## [0.6.1](https://github.com/myronsi/messenger-front/compare/v0.6.0...v0.6.1) (2026-10-09)


### Features

* **docs:** add public help page with what's new and upcoming features ([#108](https://github.com/myronsi/messenger-front/issues/108)) ([30c03a4](https://github.com/myronsi/messenger-front/commit/30c03a47b10644c5944797098ec5ccefc2880b84))

## [0.6.0](https://github.com/myronsi/messenger-front/compare/v0.5.0...v0.6.0) (2026-10-04)


### Features

* **api:** use the contract package and detect outdated clients ([#101](https://github.com/myronsi/messenger-front/issues/101)) ([86682c0](https://github.com/myronsi/messenger-front/commit/86682c0106a4d675fda79b0aa7cd92d491cb44ac))


### Bug Fixes

* **api:** pin the released contract 2.0.0-alpha.1 and backend v0.5.2 ([#107](https://github.com/myronsi/messenger-front/issues/107)) ([86f596f](https://github.com/myronsi/messenger-front/commit/86f596f662d9be341c45bfe988fed6f1c520380a))


### Miscellaneous Chores

* start the 0.6 release train ([#103](https://github.com/myronsi/messenger-front/issues/103)) ([7173179](https://github.com/myronsi/messenger-front/commit/717317998a5efb446ed2da9b36f97bb813653cab))

## [0.5.0](https://github.com/myronsi/messenger-front/compare/v0.4.7...v0.5.0) (2026-10-03)


### Bug Fixes

* accessibility - native context menu, reduced motion, aria-labels ([#90](https://github.com/myronsi/messenger-front/issues/90)) ([7f4c775](https://github.com/myronsi/messenger-front/commit/7f4c775c881b85ccbca2a7c95c605df9f2265ac0))
* remove console logging of message payloads ([#89](https://github.com/myronsi/messenger-front/issues/89)) ([4ab2da5](https://github.com/myronsi/messenger-front/commit/4ab2da56095eaf13802cb030486f2e152d987f34))
* restore original favicon and app icons ([#98](https://github.com/myronsi/messenger-front/issues/98)) ([5091c97](https://github.com/myronsi/messenger-front/commit/5091c976269a135e5ae47faa0b5b31e4b81127d5))


### Miscellaneous Chores

* release 0.5.0 ([#99](https://github.com/myronsi/messenger-front/issues/99)) ([5986626](https://github.com/myronsi/messenger-front/commit/5986626face84e2952216d7a778de229fc3919f0))

## [0.4.7](https://github.com/myronsi/messenger-front/compare/v0.4.6...v0.4.7) (2026-10-03)


### Features

* add PWA support and Capacitor mobile wrapper ([#86](https://github.com/myronsi/messenger-front/issues/86)) ([a6878e3](https://github.com/myronsi/messenger-front/commit/a6878e30701bd89f24294c2ee35ec259693802cd))

## [0.4.6](https://github.com/myronsi/messenger-front/compare/v0.4.5...v0.4.6) (2026-10-03)


### Features

* **chat:** use stored image dimensions and thumbnails ([bf68171](https://github.com/myronsi/messenger-front/commit/bf68171d657d05771c44216f52243db3c5c251ae))


### Bug Fixes

* **auth:** clear recovery share and cached data when the session ends ([7fe0bd6](https://github.com/myronsi/messenger-front/commit/7fe0bd6adfa539180e006c0ef17f229b0ee4556c))
* **auth:** clear recovery share and cached data when the session ends ([bdfa945](https://github.com/myronsi/messenger-front/commit/bdfa945a966485ac2b24db820ffde9ef5b576363))
* **chat-list:** stop unread counts drifting from the server ([f05d5b9](https://github.com/myronsi/messenger-front/commit/f05d5b9c8dc850984635c62c8d6f6d0e36dfc9f8))
* **chat-list:** stop unread counts drifting from the server ([3649205](https://github.com/myronsi/messenger-front/commit/3649205b1ca33e788b01c3d258eb5ff09e699e28))
* **chat:** make the scroll-to-bottom button reliable and accessible ([7e8a1cb](https://github.com/myronsi/messenger-front/commit/7e8a1cb5f85cb5296ee7a7c42a358c2191a7f979))


### Performance Improvements

* **audio:** keep playback progress inside the player and stop eager audio loading ([09c1882](https://github.com/myronsi/messenger-front/commit/09c1882142a335aa9af9c061655814c87b3b9677))
* **chat:** lazy-load message images and reserve their space ([57ef2f6](https://github.com/myronsi/messenger-front/commit/57ef2f6188969a5e03ca8a2639e3db226fa1b732))
* **chat:** memoize message items so an update re-renders only what changed ([eff47c5](https://github.com/myronsi/messenger-front/commit/eff47c51178fcc512538861870423b14d80c3b72))
* **chat:** memoize message items so an update re-renders only what changed ([8b19384](https://github.com/myronsi/messenger-front/commit/8b19384c68c4d669d8096bd33c45542a6026438e))
* **chat:** skip off-screen message rendering and cap loaded history ([7783b1e](https://github.com/myronsi/messenger-front/commit/7783b1e2846580ba97de40833a84429f9fafccec)), closes [#27](https://github.com/myronsi/messenger-front/issues/27)
* **chat:** throttle scroll work and pin to the bottom with ResizeObserver ([4527568](https://github.com/myronsi/messenger-front/commit/45275687d944d88a6added12aab01239207b6871))

## [0.4.5](https://github.com/myronsi/messenger-front/compare/v0.4.4...v0.4.5) (2026-10-03)


### Bug Fixes

* **security:** open WebSockets with a one-time ticket instead of the access token ([304785d](https://github.com/myronsi/messenger-front/commit/304785d0f6491c73c25fce1929fefed0cb472428))
* **security:** open WebSockets with a one-time ticket instead of the access token ([eaa9d6e](https://github.com/myronsi/messenger-front/commit/eaa9d6edcd101badd5c7b16bb90d56d183b5d84d))

## [0.4.4](https://github.com/myronsi/messenger-front/compare/v0.4.3...v0.4.4) (2026-10-02)


### Bug Fixes

* **auth:** disable auto-capitalisation of usernames on mobile ([c4e0733](https://github.com/myronsi/messenger-front/commit/c4e07338d3bfaf81fa07a7abd2330816c003afe2))
* **auth:** disable auto-capitalisation of usernames on mobile ([43f98cc](https://github.com/myronsi/messenger-front/commit/43f98ccc276f8c4d1b79b665d816f6bacda3ec20))
* **auth:** recover password with one user-held part ([6d4f011](https://github.com/myronsi/messenger-front/commit/6d4f0113ab3d21efc388db091b27642619d7fded))
* **auth:** recover password with one user-held part ([0a5574a](https://github.com/myronsi/messenger-front/commit/0a5574a086841baf19a69de62968191b6a5d7dec))
* **auth:** validate and lowercase usernames on registration ([1315b4d](https://github.com/myronsi/messenger-front/commit/1315b4d3dd9b76889d42aa20dfe466c8c53e8fa7))
* **auth:** validate and lowercase usernames on registration ([c33b3c1](https://github.com/myronsi/messenger-front/commit/c33b3c1e9df88d333c302e8ccb9b57a233294209))
* **group-chat:** mark group messages as read when they are viewed ([ac4a64e](https://github.com/myronsi/messenger-front/commit/ac4a64e1d2973c16e1c35ff3922121a761f00f0d))
* **group-chat:** mark group messages as read when they are viewed ([78390fb](https://github.com/myronsi/messenger-front/commit/78390fbb4625c01bb0e606d03a8414a65014d829))

## [0.4.3](https://github.com/myronsi/messenger-front/compare/v0.4.2...v0.4.3) (2026-10-02)


### Bug Fixes

* **chat:** make context menu delete button reliable ([4dada3e](https://github.com/myronsi/messenger-front/commit/4dada3ecb5064b4d87182e3da06c7116ba833509))
* **chat:** make the message context menu delete button reliable ([bc9c91a](https://github.com/myronsi/messenger-front/commit/bc9c91aa124e905bca89091be27adf355f3e0939))
* **chat:** share one message core between chat-room and group-chat ([adbcd34](https://github.com/myronsi/messenger-front/commit/adbcd34ba781a3aea2d20d600847a8105744a3cd))
* **chat:** share one message core between chat-room and group-chat ([851bc21](https://github.com/myronsi/messenger-front/commit/851bc2125fcdf3e7c15f41d56e45ba69da04c1f2)), closes [#26](https://github.com/myronsi/messenger-front/issues/26)

## [0.4.2](https://github.com/myronsi/messenger-front/compare/v0.4.1...v0.4.2) (2026-10-02)


### Bug Fixes

* resolve default and uploaded avatar URLs through one mediaUrl helper ([98696cb](https://github.com/myronsi/messenger-front/commit/98696cb304d7a1e458929ee37151fa9fdefab22a))
* resolve default and uploaded avatar URLs through one mediaUrl helper ([38d75f4](https://github.com/myronsi/messenger-front/commit/38d75f4b487b485a935a2ee320abbfc192d5b740)), closes [#35](https://github.com/myronsi/messenger-front/issues/35)
* show the user profile instead of a blank screen ([38f9028](https://github.com/myronsi/messenger-front/commit/38f9028a02c35b3e026da148af300e3a20844733))
* show the user profile instead of a blank screen ([a80a477](https://github.com/myronsi/messenger-front/commit/a80a47799b9a985477e6481704df9d13bb9f7e10))

## [0.4.1](https://github.com/myronsi/messenger-front/compare/v0.4.0...v0.4.1) (2026-10-02)


### Features

* **MSGC-22:** version the frontend and show versions in the app ([023d784](https://github.com/myronsi/messenger-front/commit/023d78441669e3b1a71c86cbae28b72415675535))
* **MSGC-22:** version the frontend and show versions in the app ([326db09](https://github.com/myronsi/messenger-front/commit/326db09a1a962e14abd511b49d33fe42008aa696))


### Bug Fixes

* **MSGC-40:** send credentials when fetching protected media ([f264572](https://github.com/myronsi/messenger-front/commit/f26457291ad747af72e9273064549221983e1f20))
* **MSGC-40:** send credentials when fetching protected media ([a086e52](https://github.com/myronsi/messenger-front/commit/a086e523f3a8ddfa97197ca3a150df3d1a935f37))

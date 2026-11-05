# Local API contract snapshot

The content-addressed archive contains `@myronsi/messenger-api@2.1.0-alpha.13` built from the
paired backend recovery changes. `package.json` retains an exact version pin; `package-lock.json`
resolves that version to this archive so clean installations and CI work before npm publication.
The archive contains the generated OpenAPI and WebSocket contract, with no environment files.

After the backend contract is published, install that exact registry version, regenerate the
frontend types, remove this temporary archive, and verify a clean installation and contract check.
The recovery frontend requires the corresponding backend endpoints and migrations 18–20.

# Versioning

Both repositories (`messenger-front`, `messenger-back`) follow [Semantic Versioning](https://semver.org/) and share one release train: for each release the frontend and the backend have the same `MAJOR.MINOR`, while `PATCH` is independent (release 0.5 = backend `0.5.0` + frontend `0.5.2`).

| Number | Where | Rule |
| --- | --- | --- |
| App version | git tags `vX.Y.Z`, GitHub Releases, `package.json` | SemVer; shown in **Profile → About** |
| API contract version | `@myronsi/messenger-api` (see [api-contract.md](api-contract.md)) | MAJOR = breaking change, MINOR = backwards-compatible addition, PATCH = docs and fixes |

Compatibility is decided by the API contract version, not by app versions. The baseline is `v0.4.0`.

## Commits and releases

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(chat): …`, `fix(auth): …`, `feat(api)!: …` or a `BREAKING CHANGE:` footer.
- Merge pull requests with **squash**; the PR title becomes the commit message and is checked by the `PR title` workflow.
- [release-please](https://github.com/googleapis/release-please) (release type `node`) keeps a release PR open with the changelog. Merging it creates the tag, the GitHub Release and attaches the built `dist/` archive.
- While the version is `0.x`, `bump-minor-pre-major` and `bump-patch-for-minor-pre-major` are enabled: breaking changes bump MINOR, features and fixes bump PATCH.
- To start a new release train (for example `0.6`) so that `MAJOR.MINOR` matches the backend, add a `Release-As: 0.6.0` footer to a commit:

  ```
  chore: start the 0.6 release train

  Release-As: 0.6.0
  ```

## Milestones

Both repositories use the same milestones: `0.5`, `1.0` and `1.1`. Every open issue belongs to one of them.

## Build metadata

`vite.config.ts` injects `__APP_VERSION__` (from `package.json`) and `__APP_COMMIT__` (first 7 characters of `GITHUB_SHA`, `dev` locally). The About screen reads the server version from `GET /meta` of the API (Go backend).

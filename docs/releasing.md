# Releasing

The backend always deploys first and stays compatible with the previous frontend release.

## Staging

Every push to `main` runs `deploy-staging.yml` once CI for that push has succeeded. It checks out exactly the
commit CI tested and builds the frontend for
`https://staging.messenger.viserix.com/api/v2`, uploads it with the staging-only SSH account,
and atomically switches `/var/www/messenger-staging/current`. The deployment checks the
public `version.json` against the deployed commit and restores the previous frontend on
failure. Five frontend builds are retained. The workflow can also be run manually, but only from `main`.

The GitHub `staging` environment permits only `main` and stores `STAGING_SSH_HOST`,
`STAGING_SSH_USER`, `STAGING_SSH_KEY`, and `STAGING_SSH_KNOWN_HOSTS`. The staging account
owns `/var/www/messenger-staging` and its `releases` directory. Production bundles contain
production API addresses, so staging always gets its own build. Production continues to
deploy only through the release workflow below.

## Checklist

1. Make sure all PRs for the release are merged to `main` with Conventional Commit titles and CI is green.
2. Release the backend first (see its `docs/releasing.md`) and deploy it.
3. Open the release PR created by release-please in this repository, check the changelog and version, and merge it. This creates the tag `vX.Y.Z`, the GitHub Release and attaches `messenger-front-vX.Y.Z-dist.tar.gz`.
4. Deploy: happens automatically after the release: the release workflow moves the `edge` branch to the release commit and dispatches `deploy.yml` on it (environment `production` only accepts deployments from `edge`). It uploads the archive to `/var/www/messenger/releases/vX.Y.Z` and atomically switches the `current` symlink, which nginx serves. The last 5 releases are kept.
5. Open Profile → About and check that the app, server and API versions are what you expect.

## Starting a new release train

Add a `Release-As: X.Y.0` footer to a commit on `main` when deliberately selecting the next frontend version. Frontend and backend app versions are independent; compatibility follows the API contract. Pull requests are squash-merged using the PR description as the commit message, so put the footer on its own line at the end of the PR description.

## Rollback

1. Run the **Deploy** workflow manually (Actions → Deploy → Run workflow, branch `edge`) with the previous tag; or on the server run `ln -sfn releases/vX.Y.Z current` in the web root.
2. If the problem is in the backend, roll the backend back to its previous release instead; the previous frontend stays compatible with it.
3. Fix forward with a `fix:` commit; never move or delete a published tag.

## CI/CD setup

The CI `build` job installs dependencies once, validates and regenerates the
contract, then runs lint, type checking, unit tests and the build concurrently.
It waits for all four commands and fails if any command fails. The existing
`lint`, `typecheck`, `test` and `contract` jobs remain as compatibility checks
for branch protection and require the combined job to succeed. Browser smoke
tests keep their own job and installation, including on the nightly schedule.

Workflows in `.github/workflows/`: `ci.yml` (build on every PR, lint is report-only until existing errors are fixed), `pr-title.yml`, `release-please.yml` (release, `dist` archive, then promote to `edge` and deploy), `deploy-staging.yml` (after a successful CI run for a push to `main`, staging-only build and deployment), and `deploy.yml` (SSH deploy, also runnable manually for rollbacks).

One-time setup:

1. Server: create the web root `/var/www/messenger` owned by the deploy user (or set the repository variable `FRONTEND_DEPLOY_PATH`) and point nginx at `root /var/www/messenger/current;`.
2. GitHub: create the environment `production` and add the secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` and `SSH_KNOWN_HOSTS` (output of `ssh-keyscan <host>`), as in the backend repository.
3. GitHub repository variables (they are baked into the build): `VITE_BASE_URL` (for example `https://chat.example.com/api`) and `VITE_WS_URL` (for example `wss://chat.example.com/api`).
4. Repository settings → Actions → General: allow workflows to create pull requests (needed by release-please).

The frontend deploy is triggered by its own release, so keep the order from this document: deploy the backend first, then merge the frontend release PR.

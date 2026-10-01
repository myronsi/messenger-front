# Releasing

The backend always deploys first and stays compatible with the previous frontend release.

## Checklist

1. Make sure all PRs for the release are merged to `main` with Conventional Commit titles and CI is green.
2. Release the backend first (see its `docs/releasing.md`) and deploy it.
3. Open the release PR created by release-please in this repository, check the changelog and version, and merge it. This creates the tag `vX.Y.Z`, the GitHub Release and attaches `messenger-front-vX.Y.Z-dist.tar.gz`.
4. Deploy: download the archive from the GitHub Release and publish its contents with the web server.
5. Open Profile → About and check that the app, server and API versions are what you expect.

## Starting a new release train

Add a `Release-As: X.Y.0` footer to a commit on `main` so `MAJOR.MINOR` matches the backend release.

## Rollback

1. Deploy the `dist` archive of the previous GitHub Release.
2. If the problem is in the backend, roll the backend back to its previous release instead; the previous frontend stays compatible with it.
3. Fix forward with a `fix:` commit; never move or delete a published tag.

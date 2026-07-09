# @pagopa/nx-dx-docker-plugin

TypeScript Nx plugin that generates `docker:build`/`docker:push` (and
`package`) targets for every project with a `Dockerfile`, reaching feature
parity with `docker/metadata-action`: full OCI labels/annotations, a
multi-tag strategy (branch ref, short sha, semver + `latest`), and
provenance/reproducibility flags.

`@nx/docker` remains the official base plugin (registered **before** this
one in `nx.json`) for the `docker:run` convenience target and the
`nx-release-publish` executor; see `src/docker-build-target.ts` for why
this plugin owns the full `docker:build`/`docker:push` targets instead.

## Installation

```bash
pnpm add -D @pagopa/nx-dx-docker-plugin
```

Then register it in your `nx.json` `plugins` array (see [Options](#options)
below).

## Options

See `src/options.ts` (zod-validated) for the full list of options and the
rationale behind which ones are required, auto-detected, or defaulted.

- `imageAuthors` is always required.
- `imageNamePrefix`/`imageUrl` are auto-detected from the workspace's git
  `origin` remote when possible, otherwise required.
- `buildTargetName`, `defaultBranch`, `jsBuildTargetName`,
  `packageTargetName`, `pushTargetName` and `registry` default to
  `docker:build`, `main`, `build`, `package`, `docker:push` and `ghcr.io`.

## Tag strategy

See `src/docker-image.ts`'s `computeImageTags` for the full tag strategy
(mirrors `docker/metadata-action`'s default `flavor: latest=auto`).

## CI job summary

In a GitHub Actions job (`GITHUB_STEP_SUMMARY` set), `docker:build`,
`docker:push` and `nx-release-publish` report pushed image tags and
build/push failures to the job summary — see `src/github-summary.ts`.

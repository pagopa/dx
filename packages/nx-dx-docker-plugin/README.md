# @pagopa/nx-dx-docker-plugin

TypeScript Nx plugin that generates `docker:build`/`docker:push` (and
`package`) targets for every project with a `Dockerfile`, reaching feature
parity with `docker/metadata-action`: full OCI labels/annotations, a
multi-tag strategy (branch ref, short sha, semver + `latest`), and
provenance/reproducibility flags.

Source is written as regular ESM TypeScript (see `src/`), but `pnpm build`
(`tsdown`) deliberately emits **CommonJS** to `dist/`, and the package has
no `"type": "module"`. Nx's plugin loader (`require()`s the resolved entry
point, then mutates it with `plugin.name ??= name`) needs a plain, mutable
`module.exports` object; a native ES module's namespace object is frozen,
so a genuine ESM build fails to load with `Cannot add property name,
object is not extensible` — reproduced against `selfcare-monorepo-poc`'s Nx
22.6.5 (this repo's own Nx 22.7.5 didn't reproduce it, so this is Nx-version
dependent — don't assume a passing check in one repo proves the other is
safe). Consumers must always `require()`/load the **built** `dist/*.js`
files, never the raw `.ts` source directly.

`@nx/docker` remains the official base plugin (registered **before** this
one in `nx.json`) for the `docker:run` convenience target and the
`nx-release-publish` executor. This plugin owns the full `docker:build`/
`docker:push` target definitions instead of layering `args` on top of
`@nx/docker`'s own, because Nx merges `options.args`/`command` wholesale
per later-registered-plugin-wins — a partial merge across two plugins isn't
possible.

## Consumption

This package is consumed today via **local filesystem symlinks** from
`selfcare-monorepo-poc/packages/nx-dx-docker-plugin/src` and `.../dist` to
this package's `src/` and `dist/` directories (both repos are expected to
be checked out as sibling directories on the same machine). This only
works for local development; it does **not** work in CI, since each repo's
CI checks out only itself, and `dist/` must be built (`pnpm build`) before
it's usable — it is not committed. Until this package is published as a
versioned npm package (with its own build/test/changeset/release),
consumers running in CI must vendor a build of this package rather than
relying on the symlinks.

## Options

See `src/options.ts` (zod-validated) for the full list of overridable
options (`buildTargetName`, `defaultBranch`, `imageAuthors`,
`imageNamePrefix`, `imageUrl`, `jsBuildTargetName`, `packageTargetName`,
`pushTargetName`, `registry`). Consumers should pass explicit values for
all of these in their own `nx.json` plugin registration rather than relying
on this package's bundled defaults, which are tuned for the original
consumer and may change.

## Tag strategy

See `src/docker-image.ts`'s `computeImageTags`: `sha-<short>` always, a
slugified branch-ref tag (plus `latest` on the default branch), and on a
`{projectName}@{version}` release tag push, `version`/`major.minor`/`major`
(major skipped for `0.x`) plus `latest` when this is the highest version
released so far for the project (mirrors `docker/metadata-action`'s default
`flavor: latest=auto`, using local git tags instead of a registry query).

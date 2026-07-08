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

This package is consumed as a normal pnpm workspace dependency
(`"@pagopa/nx-dx-docker-plugin": "workspace:^"`), registered in a
consumer's `nx.json` `plugins` array.

`dist/*.js` is committed to the repository (see `.gitignore`, which
un-ignores `dist/` and only ignores `dist/**/*.d.ts`). This is required
because Nx loads plugins from `nx.json` to compute the project graph
before any build target can run, so the plugin can't rely on `nx build`
to produce its own `dist/` first — the built output must already be
present on disk. Run `pnpm build` in this package after changing `src/`
and commit the resulting `dist/*.js` changes together with the source.

## Options

See `src/options.ts` (zod-validated) for the full list of options.

`imageAuthors`, `imageNamePrefix` and `imageUrl` identify *which
repository* built an image (they end up in OCI labels and in the image
name itself) and have no default — this plugin is installed across
multiple, unrelated repositories, and defaulting them would silently
stamp one consumer's identity onto every other consumer's images. Every
`nx.json` registration must set them explicitly, or plugin loading fails
with a validation error.

`buildTargetName`, `defaultBranch`, `jsBuildTargetName`,
`packageTargetName`, `pushTargetName` and `registry` are Nx/registry
conventions that are the same across repos, so they default to
`docker:build`, `main`, `build`, `package`, `docker:push` and `ghcr.io`
respectively — override them only if your repo deviates from those
conventions.

## Tag strategy

See `src/docker-image.ts`'s `computeImageTags`: `sha-<short>` always, a
slugified branch-ref tag (plus `latest` on the default branch), and on a
`{projectName}@{version}` release tag push, `version`/`major.minor`/`major`
(major skipped for `0.x`) plus `latest` when this is the highest version
released so far for the project (mirrors `docker/metadata-action`'s default
`flavor: latest=auto`, using local git tags instead of a registry query).

let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");
let _nx_devkit = require("@nx/devkit");
let node_fs = require("node:fs");
let node_path = require("node:path");
let semver = require("semver");

//#region src/docker-image.ts
/**
* Mirrors `@nx/docker`'s own default image slug so the `docker:run` target
* it generates (`docker run {args} {imageRef}`) keeps working against the
* bare (untagged) image this plugin also produces.
*/
const getProjectSlug = (projectRoot) => projectRoot.replace(/^[\\/]/, "").replace(/[\\/\s]+/g, "-").toLowerCase();
/**
* Human-readable project name used for OCI labels and to match this
* project's release tags. Falls back to the path-derived slug when no
* `package.json` is present (non-JS Docker projects).
*/
const getProjectDisplayName = (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	if ((0, node_fs.existsSync)(packageJsonPath)) {
		const packageJson = (0, _nx_devkit.readJsonFile)(packageJsonPath);
		if (packageJson.name) return packageJson.name;
	}
	return getProjectSlug(projectRoot);
};
/**
* `repositoryNameOverride` lets a project pin the exact `<namespace>/<name>`
* path used by `docker:build`/`docker:push` (e.g. to match a pre-existing
* image name from before this plugin existed), instead of the default
* `<imageNamePrefix>/<image-slug>` convention. Deliberately a *different*
* package.json field than Nx's own `nx.release.docker.repositoryName` (see
* `getDockerRepositoryNameOverride` in index.ts): that one also swaps the
* `nx-release-publish` executor, which would be wrong for projects (like
* npm packages) whose `nx-release-publish` must stay `@nx/js:release-publish`.
*/
const getImageName = (registry, imageNamePrefix, projectDisplayName, repositoryNameOverride) => `${registry}/${repositoryNameOverride ?? `${imageNamePrefix}/${getImageSlug(projectDisplayName)}`}`;
/**
* The per-project path segment of the pushed image name: the project's
* display name (package.json's "name", including any npm scope) rather
* than the full nested project path — Nx already enforces unique project
* names workspace-wide, so no path nesting is needed to avoid collisions
* within a repo, and `imageNamePrefix` already isolates images *across*
* repos. When there's no package.json name to draw from,
* `projectDisplayName` already falls back to the path-based slug (see
* `getProjectDisplayName`), so this still degrades gracefully for
* non-JS Docker projects.
*
* Deliberately independent of `getProjectSlug`, which stays purely
* path-based because it also has to match `@nx/docker`'s own local image
* ref for its generated `docker:run` target (see `getProjectNameFromPath`
* in `@nx/docker`'s plugin) — changing that would break `docker run`
* against the image this plugin builds.
*/
const getImageSlug = (projectDisplayName) => slugifyRef(projectDisplayName.replace(/^@/, ""));
/**
* `projectName` ultimately comes from an unsanitized CLI argument
* (`--project-display-name`, forwarded from `package.json`'s `name` field or
* a project-root-derived slug). Validate it against the shape Nx/npm project
* names actually take before using it to build a `git tag` pattern, so a
* malformed or hostile value fails loudly instead of reaching the shell.
*/
const projectNameSchema = zod_v4.z.string().min(1).regex(/^[A-Za-z0-9@][A-Za-z0-9@/_.-]*$/, "must be a valid project/package name");
const slugifyRef = (ref) => ref.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
/**
* Parses strict SemVer strings that can also be used as Docker tags. Build
* metadata is valid SemVer but contains `+`, which Docker tags do not allow.
*/
const parseDockerSemver = (version) => {
	const parsed = (0, semver.parse)(version);
	return parsed?.version === version && parsed.build.length === 0 ? parsed : null;
};
/**
* Mirrors `docker/metadata-action`'s default `flavor: latest=auto`: `latest`
* should follow a semver release tag only when it's the highest version
* released so far for this project. Uses local git tags
* (`{projectName}@{version}`) as the source of truth, since Nx release
* creates one such tag per release (see `release.git.tag` in nx.json) —
* this requires the checkout to have fetched all tags (`fetch-depth: 0` /
* `fetch-tags: true` in CI).
*/
const isHighestReleasedVersion = (projectName, currentVersion) => {
	const currentParsed = parseDockerSemver(currentVersion);
	if (!currentParsed) return false;
	const prefix = `${projectNameSchema.parse(projectName)}@`;
	let existingTags;
	try {
		existingTags = (0, node_child_process.execFileSync)("git", [
			"tag",
			"-l",
			`${prefix}*`
		], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).split("\n").filter(Boolean);
	} catch {
		return true;
	}
	return existingTags.every((tag) => {
		const otherVersion = tag.slice(prefix.length);
		if (!tag.startsWith(prefix) || otherVersion === currentVersion) return true;
		const otherParsed = parseDockerSemver(otherVersion);
		return !otherParsed || (0, semver.compare)(otherParsed, currentParsed) <= 0;
	});
};
/**
* Computes the alias tags for a single semver release version: the version
* itself, `major.minor`, `major` (skipped for all 0.x releases, which would
* be ambiguous/unstable), and `latest` when this is the highest version
* released stable version for the project (see `isHighestReleasedVersion`).
* Returns an empty array when `version` isn't a valid semver string. Shared by
* `computeImageTags` (CI tag-push events) and the `release-publish` executor
* (wraps `@nx/docker`'s own `nx-release-publish` executor, which only ever
* pushes a single version-only tag).
*/
const computeReleaseTags = (projectName, version) => {
	const parsedVersion = parseDockerSemver(version);
	if (!parsedVersion) return [];
	const tags = [version];
	if (parsedVersion.prerelease.length > 0) return tags;
	const { major, minor } = parsedVersion;
	tags.push(`${major}.${minor}`);
	if (major !== 0) tags.push(String(major));
	if (isHighestReleasedVersion(projectName, version)) tags.push("latest");
	return tags;
};
/**
* Computes the set of image tags for the current CI context, mirroring
* `docker/metadata-action`'s behavior. Returns an empty array outside of CI
* (no `GITHUB_*` env vars), which callers should treat as "nothing to
* publish" rather than falling back to a placeholder tag.
*/
const computeImageTags = (projectName, defaultBranch, env = process.env) => {
	const tags = [];
	if (env.GITHUB_SHA) tags.push(`sha-${env.GITHUB_SHA.slice(0, 7)}`);
	if (env.GITHUB_REF_TYPE === "branch" && env.GITHUB_REF_NAME) {
		tags.push(slugifyRef(env.GITHUB_REF_NAME));
		if (env.GITHUB_REF_NAME === defaultBranch) tags.push("latest");
	}
	if (env.GITHUB_REF_TYPE === "tag" && env.GITHUB_REF_NAME) {
		const releaseTagPrefix = `${projectName}@`;
		if (env.GITHUB_REF_NAME.startsWith(releaseTagPrefix)) {
			const version = env.GITHUB_REF_NAME.slice(releaseTagPrefix.length);
			tags.push(...computeReleaseTags(projectName, version));
		}
	}
	return tags;
};

//#endregion
Object.defineProperty(exports, 'computeImageTags', {
  enumerable: true,
  get: function () {
    return computeImageTags;
  }
});
Object.defineProperty(exports, 'computeReleaseTags', {
  enumerable: true,
  get: function () {
    return computeReleaseTags;
  }
});
Object.defineProperty(exports, 'getImageName', {
  enumerable: true,
  get: function () {
    return getImageName;
  }
});
Object.defineProperty(exports, 'getProjectDisplayName', {
  enumerable: true,
  get: function () {
    return getProjectDisplayName;
  }
});
Object.defineProperty(exports, 'getProjectSlug', {
  enumerable: true,
  get: function () {
    return getProjectSlug;
  }
});
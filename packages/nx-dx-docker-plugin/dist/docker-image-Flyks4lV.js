let node_child_process = require("node:child_process");
let _nx_devkit = require("@nx/devkit");
let node_fs = require("node:fs");
let node_path = require("node:path");

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
* `<imageNamePrefix>/<project-slug>` convention. Deliberately a *different*
* package.json field than Nx's own `nx.release.docker.repositoryName` (see
* `getDockerRepositoryNameOverride` in index.ts): that one also swaps the
* `nx-release-publish` executor, which would be wrong for projects (like
* npm packages) whose `nx-release-publish` must stay `@nx/js:release-publish`.
*/
const getImageName = (registry, imageNamePrefix, projectRoot, repositoryNameOverride) => `${registry}/${repositoryNameOverride ?? `${imageNamePrefix}/${getProjectSlug(projectRoot)}`}`;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const slugifyRef = (ref) => ref.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
/** @param version A string already matched by `SEMVER_RE`. */
const parseSemver = (version) => {
	const [core, prerelease] = version.split(/-(.+)/);
	const [major, minor, patch] = core.split(".").map(Number);
	return {
		major,
		minor,
		patch,
		prerelease
	};
};
/**
* Standard semver precedence: compares major, then minor, then patch, then
* treats a release as higher than any pre-release of the same
* major.minor.patch (e.g. `1.0.0` > `1.0.0-rc.1`).
* @returns positive if `a` > `b`, negative if `a` < `b`, 0 if equal.
*/
const compareSemver = (a, b) => {
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	if (a.patch !== b.patch) return a.patch - b.patch;
	if (a.prerelease === b.prerelease) return 0;
	if (!a.prerelease) return 1;
	if (!b.prerelease) return -1;
	return a.prerelease < b.prerelease ? -1 : 1;
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
	const currentParsed = parseSemver(currentVersion);
	const prefix = `${projectName}@`;
	let existingTags;
	try {
		existingTags = (0, node_child_process.execSync)(`git tag -l "${prefix}*"`, {
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
		const otherParsed = SEMVER_RE.test(otherVersion) ? parseSemver(otherVersion) : null;
		return !otherParsed || compareSemver(otherParsed, currentParsed) <= 0;
	});
};
/**
* Computes the alias tags for a single semver release version: the version
* itself, `major.minor`, `major` (skipped for 0.x pre-releases, which would
* be ambiguous/unstable), and `latest` when this is the highest version
* released so far for the project (see `isHighestReleasedVersion`). Returns
* an empty array when `version` isn't a valid semver string. Shared by
* `computeImageTags` (CI tag-push events) and `publish-docker-release.ts`
* (wraps `@nx/docker`'s own `nx-release-publish` executor, which only ever
* pushes a single version-only tag).
*/
const computeReleaseTags = (projectName, version) => {
	if (!SEMVER_RE.test(version)) return [];
	const tags = [version];
	const [major, minor] = version.split(".");
	tags.push(`${major}.${minor}`);
	if (major !== "0") tags.push(major);
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
// Image naming and tag-strategy helpers. Reaches feature parity with
// `docker/metadata-action`: `latest` on the default branch, semver tags
// derived from a project-scoped release tag (`{projectName}@{version}`,
// skipping the major-only alias for 0.x pre-releases), a branch-ref tag, and
// a short-sha tag. Also mirrors `docker/metadata-action`'s default
// `flavor: latest=auto` behavior: `latest` also follows a semver release tag
// when it is the highest version released so far for that project (see
// `isHighestReleasedVersion`).
import { readJsonFile } from "@nx/devkit";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";

interface ProjectPackageJson {
  readonly name?: string;
}

/**
 * Mirrors `@nx/docker`'s own default image slug so the `docker:run` target
 * it generates (`docker run {args} {imageRef}`) keeps working against the
 * bare (untagged) image this plugin also produces.
 */
export const getProjectSlug = (projectRoot: string): string =>
  projectRoot
    .replace(/^[\\/]/, "")
    .replace(/[\\/\s]+/g, "-")
    .toLowerCase();

/**
 * Human-readable project name used for OCI labels and to match this
 * project's release tags. Falls back to the path-derived slug when no
 * `package.json` is present (non-JS Docker projects).
 */
export const getProjectDisplayName = (
  workspaceRoot: string,
  projectRoot: string,
): string => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
    if (packageJson.name) {
      return packageJson.name;
    }
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
export const getImageName = (
  registry: string,
  imageNamePrefix: string,
  projectRoot: string,
  repositoryNameOverride?: string,
): string =>
  `${registry}/${repositoryNameOverride ?? `${imageNamePrefix}/${getProjectSlug(projectRoot)}`}`;

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * `projectName` ultimately comes from an unsanitized CLI argument
 * (`--project-display-name`, forwarded from `package.json`'s `name` field or
 * a project-root-derived slug). Validate it against the shape Nx/npm project
 * names actually take before using it to build a `git tag` pattern, so a
 * malformed or hostile value fails loudly instead of reaching the shell.
 */
const projectNameSchema = z
  .string()
  .min(1)
  .regex(
    /^[A-Za-z0-9@][A-Za-z0-9@/_.-]*$/,
    "must be a valid project/package name",
  );

const slugifyRef = (ref: string): string =>
  ref.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");

interface ParsedSemver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: string | undefined;
}

/** @param version A string already matched by `SEMVER_RE`. */
const parseSemver = (version: string): ParsedSemver => {
  const [core, prerelease] = version.split(/-(.+)/);
  const [major, minor, patch] = core.split(".").map(Number);
  return { major, minor, patch, prerelease };
};

/**
 * Standard semver precedence: compares major, then minor, then patch, then
 * treats a release as higher than any pre-release of the same
 * major.minor.patch (e.g. `1.0.0` > `1.0.0-rc.1`).
 * @returns positive if `a` > `b`, negative if `a` < `b`, 0 if equal.
 */
const compareSemver = (a: ParsedSemver, b: ParsedSemver): number => {
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
export const isHighestReleasedVersion = (
  projectName: string,
  currentVersion: string,
): boolean => {
  const currentParsed = parseSemver(currentVersion);
  const parsedProjectName = projectNameSchema.parse(projectName);
  const prefix = `${parsedProjectName}@`;

  let existingTags: readonly string[];
  try {
    existingTags = execFileSync("git", ["tag", "-l", `${prefix}*`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    // No git history available (e.g. not a git checkout): assume this is
    // the only/highest version rather than skipping `latest` entirely.
    return true;
  }

  return existingTags.every((tag) => {
    const otherVersion = tag.slice(prefix.length);
    if (!tag.startsWith(prefix) || otherVersion === currentVersion) {
      return true;
    }
    const otherParsed = SEMVER_RE.test(otherVersion)
      ? parseSemver(otherVersion)
      : null;
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
export const computeReleaseTags = (
  projectName: string,
  version: string,
): readonly string[] => {
  if (!SEMVER_RE.test(version)) {
    return [];
  }
  const tags = [version];
  const [major, minor] = version.split(".");
  tags.push(`${major}.${minor}`);
  if (major !== "0") {
    tags.push(major);
  }
  if (isHighestReleasedVersion(projectName, version)) {
    tags.push("latest");
  }
  return tags;
};

/**
 * Computes the set of image tags for the current CI context, mirroring
 * `docker/metadata-action`'s behavior. Returns an empty array outside of CI
 * (no `GITHUB_*` env vars), which callers should treat as "nothing to
 * publish" rather than falling back to a placeholder tag.
 */
export const computeImageTags = (
  projectName: string,
  defaultBranch: string,
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] => {
  const tags: string[] = [];

  if (env.GITHUB_SHA) {
    tags.push(`sha-${env.GITHUB_SHA.slice(0, 7)}`);
  }

  if (env.GITHUB_REF_TYPE === "branch" && env.GITHUB_REF_NAME) {
    tags.push(slugifyRef(env.GITHUB_REF_NAME));
    if (env.GITHUB_REF_NAME === defaultBranch) {
      tags.push("latest");
    }
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

// Plugin option parsing for the docker-release Nx plugin: `@nx/docker`
// remains the official base plugin for the `docker:run` convenience target
// and the `nx-release-publish` executor, while this plugin owns the full
// `docker:build`/`docker:push` target definitions (multi-tag strategy, OCI
// labels, provenance/reproducibility flags) for every project with a
// Dockerfile, plus the `package` target for projects that also have a JS/TS
// build target.
//
// Deliberately OUT of scope (left to the CI workflow, not this plugin):
// registry authentication (`docker login`/OIDC) and artifact attestation —
// both require CI secrets/tokens that an Nx plugin has no business handling.
//
// This plugin is installed across multiple, unrelated repositories, so
// `imageAuthors`/`imageNamePrefix`/`imageUrl` identify *which repository*
// built an image (they end up in OCI labels and in the image name itself).
// `imageNamePrefix`/`imageUrl` are auto-detected from the workspace's git
// `origin` remote (when it's a github.com remote) so most consumers don't
// need to set them at all; override them explicitly for a custom image
// name prefix or a non-GitHub remote. `imageAuthors` has no reliable source
// (it's a human-readable legal/org name, not derivable from git) and is
// always required. The remaining options are Nx/registry conventions that
// are the same across repos, so they keep sensible defaults.
import { execFileSync } from "node:child_process";
import { z } from "zod/v4";

const nonEmptyString = z.string().min(1);

const dockerPluginOptionsSchema = z.object({
  buildTargetName: nonEmptyString,
  defaultBranch: nonEmptyString,
  imageAuthors: nonEmptyString,
  imageNamePrefix: nonEmptyString,
  imageUrl: nonEmptyString,
  jsBuildTargetName: nonEmptyString,
  packageTargetName: nonEmptyString,
  platform: nonEmptyString,
  pushTargetName: nonEmptyString,
  registry: nonEmptyString,
});

export type DockerPluginOptions = z.infer<typeof dockerPluginOptionsSchema>;

type DefaultableOption =
  | "buildTargetName"
  | "defaultBranch"
  | "jsBuildTargetName"
  | "packageTargetName"
  | "platform"
  | "pushTargetName"
  | "registry";

const defaultOptions: Pick<DockerPluginOptions, DefaultableOption> = {
  buildTargetName: "docker:build",
  defaultBranch: "main",
  jsBuildTargetName: "build",
  packageTargetName: "package",
  platform: "linux/amd64,linux/arm64",
  pushTargetName: "docker:push",
  registry: "ghcr.io",
};

const partialSchema = dockerPluginOptionsSchema.partial({
  buildTargetName: true,
  defaultBranch: true,
  imageNamePrefix: true,
  imageUrl: true,
  jsBuildTargetName: true,
  packageTargetName: true,
  platform: true,
  pushTargetName: true,
  registry: true,
});

const githubRemotePattern =
  /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/(.+?)(?:\.git)?$/;

// Best-effort: derives imageNamePrefix/imageUrl from the workspace's git
// `origin` remote. Returns `undefined` when there's no git repo, no
// `origin` remote, or the remote isn't hosted on github.com — callers must
// fall back to requiring the options explicitly in that case.
const deriveFromGitOrigin = (
  workspaceRoot: string,
): Pick<DockerPluginOptions, "imageNamePrefix" | "imageUrl"> | undefined => {
  try {
    const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: workspaceRoot,
      encoding: "utf8",
    }).trim();
    const match = githubRemotePattern.exec(remoteUrl);
    if (!match) return undefined;
    const [, owner, repo] = match;
    return {
      imageNamePrefix: `${owner}/${repo}`.toLowerCase(),
      imageUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return undefined;
  }
};

export const parseDockerReleasePluginOptions = (
  options: unknown,
  workspaceRoot: string,
): DockerPluginOptions => {
  const input = typeof options === "object" && options !== null ? options : {};
  const parseResult = partialSchema.safeParse(input);
  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "options";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(
      `Invalid @pagopa/nx-dx-docker-plugin options: ${validationErrors}`,
    );
  }

  const parsed = parseResult.data;
  const gitOrigin =
    parsed.imageNamePrefix === undefined || parsed.imageUrl === undefined
      ? deriveFromGitOrigin(workspaceRoot)
      : undefined;
  const imageNamePrefix = parsed.imageNamePrefix ?? gitOrigin?.imageNamePrefix;
  const imageUrl = parsed.imageUrl ?? gitOrigin?.imageUrl;

  if (imageNamePrefix === undefined || imageUrl === undefined) {
    throw new Error(
      "Invalid @pagopa/nx-dx-docker-plugin options: imageNamePrefix/imageUrl " +
        "were not set and could not be auto-detected from the git 'origin' " +
        "remote (missing git repo, missing origin, or a non-github.com " +
        "remote) — set them explicitly in this plugin's nx.json options.",
    );
  }

  return {
    ...defaultOptions,
    ...parsed,
    imageNamePrefix,
    imageUrl,
  };
};

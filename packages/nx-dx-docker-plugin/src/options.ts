// Resolves Docker plugin conventions from workspace metadata. Consumers do
// not configure target names, registry defaults, labels, or repository names:
// DX owns those decisions and keeps project-level overrides only where a
// Dockerfile genuinely differs (for example context, path, or platform).
import { readJsonFile } from "@nx/devkit";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { z } from "zod/v4";

const workspacePackageSchema = z.object({
  name: z.string().min(1),
});

const nxConfigurationSchema = z.object({
  defaultBase: z.string().min(1).optional(),
  release: z
    .object({
      docker: z
        .object({
          registryUrl: z.string().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});

const pluginOptionsSchema = z
  .object({
    imageAuthors: z.string().min(1).optional(),
    imageNamePrefix: z.string().min(1).optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict();

export interface DockerPluginOptions {
  readonly buildTargetName: "docker:build";
  readonly defaultBranch: string;
  readonly imageAuthors: string;
  readonly imageNamePrefix: string;
  readonly imageUrl: string;
  readonly platform: "linux/amd64,linux/arm64";
  readonly pushTargetName: "docker:push";
  readonly registry: string;
}

interface RepositoryMetadata {
  readonly imageNamePrefix: string;
  readonly imageUrl: string;
}

const githubRemotePattern =
  /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/(.+?)(?:\.git)?$/;

const toRepositoryMetadata = (
  owner: string,
  repository: string,
): RepositoryMetadata => ({
  imageNamePrefix: `${owner}/${repository}`.toLowerCase(),
  imageUrl: `https://github.com/${owner}/${repository}`,
});

const deriveFromGitOrigin = (
  workspaceRoot: string,
): RepositoryMetadata | undefined => {
  try {
    const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: workspaceRoot,
      encoding: "utf8",
    }).trim();
    const match = githubRemotePattern.exec(remoteUrl);
    return match ? toRepositoryMetadata(match[1], match[2]) : undefined;
  } catch {
    return undefined;
  }
};

const deriveFromWorkspacePackage = (
  workspaceRoot: string,
): RepositoryMetadata => {
  const parseResult = workspacePackageSchema.safeParse(
    readJsonFile<Record<string, unknown>>(join(workspaceRoot, "package.json")),
  );
  if (!parseResult.success) {
    throw new Error(
      "Unable to infer Docker repository metadata: root package.json must have a name.",
    );
  }

  const [scope, scopedName] = parseResult.data.name.split("/");
  const owner = scopedName ? scope.replace(/^@/, "") : "pagopa";
  const repository = scopedName ?? scope;
  return toRepositoryMetadata(owner, repository);
};

export const parseDockerReleasePluginOptions = (
  options: unknown,
  workspaceRoot: string,
): DockerPluginOptions => {
  const optionsResult = pluginOptionsSchema.safeParse(options ?? {});
  if (!optionsResult.success) {
    throw new Error(
      "Invalid @pagopa/nx-dx-docker-plugin options: only imageAuthors, imageNamePrefix, and imageUrl may be overridden.",
    );
  }

  const nxResult = nxConfigurationSchema.safeParse(
    readJsonFile<Record<string, unknown>>(join(workspaceRoot, "nx.json")),
  );
  if (!nxResult.success) {
    throw new Error("Unable to infer Docker conventions from nx.json.");
  }

  const repository =
    optionsResult.data.imageNamePrefix && optionsResult.data.imageUrl
      ? {
          imageNamePrefix: optionsResult.data.imageNamePrefix,
          imageUrl: optionsResult.data.imageUrl,
        }
      : (() => {
          const inferred =
            deriveFromGitOrigin(workspaceRoot) ??
            deriveFromWorkspacePackage(workspaceRoot);
          return {
            imageNamePrefix:
              optionsResult.data.imageNamePrefix ?? inferred.imageNamePrefix,
            imageUrl: optionsResult.data.imageUrl ?? inferred.imageUrl,
          };
        })();

  return {
    buildTargetName: "docker:build",
    defaultBranch: nxResult.data.defaultBase ?? "main",
    imageAuthors: optionsResult.data.imageAuthors ?? "PagoPA",
    ...repository,
    platform: "linux/amd64,linux/arm64",
    pushTargetName: "docker:push",
    registry: nxResult.data.release?.docker?.registryUrl ?? "ghcr.io",
  };
};

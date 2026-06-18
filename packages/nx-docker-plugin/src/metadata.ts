/**
 * Resolves OCI labels from local project metadata without coupling callers to file formats.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod/v4";

interface ProjectDescriptor {
  description: string;
  name: string;
  repositoryUrl: string;
  sourceUrl: string;
}

interface RepositoryFieldObject {
  url?: string;
}

interface ProjectJsonLike {
  description?: string;
  name?: string;
  repository?: RepositoryFieldObject | string;
}

const projectJsonLikeSchema: z.ZodType<ProjectJsonLike> = z.object({
  description: z.string().optional(),
  name: z.string().optional(),
  repository: z
    .union([
      z.string(),
      z.object({
        url: z.string().optional(),
      }),
    ])
    .optional(),
});

const normalizePath = (value: string) => value.replaceAll(path.sep, "/");

const readJsonIfExists = (
  filePath: string,
  schema: z.ZodType<ProjectJsonLike>,
): ProjectJsonLike | null => {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const jsonContent = JSON.parse(readFileSync(filePath, "utf8"));
    const parseResult = schema.safeParse(jsonContent);

    return parseResult.success ? parseResult.data : null;
  } catch (error) {
    throw new Error(`Could not parse ${filePath}.`, { cause: error });
  }
};

const normalizeRepositoryUrl = (url: string | undefined): string | null => {
  if (!url) {
    return null;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return null;
  }

  return trimmedUrl
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/^git:\/\/github\.com\//, "https://github.com/");
};

const getRepositoryFieldUrl = (
  repository: ProjectJsonLike["repository"],
): string | undefined => {
  if (typeof repository === "string") {
    return repository;
  }

  return repository?.url;
};

const getGitRemoteUrl = (workspaceRoot: string): string | null => {
  try {
    return normalizeRepositoryUrl(
      execSync("git config --get remote.origin.url", {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    return null;
  }
};

const getHeadCommitSha = (workspaceRoot: string): string | null => {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const quoteLabelValue = (value: string): string =>
  JSON.stringify(value.replaceAll("\n", " "));

export const getProjectDescriptor = (
  workspaceRoot: string,
  projectRoot: string,
  fallbackProjectName: string,
): ProjectDescriptor => {
  const packageJsonPath = path.join(workspaceRoot, projectRoot, "package.json");
  const projectJsonPath = path.join(workspaceRoot, projectRoot, "project.json");
  const packageJson = readJsonIfExists(packageJsonPath, projectJsonLikeSchema);
  const projectJson = readJsonIfExists(projectJsonPath, projectJsonLikeSchema);

  const name = packageJson?.name ?? projectJson?.name ?? fallbackProjectName;
  const description =
    packageJson?.description ?? projectJson?.description ?? fallbackProjectName;
  const repositoryUrl =
    normalizeRepositoryUrl(getRepositoryFieldUrl(packageJson?.repository)) ??
    normalizeRepositoryUrl(getRepositoryFieldUrl(projectJson?.repository)) ??
    getGitRemoteUrl(workspaceRoot) ??
    "https://github.com/pagopa/dx";
  const sourceUrl = `${repositoryUrl}/blob/main/${normalizePath(projectRoot)}`;

  return {
    description,
    name,
    repositoryUrl,
    sourceUrl,
  };
};

export const getAutomaticDockerLabelArgs = (
  workspaceRoot: string,
  projectRoot: string,
  projectName: string,
  authors: string,
): string[] => {
  const descriptor = getProjectDescriptor(workspaceRoot, projectRoot, projectName);
  const commitSha = getHeadCommitSha(workspaceRoot);
  const labels = [
    `--label org.opencontainers.image.title=${quoteLabelValue(descriptor.name)}`,
    `--label org.opencontainers.image.description=${quoteLabelValue(descriptor.description)}`,
    `--label org.opencontainers.image.authors=${quoteLabelValue(authors)}`,
    `--label org.opencontainers.image.url=${quoteLabelValue(descriptor.repositoryUrl)}`,
    `--label org.opencontainers.image.source=${quoteLabelValue(descriptor.sourceUrl)}`,
  ];

  if (commitSha) {
    labels.push(
      `--label org.opencontainers.image.revision=${quoteLabelValue(commitSha)}`,
    );
  }

  labels.push("--provenance=false");

  return labels;
};
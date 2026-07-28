// Resolves workspace-relative Docker build options from project metadata.
import { readJsonFile } from "@nx/devkit";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface DockerBuildOptions {
  readonly contextPath?: string;
  readonly dockerfilePath?: string;
  readonly platform?: string;
}

interface ProjectJson {
  readonly metadata?: {
    readonly docker?: DockerBuildOptions;
  };
}

interface ProjectPackageJson {
  readonly nx?: {
    readonly docker?: DockerBuildOptions;
  };
}

const getDockerBuildOptions = (
  workspaceRoot: string,
  projectRoot: string,
): DockerBuildOptions | undefined => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    return readJsonFile<ProjectPackageJson>(packageJsonPath).nx?.docker;
  }

  const projectJsonPath = join(workspaceRoot, projectRoot, "project.json");
  return existsSync(projectJsonPath)
    ? readJsonFile<ProjectJson>(projectJsonPath).metadata?.docker
    : undefined;
};

export const getBuildLayoutOverrides = (
  workspaceRoot: string,
  projectRoot: string,
): {
  readonly contextPath: string;
  readonly dockerfilePath: string;
  readonly platform?: string;
} => {
  const docker = getDockerBuildOptions(workspaceRoot, projectRoot);
  return {
    contextPath: docker?.contextPath ?? ".",
    dockerfilePath: docker?.dockerfilePath ?? `${projectRoot}/Dockerfile`,
    platform: docker?.platform,
  };
};

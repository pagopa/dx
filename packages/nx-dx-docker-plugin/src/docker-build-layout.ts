// Resolves workspace-relative Docker build options from project metadata.
import { readJsonFile } from "@nx/devkit";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface ProjectPackageJson {
  readonly nx?: {
    readonly docker?: {
      readonly contextPath?: string;
      readonly dockerfilePath?: string;
      readonly platform?: string;
    };
  };
}

interface ProjectJson {
  readonly metadata?: {
    readonly docker?: {
      readonly contextPath?: string;
      readonly dockerfilePath?: string;
      readonly platform?: string;
    };
  };
}

export const getBuildLayoutOverrides = (
  workspaceRoot: string,
  projectRoot: string,
): {
  readonly contextPath: string;
  readonly dockerfilePath: string;
  readonly platform?: string;
} => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    const projectJsonPath = join(workspaceRoot, projectRoot, "project.json");
    const projectJson = existsSync(projectJsonPath)
      ? readJsonFile<ProjectJson>(projectJsonPath)
      : null;
    return {
      contextPath: projectJson?.metadata?.docker?.contextPath ?? ".",
      dockerfilePath:
        projectJson?.metadata?.docker?.dockerfilePath ??
        `${projectRoot}/Dockerfile`,
      platform: projectJson?.metadata?.docker?.platform,
    };
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return {
    contextPath: packageJson.nx?.docker?.contextPath ?? ".",
    dockerfilePath:
      packageJson.nx?.docker?.dockerfilePath ?? `${projectRoot}/Dockerfile`,
    platform: packageJson.nx?.docker?.platform,
  };
};

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
    return { contextPath: ".", dockerfilePath: `${projectRoot}/Dockerfile` };
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return {
    contextPath: packageJson.nx?.docker?.contextPath ?? ".",
    dockerfilePath:
      packageJson.nx?.docker?.dockerfilePath ?? `${projectRoot}/Dockerfile`,
    platform: packageJson.nx?.docker?.platform,
  };
};

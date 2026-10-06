import { DependencyType, RawProjectGraphDependency } from "@nx/devkit";
import path from "node:path";

import { ProjectFile } from "./project-file.ts";
import { getProjectNameFromRoot } from "./project.ts";

export const getLocalModuleSourceRoots = (
  fileName: string,
  fileContent: string,
) => {
  const moduleSourceRoots = new Set<string>();
  const moduleRegex = /module\s+"([^"]+)"\s*{[^}]*source\s*=\s*"([^"]+)"/g;
  let match;

  while ((match = moduleRegex.exec(fileContent)) !== null) {
    const [, , moduleSource] = match;
    if (moduleSource.startsWith(".")) {
      moduleSourceRoots.add(path.join(path.dirname(fileName), moduleSource));
    }
  }

  return Array.from(moduleSourceRoots);
};

// Reads a Terraform configuration file and extracts static dependencies based on module sources.
// Relative module sources become Nx graph edges to the corresponding Terraform project name.
export function getStaticDependencies(
  file: ProjectFile,
  fileContent: string,
): RawProjectGraphDependency[] {
  return getLocalModuleSourceRoots(file.fileName, fileContent).map(
    (sourceRoot) => ({
      source: file.project,
      sourceFile: file.fileName,
      target: getProjectNameFromRoot(sourceRoot),
      // All dependencies from Terraform files are considered static
      // as they are defined in the configuration and do not change at runtime.
      type: DependencyType.static,
    }),
  );
}

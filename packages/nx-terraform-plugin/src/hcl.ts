import { DependencyType, RawProjectGraphDependency } from "@nx/devkit";
import path from "node:path";

import { ProjectFile } from "./project-file.ts";
import { getProjectNameFromRoot } from "./project.ts";

export type ProjectNameResolver = (moduleRoot: string) => string;

// Reads a Terraform configuration file and extracts static dependencies based on module sources
// It looks for module blocks and their source attributes, and if the source is a relative path, it creates a dependency entry
export function getStaticDependencies(
  file: ProjectFile,
  fileContent: string,
  resolveProjectName: ProjectNameResolver = getProjectNameFromRoot,
): RawProjectGraphDependency[] {
  const dependencies: RawProjectGraphDependency[] = [];
  const moduleRegex = /module\s+"([^"]+)"\s*{[^}]*source\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = moduleRegex.exec(fileContent)) !== null) {
    const [, , moduleSource] = match;
    if (moduleSource.startsWith(".")) {
      const moduleRoot = path.join(path.dirname(file.fileName), moduleSource);
      dependencies.push({
        source: file.project,
        sourceFile: file.fileName,
        target: resolveProjectName(moduleRoot),
        // All dependencies from Terraform files are considered static
        // as they are defined in the configuration and do not change at runtime
        type: DependencyType.static,
      });
    }
  }
  return dependencies;
}

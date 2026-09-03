import { RawProjectGraphDependency } from "@nx/devkit";
import fs from "node:fs/promises";

import { getStaticDependencies, type ProjectNameResolver } from "./hcl.ts";
import { getPackageLogger } from "./logger.ts";
import { ProjectFile } from "./project-file.ts";
import { getProjectNameFromRoot } from "./project.ts";

export const getStaticDependenciesFromFile = async (
  file: ProjectFile,
  resolveProjectName: ProjectNameResolver = getProjectNameFromRoot,
): Promise<RawProjectGraphDependency[]> => {
  const logger = getPackageLogger(["fs"]);
  try {
    const fileContent = await fs.readFile(file.fileName, "utf-8");
    return getStaticDependencies(file, fileContent, resolveProjectName);
  } catch (error) {
    logger.error("Error reading file {fileName}", {
      error,
      fileName: file.fileName,
    });
    return [];
  }
};

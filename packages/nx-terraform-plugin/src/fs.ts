import { RawProjectGraphDependency } from "@nx/devkit";
import fs from "node:fs/promises";

import { getStaticDependencies } from "./hcl.ts";
import { configurePackageLogger, getPackageLogger } from "./logger.ts";
import { ProjectFile } from "./project-file.ts";

export const getStaticDependenciesFromFile = async (
  file: ProjectFile,
): Promise<RawProjectGraphDependency[]> => {
  const logger = getPackageLogger(["fs"]);
  try {
    const fileContent = await fs.readFile(file.fileName, "utf-8");
    return getStaticDependencies(file, fileContent);
  } catch (error) {
    await configurePackageLogger();
    logger.error("Error reading file {fileName}", {
      error,
      fileName: file.fileName,
    });
    return [];
  }
};

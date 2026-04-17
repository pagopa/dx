import { RawProjectGraphDependency } from "@nx/devkit";
import fs from "node:fs/promises";

import { getStaticDependencies } from "./hcl.ts";
import { ProjectFile } from "./project.ts";

export const getStaticDependenciesFromFile = async (
  file: ProjectFile,
): Promise<RawProjectGraphDependency[]> => {
  try {
    const fileContent = await fs.readFile(file.fileName, "utf-8");
    return getStaticDependencies(file, fileContent);
  } catch (error) {
    console.error(`Error reading file ${file.fileName}:`, error);
    return [];
  }
};

import { ProjectFileMap } from "@nx/devkit";
import path from "node:path";

export interface ProjectFile {
  fileName: string;
  project: string;
}

// Derives a project name from the root path of a Terraform configuration directory
// So that names are predictable (no Nx project discovery required) and consistent
export const getProjectNameFromRoot = (root: string) =>
  root
    .split(path.sep)
    .reduce(
      (acc: string[], part: string, currentIndex: number, array: string[]) => {
        if (array.length > 1 && currentIndex === 0) {
          return acc;
        }
        if (part === "_modules") {
          return [...acc, "modules"];
        }
        return [...acc, part.replaceAll("_", "-")];
      },
      [],
    )
    .join("-");

// Nx provides ProjectFileMap, which contains all files in the workspace grouped by project
// We filter, and then flatten this structure to get only the terraform (hcl) files
export const getTerraformProjectFiles = (
  projectFileMap: ProjectFileMap,
): ProjectFile[] =>
  Object.entries(projectFileMap)
    .flatMap(([project, files]) =>
      files.map((fileData) => ({ fileName: fileData.file, project })),
    )
    .filter(({ fileName }) => fileName.match(/\.tf$/));

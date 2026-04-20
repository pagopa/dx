import { ProjectFileMap } from "@nx/devkit";

export interface ProjectFile {
  fileName: string;
  project: string;
}

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

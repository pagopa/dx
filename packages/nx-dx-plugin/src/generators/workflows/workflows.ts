import {
  formatFiles,
  generateFiles,
  OverwriteStrategy,
  readCachedProjectGraph,
  type Tree,
} from "@nx/devkit";
import * as path from "path";

export async function workflowGenerator(tree: Tree) {
  const projectGraph = readCachedProjectGraph();

  const apps = Object.values(projectGraph.nodes)
    .filter(({ data }) => {
      const targetResources = data.metadata?.["pagopa-dx"]?.targetResources;
      return (
        data.projectType === "application" &&
        Array.isArray(targetResources) &&
        targetResources.length > 0
      );
    })
    .map(({ name }) => name);

  generateFiles(
    tree,
    path.join(import.meta.dirname, "files"),
    ".github/workflows",
    {
      apps,
      prefix: "_",
      tmpl: "",
    },
    { overwriteStrategy: OverwriteStrategy.Overwrite },
  );
  await formatFiles(tree);
}

export default workflowGenerator;

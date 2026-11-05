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

  // Use this project's presence in the graph to distinguish the DX monorepo from consumer workspaces.
  const isDXWorkspace = Object.hasOwn(projectGraph.nodes, "@pagopa/nx-dx");
  const prefix = isDXWorkspace ? "_" : "";

  const githubWorkflowsDir = ".github/workflows";

  const getWorkflowUses = (workflowName: string) =>
    isDXWorkspace
      ? `$/.github/workflows/${workflowName}`
      : `pagopa/dx/.github/workflows/${workflowName}@main`;

  if (apps.length > 0) {
    generateFiles(
      tree,
      path.join(import.meta.dirname, "files"),
      githubWorkflowsDir,
      {
        apps,
        getWorkflowUses,
        prefix,
        tmpl: "",
      },
      { overwriteStrategy: OverwriteStrategy.Overwrite },
    );
  }

  if (apps.length === 0) {
    tree.delete(path.join(githubWorkflowsDir, `${prefix}deploy.yaml`));
  }

  await formatFiles(tree);
}

export default workflowGenerator;

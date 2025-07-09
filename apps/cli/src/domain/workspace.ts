import { ok } from "neverthrow";
import { z } from "zod/v4";

import { Dependencies } from "./dependencies.js";
import { ValidationCheckResult } from "./validation.js";

const WorkspaceName = z.string().min(1).brand<"WorkspaceName">();

export const workspaceSchema = z.object({
  name: WorkspaceName,
  path: z.string(),
});

export type Workspace = z.infer<typeof workspaceSchema>;

export const checkWorkspaces =
  (monorepoDir: string) =>
  async (
    dependencies: Pick<Dependencies, "repositoryReader">,
  ): Promise<ValidationCheckResult> => {
    const { repositoryReader } = dependencies;
    const checkName = "Workspaces";

    const workspacesResult = await repositoryReader.getWorkspaces(monorepoDir);
    if (workspacesResult.isErr()) {
      return ok({
        checkName,
        errorMessage:
          "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
        isValid: false,
      });
    }

    const workspaces = workspacesResult.value;
    const nonRootWorkspaces = workspaces.filter(
      ({ path }) => path !== monorepoDir,
    );

    if (nonRootWorkspaces.length === 0) {
      return ok({
        checkName,
        errorMessage:
          "No workspaces found in the repository. Make sure to have at least one workspace configured.",
        isValid: false,
      });
    }

    const workspacesNumber = nonRootWorkspaces.length;

    return ok({
      checkName,
      isValid: true,
      successMessage: `Found ${workspacesNumber} ${
        workspacesNumber === 1 ? "workspace" : "workspaces"
      } in the repository`,
    });
  };

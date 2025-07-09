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
    dependencies: Pick<Dependencies, "packageJsonReader" | "repositoryReader">,
  ): Promise<ValidationCheckResult> => {
    const { packageJsonReader, repositoryReader } = dependencies;
    const checkName = "Workspaces";

    const [packageJsonWorkspacesResult, repositoryWorkspacesResult] =
      await Promise.all([
        packageJsonReader.getWorkspaces(monorepoDir),
        repositoryReader.getWorkspaces(monorepoDir),
      ]);

    if (
      repositoryWorkspacesResult.isErr() ||
      packageJsonWorkspacesResult.isErr()
    ) {
      return ok({
        checkName,
        errorMessage:
          "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
        isValid: false,
      });
    }

    const workspacesDefinedInFile = repositoryWorkspacesResult.value;
    const workspacesDefinedInPackageJson = packageJsonWorkspacesResult.value;

    const hasRepositoryWorkspaces = workspacesDefinedInFile.length > 0;
    const hasPackageJsonWorkspaces = workspacesDefinedInPackageJson.length > 0;

    if (!hasRepositoryWorkspaces && !hasPackageJsonWorkspaces) {
      return ok({
        checkName,
        errorMessage:
          "No workspace configuration found. Make sure to configure workspaces in either pnpm-workspace.yaml or package.json.",
        isValid: false,
      });
    }

    if (hasRepositoryWorkspaces || hasPackageJsonWorkspaces) {
      const workspacesNumber = hasRepositoryWorkspaces
        ? workspacesDefinedInFile.length
        : workspacesDefinedInPackageJson.length;

      return ok({
        checkName,
        isValid: true,
        successMessage: `Found ${workspacesNumber} workspace${
          workspacesNumber === 1 ? "" : "s"
        }`,
      });
    }

    return ok({
      checkName,
      errorMessage:
        "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
      isValid: false,
    });
  };

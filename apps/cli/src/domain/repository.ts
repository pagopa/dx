import { ok, Result } from "neverthrow";

import { Dependencies } from "./dependencies.js";
import { ValidationCheckResult } from "./validation.js";

export interface RepositoryReader {
  existsPreCommitConfig(repoRoot: string): Result<boolean, Error>;
  existsTurboConfig(repoRoot: string): Result<boolean, Error>;
  findRepositoryRoot(cwd: string): Result<string, Error>;
}

export const checkPreCommitConfig =
  (monorepoDir: string) =>
  async (
    dependencies: Pick<Dependencies, "repositoryReader">,
  ): Promise<ValidationCheckResult> => {
    const { repositoryReader } = dependencies;
    const checkName = "Pre-commit Configuration";

    const preCommitResult = repositoryReader.existsPreCommitConfig(monorepoDir);
    if (preCommitResult.isErr()) {
      return ok({
        checkName,
        errorMessage: preCommitResult.error.message,
        isValid: false,
      });
    }

    return ok({
      checkName,
      isValid: true,
      successMessage:
        "Pre-commit configuration is present in the repository root",
    });
  };

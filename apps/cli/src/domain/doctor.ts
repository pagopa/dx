import { ResultAsync } from "neverthrow";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { checkMonorepoScripts } from "./package-json.js";
import { checkPreCommitConfig } from "./repository.js";
import { checkTurboConfig } from "./repository.js";
import { ValidationCheck, ValidationCheckResult } from "./validation.js";
import { checkWorkspaces } from "./workspace.js";

type DoctorResult = {
  checks: ValidationCheck[];
  hasErrors: boolean;
};

export const runDoctor = async (dependencies: Dependencies, config: Config) => {
  // Get repository root - doctor command requires being in a repository
  const repoRootResult =
    await dependencies.repositoryReader.findRepositoryRoot();

  if (repoRootResult.isErr()) {
    return {
      checks: [
        {
          checkName: "Repository Detection",
          errorMessage:
            "Could not find repository root. Make sure to run this command inside a Git repository.",
          isValid: false,
        },
      ],
      hasErrors: true,
    } satisfies DoctorResult;
  }

  const repositoryRoot = repoRootResult.value;

  const doctorChecks = [
    ResultAsync.fromPromise(
      checkPreCommitConfig(dependencies, repositoryRoot),
      () => new Error("Error checking pre-commit configuration"),
    ),
    ResultAsync.fromPromise(
      checkTurboConfig(dependencies, repositoryRoot, config),
      () => new Error("Error checking Turbo configuration"),
    ),
    ResultAsync.fromPromise(
      checkMonorepoScripts(dependencies, repositoryRoot),
      () => new Error("Error checking monorepo scripts"),
    ),
    ResultAsync.fromPromise(
      checkWorkspaces(dependencies, repositoryRoot),
      () => new Error("Error checking monorepo scripts"),
    ),
  ];
  return ResultAsync.combine(doctorChecks).match(
    toDoctorResult,
    (): DoctorResult => ({
      checks: [],
      hasErrors: true,
    }),
  );
};

const toDoctorResult = (
  validationCheckResults: ValidationCheckResult[],
): DoctorResult => {
  const checks = validationCheckResults.map((result) => {
    if (result.isOk()) {
      return result.value;
    }
    return {
      checkName: "Unknown",
      errorMessage: result.error.message,
      isValid: false,
    } satisfies ValidationCheck;
  });

  const hasErrors = checks.some((check) => !check.isValid);

  return {
    checks,
    hasErrors,
  };
};

export const printDoctorResult = (
  { validationReporter }: Dependencies,
  result: DoctorResult,
) => result.checks.map(validationReporter.reportCheckResult);

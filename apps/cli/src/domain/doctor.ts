import { ResultAsync } from "neverthrow";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { checkMonorepoScripts } from "./package-json.js";
import { checkNxConfig, checkPreCommitConfig } from "./repository.js";
import { ValidationCheck, ValidationCheckResult } from "./validation.js";
import { checkWorkspaces } from "./workspace.js";

export type DoctorOptions = {
  repositoryPath?: string;
};

type DoctorCheckDefinition = {
  run: () => ResultAsync<ValidationCheckResult, Error>;
};

type DoctorResult = {
  checks: ValidationCheck[];
  hasErrors: boolean;
};

export const runDoctor = async (
  dependencies: Dependencies,
  config: Config,
  options: DoctorOptions = {},
) => {
  // Get repository root - doctor command requires being in a repository
  const repoRootResult = await dependencies.repositoryReader.findRepositoryRoot(
    options.repositoryPath,
  );

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

  const doctorCheckDefinitions: DoctorCheckDefinition[] = [
    {
      run: () =>
        ResultAsync.fromPromise(
          checkPreCommitConfig(dependencies, repositoryRoot),
          () => new Error("Error checking pre-commit configuration"),
        ),
    },
    {
      run: () =>
        ResultAsync.fromPromise(
          checkNxConfig(dependencies, repositoryRoot, config),
          () => new Error("Error checking Nx configuration"),
        ),
    },
    {
      run: () =>
        ResultAsync.fromPromise(
          checkMonorepoScripts(dependencies, repositoryRoot),
          () => new Error("Error checking monorepo scripts"),
        ),
    },
    {
      run: () =>
        ResultAsync.fromPromise(
          checkWorkspaces(dependencies, repositoryRoot),
          () => new Error("Error checking workspaces"),
        ),
    },
  ];

  return ResultAsync.combine(
    doctorCheckDefinitions.map(({ run }) => run()),
  ).match(
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

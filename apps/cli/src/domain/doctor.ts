import { ResultAsync } from "neverthrow";

import { Config } from "../config.js";
import { Dependencies } from "./dependencies.js";
import { checkMonorepoScripts } from "./package-json.js";
import { checkPreCommitConfig } from "./repository.js";
import { checkTurboConfig } from "./repository.js";
import { ValidationCheck, ValidationCheckResult } from "./validation.js";

export interface DoctorEnv {
  doctor: (config: Config) => Promise<DoctorResult>;
  printResult: (result: DoctorResult) => void;
}

interface DoctorResult {
  checks: ValidationCheck[];
  hasErrors: boolean;
}

export const makeDoctorEnv = (dependencies: Dependencies): DoctorEnv => ({
  doctor: runDoctor(dependencies),
  printResult: printDoctorResult(dependencies),
});

const runDoctor =
  (dependencies: Dependencies): DoctorEnv["doctor"] =>
  (config) =>
    dependencies.repositoryReader
      .findRepositoryRoot(process.cwd())
      .andThen((repoRoot) => {
        const doctorChecks = [
          ResultAsync.fromPromise(
            checkPreCommitConfig(repoRoot)(dependencies),
            () => new Error("Error checking pre-commit configuration"),
          ),
          ResultAsync.fromPromise(
            checkTurboConfig(repoRoot)(dependencies, config),
            () => new Error("Error checking Turbo configuration"),
          ),
          ResultAsync.fromPromise(
            checkMonorepoScripts(repoRoot)(dependencies),
            () => new Error("Error checking monorepo scripts"),
          ),
        ];
        return ResultAsync.combine(doctorChecks);
      })
      .match(
        toDoctorResult,
        (): DoctorResult => ({
          checks: [],
          hasErrors: true,
        }),
      );

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

const printDoctorResult =
  ({ validationReporter }: Dependencies): DoctorEnv["printResult"] =>
  ({ checks }) => {
    checks.map(validationReporter.reportCheckResult);
  };

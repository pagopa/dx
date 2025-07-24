import { Result } from "neverthrow";

export type ValidationCheck = FailedCheck | SuccessfulCheck;

export type ValidationCheckResult = Result<ValidationCheck, Error>;

export type ValidationReporter = {
  reportCheckResult(result: ValidationCheck): void;
  reportValidationResult(result: ValidationCheckResult): void;
};

type FailedCheck = Pick<SuccessfulCheck, "checkName"> & {
  errorMessage: string;
  isValid: false;
};

type SuccessfulCheck = {
  checkName: string;
  isValid: true;
  successMessage: string;
};

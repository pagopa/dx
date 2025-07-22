import { Result } from "neverthrow";

export type ValidationCheck = FailedCheck | SuccessfulCheck;

export type ValidationCheckResult = Result<ValidationCheck, Error>;

export interface ValidationReporter {
  reportCheckResult(result: ValidationCheck): void;
  reportValidationResult(result: ValidationCheckResult): void;
}

interface FailedCheck extends Pick<SuccessfulCheck, "checkName"> {
  errorMessage: string;
  isValid: false;
}

interface SuccessfulCheck {
  checkName: string;
  isValid: true;
  successMessage: string;
}

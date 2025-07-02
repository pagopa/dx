import { Result } from "neverthrow";

interface SuccessfulCheck {
  checkName: string;
  isValid: true;
  successMessage: string;
}

interface FailedCheck extends Pick<SuccessfulCheck, "checkName"> {
  errorMessage: string;
  isValid: false;
}

export type ValidationCheck = FailedCheck | SuccessfulCheck;

export type ValidationCheckResult = Result<ValidationCheck, Error>;

export interface ValidationReporter {
  reportValidationResult(result: ValidationCheckResult): void;
}

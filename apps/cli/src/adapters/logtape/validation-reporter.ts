import { getLogger } from "@logtape/logtape";

import { ValidationReporter } from "../../domain/validation.js";

export const makeValidationReporter = (): ValidationReporter => {
  const logger = getLogger(["dx-cli", "validation"]);

  return {
    reportCheckResult(result): void {
      if (result.isValid) {
        logger.info(`✅ ${result.successMessage}`);
      } else {
        logger.error(`❌ ${result.errorMessage}`);
      }
    },
  };
};

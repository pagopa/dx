import { getLogger } from "@logtape/logtape";

import {
  ValidationCheckResult,
  ValidationReporter,
} from "../../domain/validation.js";

export const makeValidationReporter = (): ValidationReporter => {
  const logger = getLogger(["dx-cli", "validation"]);

  return {
    reportValidationResult(result: ValidationCheckResult): void {
      if (result.isOk()) {
        const validation = result.value;
        if (validation.isValid) {
          logger.info(`✅ ${validation.successMessage}`);
        } else {
          logger.error(`❌ ${validation.errorMessage}`);
        }
      } else {
        logger.error(`❌ ${result.error.message}`);
      }
    },
  };
};

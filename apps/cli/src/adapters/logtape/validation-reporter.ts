import { getLogger } from "@logtape/logtape";

import {
  ValidationCheckResult,
  ValidationReporter,
} from "../../domain/validation.js";

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

import { logger } from "./logger";
import {
  calculateNextStep,
  RequestsQueryParams
} from "./monitoring";
import { getCanaryConfigOrExit } from "./env";

const currentPercentageArg = process.argv[2];
const currentPercentage = parseInt(currentPercentageArg, 10);

const canaryConfig = getCanaryConfigOrExit();

if (
  isNaN(currentPercentage) ||
  currentPercentage < 0 ||
  currentPercentage > 100
) {
  logger.error("Invalid currentPercentage argument.");
  process.exit(1);
}

const params: RequestsQueryParams[] = [
  {
    query: `
    AppRequests
    | where TimeGenerated > ago(${Math.floor(
      canaryConfig.CANARY_NEXT_STEP_AFTER_MS / 1000
    )}s)
    | where AppRoleName == "${canaryConfig.FUNCTION_APP_NAME}-staging"
    | summarize totalRequests = count(), failedRequests = countif(toint(ResultCode) > 499)
  `,
    failureRequestKey: "failedRequests",
    failureThreshold: 0.5, // 0.5 percent failure rate or 99.5% availability
    totalRequestKey: "totalRequests"
  }
];

calculateNextStep(currentPercentage, params).catch(err => {
  logger.error(`Unexpected Error executing canary monitoring: ${err}`);
  process.exit(1);
});

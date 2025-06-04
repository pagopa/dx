import {
  Durations,
  LogsQueryClient,
  LogsQueryResultStatus,
  LogsTable,
} from "@azure/monitor-query";
import { DefaultAzureCredential } from "@azure/identity";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers.js";
import { pipe } from "fp-ts/lib/function.js";
import * as E from "fp-ts/lib/Either.js";
import { getCanaryConfigOrExit } from "./env";
import { logger } from "./logger";

type IncrementOutput = {
  nextIncrementPercentage: number;
  afterMs: number;
};

type SwapOutput = {
  swap: boolean;
};

type ScriptOutput = IncrementOutput | SwapOutput;

export type RequestsQueryParams = {
  query: string;
  totalRequestKey: string;
  failureRequestKey: string;
  failureThreshold: number;
};

const config = getCanaryConfigOrExit();

export async function calculateNextStep(
  currentPercentage: number,
  requetsQueryParams: RequestsQueryParams[],
) {
  const azureLogAnalyticsWorkspaceId = process.env.LOG_ANALITYCS_WORKSPACE_ID;
  const logsQueryClient = new LogsQueryClient(new DefaultAzureCredential());

  if (!azureLogAnalyticsWorkspaceId) {
    logger.error("LOG_ANALITYCS_WORKSPACE_ID is not set.");
    process.exit(1);
  }

  try {
    requetsQueryParams.forEach(async (params) => {
      const result = await logsQueryClient.queryWorkspace(
        azureLogAnalyticsWorkspaceId,
        params.query,
        {
          duration: Durations.fiveMinutes,
        },
      );
      if (result.status === LogsQueryResultStatus.Success) {
        const tablesFromResult: LogsTable[] = result.tables;

        if (tablesFromResult.length === 0) {
          logger.error(`No results for query '${params.query}'`);
          return;
        }
        const table = processTables(tablesFromResult);
        const totalRequests = pipe(
          NonNegativeInteger.decode(table[0][params.totalRequestKey]),
          E.getOrElseW(() => {
            throw new Error("Invalid value from query");
          }),
        );
        const failedRequests = pipe(
          NonNegativeInteger.decode(table[0][params.failureRequestKey]),
          E.getOrElseW(() => {
            throw new Error("Invalid value from query");
          }),
        );
        const failureRate = (failedRequests / totalRequests) * 100;

        if (failureRate > params.failureThreshold && !isNaN(failureRate)) {
          logger.error("Failure rate exceeds acceptable threshold or invalid.");
          process.exit(1);
        }
      } else {
        logger.error("No data returned from Lognalitycs");
        process.exit(1);
      }
    });

    const nextPercentage = currentPercentage + config.CANARY_INCREMENT_STEP;

    if (nextPercentage >= 100) {
      const output: SwapOutput = { swap: true };
      scriptOutput(output);
    } else {
      const output: IncrementOutput = {
        nextIncrementPercentage: nextPercentage,
        afterMs: config.CANARY_NEXT_STEP_AFTER_MS,
      };
      scriptOutput(output);
    }

    process.exit(0);
  } catch (err) {
    logger.error("Error executing the query: ", err);
    process.exit(1);
  }
}

function processTables(
  tablesFromResult: LogsTable[],
): Array<Record<string, unknown>> {
  for (const table of tablesFromResult) {
    const columns = table.columnDescriptors.map((column) => column.name);
    return table.rows.map((row) =>
      row.reduce(
        (prev: Record<string, unknown>, columnValue, index) => ({
          ...prev,
          [`${columns[index]}`]: columnValue,
        }),
        {} as Record<string, unknown>,
      ),
    );
  }
  return [];
}

const scriptOutput = (scriptOutputValue: ScriptOutput): void =>
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(scriptOutputValue));

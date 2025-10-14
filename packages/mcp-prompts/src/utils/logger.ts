import pino from "pino";
import { pinoLambdaDestination } from "pino-lambda";

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    ...(isLambda
      ? {}
      : {
          transport: {
            target: "pino-pretty",
          },
        }),
  },
  isLambda ? pinoLambdaDestination() : undefined,
);

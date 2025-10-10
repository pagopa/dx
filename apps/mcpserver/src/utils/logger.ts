import pino from "pino";
import { pinoLambdaDestination } from "pino-lambda";

// Creates a Pino logger instance configured for Lambda environments.
const destination = pinoLambdaDestination();

export const logger = pino(
  {
    transport: {
      target: "pino-pretty",
    },
  },
  destination,
);

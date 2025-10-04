import pino from "pino";
import { pinoLambdaDestination } from "pino-lambda";

const destination = pinoLambdaDestination();

export const logger = pino(
  {
    transport: {
      target: "pino-pretty",
    },
  },
  destination,
);

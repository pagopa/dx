import { Result } from "neverthrow";

export const toJSON = Result.fromThrowable(
  JSON.parse,
  (cause) => new Error("Failed to parse JSON", { cause }),
);

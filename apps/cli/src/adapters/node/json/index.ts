import { Result } from "neverthrow";

export const parseJson = Result.fromThrowable(
  JSON.parse,
  (cause) => new Error("Failed to parse JSON", { cause }),
);

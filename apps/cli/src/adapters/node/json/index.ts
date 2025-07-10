import { Result } from "neverthrow";

export const toJSON = Result.fromThrowable(
  JSON.parse,
  () => new Error("Failed to parse JSON"),
);

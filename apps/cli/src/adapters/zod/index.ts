import { ResultAsync } from "neverthrow";
import { z } from "zod/v4";

export const decode =
  <T>(schema: z.ZodSchema<T>) =>
  (data: unknown): ResultAsync<T, Error> =>
    ResultAsync.fromPromise(
      schema.parseAsync(data),
      (cause) =>
        new Error("Input is not valid for the given schema", { cause }),
    );

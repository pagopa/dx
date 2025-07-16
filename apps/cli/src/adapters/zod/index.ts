import { ResultAsync } from "neverthrow";
import { z } from "zod/v4";

export const decode = <T>(schema: z.ZodSchema<T>) =>
  ResultAsync.fromThrowable(
    schema.parseAsync,
    (cause) =>
      new Error("File content is not valid for the given schema", { cause }),
  );

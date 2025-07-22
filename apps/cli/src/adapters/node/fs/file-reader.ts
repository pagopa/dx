import { Result, ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import { z } from "zod/v4";

/**
 * Generic function to read a file and parse its content with a given zod schema.
 *
 * @param filePath - The path to the file to read
 * @param schema - The zod schema to parse the file content with
 * @returns ResultAsync with the parsed data or an error
 */
export const readFileAndDecode = <T>(
  filePath: string,
  schema: z.ZodSchema<T>,
): ResultAsync<T, Error> => {
  const decode = ResultAsync.fromThrowable(
    schema.parseAsync,
    () => new Error("File content is not valid for the given schema"),
  );

  const toJSON = Result.fromThrowable(
    JSON.parse,
    () => new Error("Failed to parse JSON"),
  );

  return ResultAsync.fromPromise(
    fs.readFile(filePath, "utf-8"),
    (cause) => new Error(`Failed to read file: ${filePath}`, { cause }),
  )
    .andThen(toJSON)
    .andThen(decode);
};

export const fileExists = (path: string): ResultAsync<boolean, Error> =>
  ResultAsync.fromPromise(
    fs.stat(path),
    () => new Error(`${path} not found.`),
  ).map(() => true);

import { ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import { z } from "zod/v4";

import { decode } from "../../zod/index.js";
import { toJSON } from "../json/index.js";

/**
 * Reads a file from a directory with a specific filename.
 *
 * @param filePath - The path to the file to read
 * @returns ResultAsync with file content or error
 */
export const readFile = (filePath: string): ResultAsync<string, Error> =>
  ResultAsync.fromPromise(
    fs.readFile(filePath, "utf-8"),
    (cause) => new Error(`Failed to read file: ${filePath}`, { cause }),
  );

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
): ResultAsync<T, Error> =>
  readFile(filePath).andThen(toJSON).andThen(decode(schema));

/**
 * Checks if a file exists.
 *
 * @param path - The path to the file to check
 * @returns ResultAsync with true if the file exists, false otherwise
 */
export const fileExists = (path: string): ResultAsync<boolean, Error> =>
  ResultAsync.fromPromise(
    fs.stat(path),
    () => new Error(`${path} not found.`),
  ).map(() => true);

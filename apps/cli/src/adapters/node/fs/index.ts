import { ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import { join } from "node:path";

/**
 * Reads a file from a directory with a specific filename.
 * @param directory - The directory containing the file
 * @param filename - The name of the file to read
 * @returns ResultAsync with file content or error
 */
export const readFile = (
  directory: string,
  filename: string,
): ResultAsync<string, Error> =>
  ResultAsync.fromPromise(
    fs.readFile(join(directory, filename), "utf-8"),
    () => new Error(`Failed to read file: ${join(directory, filename)}`),
  );

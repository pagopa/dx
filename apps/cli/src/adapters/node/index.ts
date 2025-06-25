import { Result, ResultAsync } from "neverthrow";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as process from "node:process";

import { NodeReader } from "../../domain/node.js";
import { PackageJsonSchema, ScriptsArraySchema } from "./codec.js";

const toJSON = Result.fromThrowable(
  JSON.parse,
  () => new Error("Failed to parse JSON"),
);

const toPackageJson = Result.fromThrowable(
  PackageJsonSchema.parse,
  () => new Error("Invalid package.json format"),
);

const toScriptsArray = Result.fromThrowable(
  ScriptsArraySchema.parse,
  () => new Error("Failed to validate scripts array"),
);

export const makeNodeReader = (): NodeReader => ({
  getScripts: (cwd = process.cwd()) => {
    const packageJsonPath = join(cwd, "package.json");

    return ResultAsync.fromPromise(
      readFile(packageJsonPath, "utf-8"),
      () => new Error("Failed to read package.json"),
    )
      .andThen(toJSON)
      .andThen(toPackageJson)
      .map(({ scripts }) => scripts)
      .andThen(toScriptsArray);
  },
});

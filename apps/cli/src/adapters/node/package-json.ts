import { Result, ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import { join } from "node:path";
import * as process from "node:process";

import {
  PackageJsonReader,
  RootRequiredScript,
  Script,
} from "../../domain/package-json.js";
import {
  dependenciesArraySchema,
  packageJsonSchema,
  scriptsArraySchema,
} from "./codec.js";

const toJSON = Result.fromThrowable(
  JSON.parse,
  () => new Error("Failed to parse JSON"),
);

const toPackageJson = Result.fromThrowable(
  packageJsonSchema.parse,
  () => new Error("Invalid package.json format"),
);

const toScriptsArray = Result.fromThrowable(
  scriptsArraySchema.parse,
  () => new Error("Failed to validate scripts array"),
);

const toDependenciesArray = Result.fromThrowable(
  dependenciesArraySchema.parse,
  () => new Error("Failed to validate dependencies array"),
);

export const makePackageJsonReader = (): PackageJsonReader => ({
  getDependencies: (cwd = process.cwd(), type) => {
    const packageJsonPath = join(cwd, "package.json");

    return ResultAsync.fromPromise(
      fs.readFile(packageJsonPath, "utf-8"),
      () => new Error("Failed to read package.json"),
    )
      .andThen(toJSON)
      .andThen(toPackageJson)
      .map((packageJson) => {
        const key = type === "dev" ? "devDependencies" : "dependencies";
        return packageJson[key];
      })
      .andThen(toDependenciesArray);
  },

  getRootRequiredScripts: (): RootRequiredScript[] => [
    { name: "code-review" as Script["name"] },
  ],

  getScripts: (cwd = process.cwd()) => {
    const packageJsonPath = join(cwd, "package.json");

    return ResultAsync.fromPromise(
      fs.readFile(packageJsonPath, "utf-8"),
      () => new Error("Failed to read package.json"),
    )
      .andThen(toJSON)
      .andThen(toPackageJson)
      .map(({ scripts }) => scripts)
      .andThen(toScriptsArray);
  },
});

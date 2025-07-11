import { ResultAsync } from "neverthrow";
import { join } from "node:path";
import * as process from "node:process";

import {
  dependenciesArraySchema,
  PackageJson,
  PackageJsonReader,
  packageJsonSchema,
  RootRequiredScript,
  Script,
  scriptsArraySchema,
} from "../../domain/package-json.js";
import { readFileAndDecode } from "./fs/file-reader.js";

const toScriptsArray = ResultAsync.fromThrowable(
  scriptsArraySchema.parseAsync,
  () => new Error("Failed to validate scripts array"),
);

const toDependenciesArray = ResultAsync.fromThrowable(
  dependenciesArraySchema.parseAsync,
  () => new Error("Failed to validate dependencies array"),
);

export const makePackageJsonReader = (): PackageJsonReader => ({
  getDependencies: (cwd = process.cwd(), type) => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema)
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

    return readFileAndDecode(packageJsonPath, packageJsonSchema)
      .map(({ scripts }) => scripts)
      .andThen(toScriptsArray);
  },

  readPackageJson: (cwd = process.cwd()): ResultAsync<PackageJson, Error> => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema);
  },
});

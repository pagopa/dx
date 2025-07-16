import { ResultAsync } from "neverthrow";
import { join } from "node:path";
import * as process from "node:process";

import {
  PackageJson,
  PackageJsonReader,
  packageJsonSchema,
  Script,
} from "../../domain/package-json.js";
import { readFileAndDecode } from "./fs/file-reader.js";

export const makePackageJsonReader = (): PackageJsonReader => ({
  getDependencies: (cwd = process.cwd(), type) => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema).map(
      (packageJson) => {
        const key = type === "dev" ? "devDependencies" : "dependencies";
        return packageJson[key];
      },
    );
  },

  getRootRequiredScripts: (): Map<Script["name"], Script["script"]> =>
    new Map().set("code-review", "eslint ."),

  getScripts: (cwd = process.cwd()) => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema).map(
      ({ scripts }) => scripts,
    );
  },

  readPackageJson: (cwd = process.cwd()): ResultAsync<PackageJson, Error> => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema);
  },
});

import { join } from "node:path";
import * as process from "node:process";

import {
  PackageJsonReader,
  packageJsonSchema,
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

  getRootRequiredScripts: () => new Map().set("code-review", "eslint ."),

  getScripts: (cwd = process.cwd()) => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema).map(
      ({ scripts }) => scripts,
    );
  },

  readPackageJson: (cwd = process.cwd()) => {
    const packageJsonPath = join(cwd, "package.json");

    return readFileAndDecode(packageJsonPath, packageJsonSchema);
  },

  // TODO: Improve this. For now this returns an empty array.
  getWorkspaces: (cwd = process.cwd()) => {
    const packageJsonPath = join(cwd, "package.json");

    return ResultAsync.fromPromise(
      fs.readFile(packageJsonPath, "utf-8"),
      () => new Error("Failed to read package.json"),
    )
      .andThen(toJSON)
      .andThen(toPackageJson)
      .map(() => []);
  },
});

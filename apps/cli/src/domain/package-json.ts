import { err, ok, ResultAsync } from "neverthrow";
import { z } from "zod/v4";

import { Dependencies } from "./dependencies.js";
import { ValidationCheckResult } from "./validation.js";

const ScriptName = z.string().brand<"ScriptName">();

export const scriptSchema = z.object({
  name: ScriptName,
  script: z.string(),
});

const DependencyName = z.string().brand<"DependencyName">();

export const dependencySchema = z.object({
  name: DependencyName,
  version: z.string(),
});

const PackageName = z.string().min(1).brand<"PackageName">();
export type PackageName = z.infer<typeof PackageName>;

const scriptsSchema = z
  .record(ScriptName, z.string())
  .optional()
  .transform(
    (obj) =>
      new Map<z.infer<typeof ScriptName>, string>(
        obj
          ? Object.entries(obj).map(([name, script]) => [
              ScriptName.parse(name),
              script,
            ])
          : [],
      ),
  );

const dependenciesSchema = z
  // An object where keys are Dependency["name"] and values are their versions (string for now, but we could type them as well)
  .record(DependencyName, z.string())
  .optional()
  // Transform the record into a Map<Dependency["name"], Dependency["version"]>
  .transform(
    (obj) =>
      new Map<Dependency["name"], Dependency["version"]>(
        obj
          ? Object.entries(obj).map(([name, version]) => [
              DependencyName.parse(name),
              version,
            ])
          : [],
      ),
  );

export const packageJsonSchema = z.object({
  dependencies: dependenciesSchema,
  devDependencies: dependenciesSchema,
  name: PackageName,
  packageManager: z.string().optional(),
  scripts: scriptsSchema,
});

export type Dependency = z.infer<typeof dependencySchema>;
export type DependencyName = z.infer<typeof DependencyName>;
export type PackageJson = z.infer<typeof packageJsonSchema>;

export interface PackageJsonReader {
  getDependencies(
    cwd: string,
    type: "dev" | "prod",
  ): ResultAsync<Map<Dependency["name"], Dependency["version"]>, Error>;
  getRootRequiredScripts(): Map<Script["name"], Script["script"]>;
  getScripts(
    cwd: string,
  ): ResultAsync<Map<Script["name"], Script["script"]>, Error>;
  readPackageJson(cwd: string): ResultAsync<PackageJson, Error>;
}

export type RootRequiredScript = Pick<Script, "name">;
export type Script = z.infer<typeof scriptSchema>;

const findMissingScripts = (
  availableScripts: Map<Script["name"], Script["script"]>,
  requiredScripts: Map<Script["name"], Script["script"]>,
) => {
  const availableScriptNames = new Set(availableScripts.keys());
  const requiredScriptNames = new Set(requiredScripts.keys());
  // Returns a set of scripts that are required, but not listed in the package.json
  return requiredScriptNames.difference(availableScriptNames);
};

export const checkMonorepoScripts = async (
  dependencies: Pick<Dependencies, "packageJsonReader">,
  monorepoDir: string,
): Promise<ValidationCheckResult> => {
  const { packageJsonReader } = dependencies;
  const checkName = "Monorepo Scripts";

  const scriptsResult = await packageJsonReader.getScripts(monorepoDir);

  if (scriptsResult.isErr()) {
    return err(scriptsResult.error);
  }

  const requiredScriptsMap = packageJsonReader.getRootRequiredScripts();
  const missingScripts = findMissingScripts(
    scriptsResult.value,
    requiredScriptsMap,
  );

  if (missingScripts.size === 0) {
    return ok({
      checkName,
      isValid: true,
      successMessage: "Monorepo scripts are correctly set up",
    });
  }

  return ok({
    checkName,
    errorMessage: `Missing required scripts: ${Array.from(missingScripts).join(", ")}`,
    isValid: false,
  });
};

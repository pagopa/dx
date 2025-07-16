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

const scriptsRecordSchema = z.record(z.string(), z.string()).optional();

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

/**
 * Transform a record (if present) into an array of Script objects.
 * If the record is not present, it returns an empty array.
 */
export const scriptsArraySchema = scriptsRecordSchema.transform((obj) =>
  obj
    ? Object.entries(obj).map(([name, script]) =>
        scriptSchema.parse({ name, script }),
      )
    : [],
);

export const packageJsonSchema = z.object({
  dependencies: dependenciesSchema,
  devDependencies: dependenciesSchema,
  name: PackageName,
  scripts: scriptsRecordSchema,
});

export type Dependency = z.infer<typeof dependencySchema>;
export type DependencyName = z.infer<typeof DependencyName>;
export type PackageJson = z.infer<typeof packageJsonSchema>;

export interface PackageJsonReader {
  getDependencies(
    cwd: string,
    type: "dev" | "prod",
  ): ResultAsync<Map<Dependency["name"], Dependency["version"]>, Error>;
  getRootRequiredScripts(): RootRequiredScript[];
  getScripts(cwd: string): ResultAsync<Script[], Error>;
  readPackageJson(cwd: string): ResultAsync<PackageJson, Error>;
}

export type RootRequiredScript = Pick<Script, "name">;
export type Script = z.infer<typeof scriptSchema>;

const findMissingScripts = (
  availableScripts: Script[],
  requiredScripts: RootRequiredScript[],
) => {
  const availableScriptNames = new Set(
    availableScripts.map(({ name }) => name),
  );
  const requiredScriptNames = new Set(requiredScripts.map(({ name }) => name));
  // Returns a set of scripts that are required, but not listed in the package.json
  return requiredScriptNames.difference(availableScriptNames);
};

export const checkMonorepoScripts =
  (monorepoDir: string) =>
  async (
    dependencies: Pick<Dependencies, "packageJsonReader">,
  ): Promise<ValidationCheckResult> => {
    const { packageJsonReader } = dependencies;
    const checkName = "Monorepo Scripts";

    const scriptsResult = await packageJsonReader.getScripts(monorepoDir);

    if (scriptsResult.isErr()) {
      return err(scriptsResult.error);
    }

    const requiredScripts = packageJsonReader.getRootRequiredScripts();
    const missingScripts = findMissingScripts(
      scriptsResult.value,
      requiredScripts,
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

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

const PackageJsonName = z.string().min(1).brand<"PackageJsonName">();
export type PackageJsonName = z.infer<typeof PackageJsonName>;

const scriptsRecordSchema = z.record(z.string(), z.string()).optional();

const dependenciesRecordSchema = z.record(z.string(), z.string()).optional();

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

/**
 * Transform a dependencies object (if present) into an array of Dependency objects.
 * If the record is not present, it returns an empty array.
 */
export const dependenciesArraySchema = dependenciesRecordSchema.transform(
  (obj) =>
    obj
      ? Object.entries(obj).map(([name, version]) =>
          dependencySchema.parse({ name, version }),
        )
      : [],
);

export const packageJsonSchema = z.object({
  dependencies: dependenciesRecordSchema,
  devDependencies: dependenciesRecordSchema,
  name: PackageJsonName,
  scripts: scriptsRecordSchema,
});

export type Dependency = z.infer<typeof dependencySchema>;
export type DependencyName = z.infer<typeof DependencyName>;
export type PackageJson = z.infer<typeof packageJsonSchema>;

export interface PackageJsonReader {
  getDependencies(
    cwd: string,
    type: "dev" | "prod",
  ): ResultAsync<Dependency[], Error>;
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
  const availableScriptNames = availableScripts.map(({ name }) => name);
  const requiredScriptNames = requiredScripts.map(({ name }) => name);

  return requiredScriptNames.filter(
    (required) => !availableScriptNames.includes(required),
  );
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

    if (missingScripts.length === 0) {
      return ok({
        checkName,
        isValid: true,
        successMessage: "Monorepo scripts are correctly set up",
      });
    }

    return ok({
      checkName,
      errorMessage: `Missing required scripts: ${missingScripts.join(", ")}`,
      isValid: false,
    });
  };

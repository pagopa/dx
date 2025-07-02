import { ResultAsync, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { Dependencies } from "./dependencies.js";
import { ValidationCheckResult } from "./validation.js";

const ScriptName = z.string().brand<"ScriptName">();

export const scriptSchema = z.object({
  name: ScriptName,
  script: z.string(),
});

export type Script = z.infer<typeof scriptSchema>;
export type RootRequiredScript = Pick<Script, "name">;

export interface PackageJsonReader {
  getRootRequiredScripts(): RootRequiredScript[];
  getScripts(cwd: string): ResultAsync<Script[], Error>;
}

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

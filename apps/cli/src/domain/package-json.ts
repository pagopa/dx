import { ResultAsync, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { Dependencies } from "./dependencies.js";

const ScriptName = z.string().brand<"ScriptName">();

export const scriptSchema = z.object({
  name: ScriptName,
  script: z.string(),
});

export type Script = z.infer<typeof scriptSchema>;
export type MonorepoRequiredScript = Pick<Script, "name">;

export interface PackageJsonReader {
  getRootRequiredScripts(): MonorepoRequiredScript[];
  getScripts(cwd: string): ResultAsync<Script[], Error>;
}

const validateRequiredScripts = (
  scripts: Script[],
  requiredScripts: MonorepoRequiredScript[],
) => {
  const scriptNames = scripts.map(({ name }) => name);
  const requiredScriptNames = requiredScripts.map(({ name }) => name);
  const missingScripts = requiredScriptNames.filter(
    (rootScript) => !scriptNames.includes(rootScript),
  );

  return {
    isValid: missingScripts.length === 0,
    missingScripts,
  };
};

export const checkMonorepoScripts =
  (monorepoDir: string) =>
  async (dependencies: Pick<Dependencies, "logger" | "packageJsonReader">) => {
    const { logger, packageJsonReader } = dependencies;

    const scriptsResult = await packageJsonReader.getScripts(monorepoDir);

    if (scriptsResult.isErr()) {
      logger.error(scriptsResult.error.message);
      return err(scriptsResult.error);
    }

    const requiredScripts = packageJsonReader.getRootRequiredScripts();
    const { isValid, missingScripts } = validateRequiredScripts(
      scriptsResult.value,
      requiredScripts,
    );

    if (isValid) {
      logger.success("Monorepo scripts are correctly set up");
      return ok();
    }

    const errorMessage = `Missing required scripts: ${missingScripts.join(", ")}`;
    logger.error(errorMessage);
    return err(new Error(errorMessage));
  };

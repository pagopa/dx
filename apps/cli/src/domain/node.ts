import { ResultAsync, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { Dependencies } from "./dependencies.js";

const ScriptName = z.string().brand<"ScriptName">();

export const scriptSchema = z.object({
  name: ScriptName,
  script: z.string(),
});

export type Script = z.infer<typeof scriptSchema>;

export interface NodeReader {
  getScripts(cwd: string): ResultAsync<Script[], Error>;
}

const validateRequiredScripts = (scripts: Script[]) => {
  // List of scripts that are required in the root package.json
  const requiredRootScripts = ["code-review"] as Script["name"][];
  const scriptNames = scripts.map(({ name }) => name);
  const missingScripts = requiredRootScripts.filter(
    (rootScript) => !scriptNames.includes(rootScript),
  );

  return {
    isValid: missingScripts.length === 0,
    missingScripts,
  };
};

export const checkMonorepoScripts =
  (monorepoDir: string) =>
  async (dependencies: Pick<Dependencies, "logger" | "nodeReader">) => {
    const { logger, nodeReader } = dependencies;

    const scriptsResult = await nodeReader.getScripts(monorepoDir);

    if (scriptsResult.isErr()) {
      logger.error(scriptsResult.error.message);
      return err(scriptsResult.error);
    }

    const { isValid, missingScripts } = validateRequiredScripts(
      scriptsResult.value,
    );

    if (isValid) {
      logger.success("Monorepo scripts are correctly set up");
      return ok();
    }

    const errorMessage = `Missing required scripts: ${missingScripts.join(", ")}`;
    logger.error(errorMessage);
    return err(new Error(errorMessage));
  };

import { z } from "zod";

import { Dependencies } from "./dependencies.js";
import { unwrapOrLogError } from "./index.js";

const ScriptName = z.string().brand<"ScriptName">();

export const ScriptSchema = z.object({
  name: ScriptName,
  script: z.string(),
});

export type Script = z.infer<typeof ScriptSchema>;

export interface NodeReader {
  getScripts(cwd: string): Promise<Script[]>;
}

const MonorepoScriptListSchema = z
  .array(ScriptSchema)
  .superRefine((scripts, ctx) => {
    const scriptNames = scripts.map(({ name }) => name);
    const requiredRootScripts = ["code-review"] as Script["name"][];
    const missingScripts = requiredRootScripts.filter(
      (rootScript) => !scriptNames.includes(rootScript),
    );

    if (missingScripts.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required scripts: ${missingScripts.join(", ")}`,
      });
    }
  });

export const checkMonorepoScripts =
  (monorepoDir: string) =>
  async (dependencies: Pick<Dependencies, "logger" | "nodeReader">) => {
    const { logger, nodeReader } = dependencies;

    const scripts = await unwrapOrLogError(dependencies)(() =>
      nodeReader.getScripts(monorepoDir),
    );
    const { error, success } =
      await MonorepoScriptListSchema.safeParseAsync(scripts);

    if (success) {
      logger.success("Monorepo scripts are correctly set up");
    } else {
      const errorMessage = error.errors
        .map(({ message }) => message)
        .join(", ");
      logger.error(errorMessage);
    }
  };

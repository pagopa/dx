import { ResultAsync, err, ok } from "neverthrow";
import { z } from "zod";

import { Dependencies } from "./dependencies.js";

const ScriptName = z.string().brand<"ScriptName">();

export const ScriptSchema = z.object({
  name: ScriptName,
  script: z.string(),
});

export type Script = z.infer<typeof ScriptSchema>;

export interface NodeReader {
  getScripts(cwd: string): ResultAsync<Script[], Error>;
}

const MonorepoScriptListSchema = z
  .array(ScriptSchema)
  .superRefine((scripts, ctx) => {
    // List of scripts that are required in the root package.json
    const requiredRootScripts = ["code-review"] as Script["name"][];

    const scriptNames = scripts.map(({ name }) => name);
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

    const scriptsResult = nodeReader.getScripts(monorepoDir).mapErr((error) => {
      logger.error(error.message);
      return error;
    });

    return await scriptsResult.andThen((scripts) =>
      ResultAsync.fromPromise(
        MonorepoScriptListSchema.safeParseAsync(scripts),
        (error) => error,
      ).andThen(({ error, success }) => {
        if (success) {
          logger.success("Monorepo scripts are correctly set up");
          return ok();
        } else {
          const errorMessage = error.errors
            .map(({ message }) => message)
            .join(", ");
          logger.error(errorMessage);
          return err(new Error(errorMessage));
        }
      }),
    );
  };

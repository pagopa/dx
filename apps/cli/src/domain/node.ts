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

const requiredRootScripts = ["code-review"];

export const checkMonorepoScripts =
  (monorepoDir: string) =>
  async (dependencies: Pick<Dependencies, "nodeReader" | "writer">) => {
    const { nodeReader, writer } = dependencies;

    const scripts = await unwrapOrLogError(dependencies)(() =>
      nodeReader.getScripts(monorepoDir),
    );
    requiredRootScripts
      .map((script) => {
        const exists = scripts.some(({ name }) => name === script);
        return {
          message: `${exists ? "✅" : "❌"} Script "${script}" is ${exists ? "present" : "missing"} in the monorepo root`,
        };
      })
      .map(({ message }) => writer.write(message));
  };

import { execa } from "execa";
import * as process from "node:process";
import { z } from "zod";

import { NodeReader, ScriptSchema } from "../../domain/node.js";

export const makeNodeReader = (): NodeReader => ({
  getScripts: async (cwd = process.cwd()) => {
    const { stdout } = await execa("yarn", ["run", "--json"], {
      cwd,
    });

    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => ScriptSchema.parse(JSON.parse(line)))
      .filter((item): item is z.infer<typeof ScriptSchema> => item !== null);
  },
});

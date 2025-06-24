import { execa } from "execa";
import * as process from "node:process";

import { NodeReader, ScriptSchema } from "../../domain/node.js";

export const makeNodeReader = (): NodeReader => ({
  getScripts: async (cwd = process.cwd()) => {
    const { stdout } = await execa("yarn", ["run", "--json"], {
      cwd,
    });

    return stdout
      .split("\n")
      .map((line) => ScriptSchema.parse(JSON.parse(line)));
  },
});

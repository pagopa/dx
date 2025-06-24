import { execa } from "execa";
import * as process from "node:process";

import { NodeReader, ScriptSchema } from "../../domain/node.js";

export const makeNodeReader = (): NodeReader => ({
  getScripts: async (cwd = process.cwd()) => {
    const { exitCode, stdout } = await execa("yarn", ["run", "--json"], {
      cwd,
    });

    return exitCode === 1
      ? []
      : stdout.split("\n").map((line) => ScriptSchema.parse(JSON.parse(line)));
  },
});

import { $ as $_ } from "execa";
import { type NodePlopAPI } from "node-plop";
import path from "node:path";

import { payloadSchema } from "../generators/monorepo/prompts.js";

export default function (plop: NodePlopAPI) {
  plop.setActionType("setupPnpm", async (data) => {
    const { repoName } = payloadSchema.parse(data);
    const cwd = path.resolve(repoName);
    // If this generator is started by a npm script, it will inherit some
    // config variables that will interfere with pnpm commands.
    // We filter them out here.
    const env = Object.fromEntries(
      Object.entries(process.env)
        .filter(([key]) => !key.startsWith("npm_config_"))
        // Strip Node.js debugger env vars so child processes don't try to
        // attach to the VS Code debugger and hang/fail.
        .filter(([key]) => key !== "NODE_OPTIONS")
        .filter(([key]) => !key.startsWith("VSCODE_INSPECTOR")),
    );
    const $ = $_({
      cwd,
      env,
      extendEnv: false, // Don't include process.env variables
    });
    await $`mise lock`;
    await $`mise install`;
    await $`mise exec -- corepack use pnpm@10`;
    await $`mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot`;
    await $`mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest`;
    await $`mise exec -- pnpm install`;
    return "Monorepo bootstrapped";
  });
}

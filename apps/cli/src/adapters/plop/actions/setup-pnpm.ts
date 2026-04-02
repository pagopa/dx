import { $ as $_ } from "execa";
import { type NodePlopAPI } from "node-plop";
import path from "node:path";

import { payloadSchema } from "../generators/monorepo/prompts.js";

export default function (plop: NodePlopAPI) {
  plop.setActionType("setupPnpm", async (data) => {
    const payload = payloadSchema.parse(data);
    const cwd = path.resolve(payload.repoName);
    // If this generator is started by a npm script, it will inherit some
    // config variables that will interfere with pnpm commands.
    // We filter them out here.
    const env = Object.fromEntries(
      Object.entries(process.env)
        .filter(([key]) => !key.startsWith("npm_config_"))
        // Disable corepack download prompt
        .concat([["COREPACK_ENABLE_DOWNLOAD_PROMPT", "0"]]),
    );
    const $ = $_({
      cwd,
      env,
      extendEnv: false, // Don't include process.env variables
    });
    await $`corepack enable`;
    await $`corepack use pnpm@latest`;
    await $`npx --yes nx@latest init --interactive=false --aiAgents=copilot`;
    await $`pnpm -w add -D @devcontainers/cli @nx/js @nx/eslint @nx/vitest`;
    await $`pnpm devcontainer templates apply -t ghcr.io/pagopa/devcontainer-templates/node:1`;
    return "Monorepo bootstrapped";
  });
}

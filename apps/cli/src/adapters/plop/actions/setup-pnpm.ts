/**
 * Bootstraps the generated monorepo: locks and installs the mise toolchain,
 * initializes Nx, installs the DX Nx plugins, and formats the scaffold.
 *
 * DX packages are served by GitHub Packages and are referenced through pnpm's
 * built-in `gh:` alias. pnpm does not expand environment variables in registry
 * credentials stored in a committed project `.npmrc`, so the GitHub token
 * resolved by the CLI is written to a temporary user-level npmrc (the
 * developer's own configuration plus the token) and passed to the bootstrap
 * commands through `npm_config_userconfig`.
 */
import { $ as $_ } from "execa";
import { type NodePlopAPI } from "node-plop";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getGitHubPAT } from "../../octokit/index.js";
import { payloadSchema } from "../generators/monorepo/prompts.js";

/**
 * DX Nx Terraform plugin installed in generated repositories. DX packages are
 * referenced through pnpm's built-in `gh:` alias (GitHub Packages) so that
 * every other dependency keeps resolving from the default registry.
 */
export const NX_TERRAFORM_DEPENDENCY = "gh:@pagopa/nx-terraform";

/**
 * Formatter used by `nx format:check` in generated repositories.
 */
export const OXFMT_DEPENDENCY = "oxfmt";

const buildChildEnvironment = (): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(process.env)
      // If this generator is started by a npm script, it will inherit some
      // config variables that will interfere with pnpm commands.
      // We filter them out here.
      .filter(([key]) => !key.startsWith("npm_config_"))
      // Strip Node.js debugger env vars so child processes don't try to
      // attach to the VS Code debugger and hang/fail.
      .filter(([key]) => key !== "NODE_OPTIONS")
      .filter(([key]) => !key.startsWith("VSCODE_INSPECTOR")),
  );

/**
 * Creates a temporary user-level npmrc that carries the GitHub Packages token
 * on top of the developer's existing user configuration. Returns the path of
 * the file so it can be removed once the bootstrap completes.
 */
const createTemporaryUserNpmrc = async (token: string): Promise<string> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "dx-npmrc-"),
  );
  const temporaryUserNpmrc = path.join(temporaryDirectory, ".npmrc");

  let existingUserNpmrc = "";
  try {
    existingUserNpmrc = await fs.readFile(
      path.join(os.homedir(), ".npmrc"),
      "utf8",
    );
  } catch {
    // No user-level npmrc: the temporary file only carries the token.
  }

  const lines = [
    existingUserNpmrc.trimEnd(),
    `//npm.pkg.github.com/:_authToken=${token}`,
  ].filter((line) => line.length > 0);

  await fs.writeFile(temporaryUserNpmrc, `${lines.join("\n")}\n`, {
    mode: 0o600,
  });
  return temporaryUserNpmrc;
};

export default function (plop: NodePlopAPI) {
  plop.setActionType("setupPnpm", async (data) => {
    const { repoName } = payloadSchema.parse(data);
    const cwd = path.resolve(repoName);
    const githubToken = await getGitHubPAT();

    const env = buildChildEnvironment();
    let temporaryNpmrcDirectory: string | undefined;
    if (githubToken) {
      const temporaryUserNpmrc = await createTemporaryUserNpmrc(githubToken);
      temporaryNpmrcDirectory = path.dirname(temporaryUserNpmrc);
      env.npm_config_userconfig = temporaryUserNpmrc;
    }

    const $ = $_({
      cwd,
      env,
      extendEnv: false, // Don't include process.env variables
    });

    try {
      await $`mise lock`;
      await $`mise install`;
      await $`mise exec -- corepack use pnpm@11`;
      await $`mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot`;
      try {
        await $`mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest ${NX_TERRAFORM_DEPENDENCY} ${OXFMT_DEPENDENCY}`;
      } catch (cause) {
        throw new Error(
          [
            `Failed to install the workspace dependencies (${NX_TERRAFORM_DEPENDENCY}).`,
            "The DX Nx plugins are served by GitHub Packages: make sure the GitHub token used by the CLI has the read:packages scope.",
            "Run `gh auth refresh --scopes read:packages` (or set GITHUB_TOKEN to a personal access token that includes read:packages) and try again.",
          ].join(" "),
          { cause },
        );
      }
      await $`mise exec -- pnpm install`;
      await $`mise exec -- pnpm exec oxfmt`;
    } finally {
      if (temporaryNpmrcDirectory) {
        await fs.rm(temporaryNpmrcDirectory, { force: true, recursive: true });
      }
    }
    return "Monorepo bootstrapped";
  });
}

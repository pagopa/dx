/**
 * Bootstraps the generated monorepo: locks and installs the mise toolchain,
 * initializes Nx, installs the DX Nx plugins, and formats the scaffold.
 *
 * DX packages are served by GitHub Packages and are referenced through pnpm's
 * built-in `gh:` alias. pnpm does not expand environment variables in project
 * `.npmrc` credentials, so the GitHub token resolved by the CLI is written
 * verbatim to the repository's git-ignored `.npmrc`, where every later local
 * install can reuse it. mise, Corepack and Nx run before that file exists, and
 * the raw `GH_TOKEN`/`GITHUB_TOKEN` variables are never forwarded to any
 * bootstrap command.
 */
import { $ as $_ } from "execa";
import { type NodePlopAPI } from "node-plop";
import fs from "node:fs/promises";
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
 * DX Nx Docker plugin installed in generated repositories.
 */
export const NX_DOCKER_DEPENDENCY = "gh:@pagopa/nx-docker";

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
      .filter(([key]) => !key.startsWith("VSCODE_INSPECTOR"))
      // The GitHub token lives in the repository npmrc: never forward the raw
      // variables, so no bootstrap command can read the token from the
      // environment.
      .filter(([key]) => key !== "GH_TOKEN" && key !== "GITHUB_TOKEN"),
  );

/**
 * Writes the GitHub Packages token to the repository-level npmrc so local
 * installs keep working after the bootstrap. The file is covered by the
 * scaffolded `.gitignore` and is never committed.
 */
const writeRepositoryNpmrc = async (
  repositoryRoot: string,
  token: string,
): Promise<void> => {
  await fs.writeFile(
    path.join(repositoryRoot, ".npmrc"),
    `//npm.pkg.github.com/:_authToken=${token}\n`,
    { mode: 0o600 },
  );
};

export default function (plop: NodePlopAPI) {
  plop.setActionType("setupPnpm", async (data) => {
    const { repoName } = payloadSchema.parse(data);
    const cwd = path.resolve(repoName);
    const githubToken = await getGitHubPAT();

    const $ = $_({
      cwd,
      env: buildChildEnvironment(),
      extendEnv: false, // Don't include process.env variables
    });

    // mise, Corepack and Nx only reach public registries: they run before the
    // token-bearing npmrc exists.
    await $`mise lock`;
    await $`mise install`;
    await $`mise exec -- corepack use pnpm@11`;
    await $`mise exec -- npx --yes nx@latest init --interactive=false --aiAgents=copilot`;

    // GitHub Packages is reached only by the dependency commands: the token is
    // written right before them and stays in the git-ignored npmrc for the
    // next local installs.
    if (githubToken) {
      await writeRepositoryNpmrc(cwd, githubToken);
    }

    try {
      await $`mise exec -- pnpm -w add -D @nx/js @nx/eslint @nx/vitest ${NX_TERRAFORM_DEPENDENCY} ${NX_DOCKER_DEPENDENCY} ${OXFMT_DEPENDENCY}`;
    } catch (cause) {
      throw new Error(
        [
          `Failed to install the workspace dependencies (${NX_TERRAFORM_DEPENDENCY}, ${NX_DOCKER_DEPENDENCY}).`,
          "The DX Nx plugins are served by GitHub Packages: make sure the GitHub token used by the CLI has the read:packages scope.",
          "Run `gh auth refresh --scopes read:packages` (or set GITHUB_TOKEN to a personal access token that includes read:packages) and try again.",
        ].join(" "),
        { cause },
      );
    }
    await $`mise exec -- pnpm install`;

    await $`mise exec -- pnpm exec oxfmt`;
    return "Monorepo bootstrapped";
  });
}

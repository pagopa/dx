import type { ActionType } from "plop";

import { $ } from "execa";
import path from "node:path";

import { Answers } from "../index.js";

export const setupMonorepoWithPnpm =
  ({ repoName }: Pick<Answers, "repoName">): ActionType =>
  async () => {
    const cwd = path.resolve(repoName);
    const pnpm$ = $({ cwd });
    await pnpm$`corepack use pnpm@latest`;
    await pnpm$`pnpm add --config pnpm-plugin-pagopa`;
    await pnpm$`pnpm -w add -D turbo @changesets/cli @devcontainers/cli`;
    await pnpm$`pnpm changeset init`;
    await pnpm$`pnpm devcontainer templates apply -t ghcr.io/pagopa/devcontainer-templates/node:1`;
    return "Monorepo bootstrapped";
  };

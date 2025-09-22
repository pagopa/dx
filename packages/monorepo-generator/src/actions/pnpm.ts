import type { ActionType } from "plop";

import { $ } from "execa";

export const enablePnpm: ActionType = async (answers) =>
  $({
    cwd: `${answers.repoSrc}/${answers.repoName}`,
  })`corepack use pnpm@latest`
    .then(() => "pnpm enabled")
    .catch(() => "Error enabling pnpm");

export const addPagoPaPnpmPlugin: ActionType = async (answers) =>
  $({
    cwd: `${answers.repoSrc}/${answers.repoName}`,
  })`pnpm add --config pnpm-plugin-pagopa`
    .then(() => "pnpm-plugin-pagopa added")
    .catch(() => "Error enabling pnpm-plugin-pagopa");

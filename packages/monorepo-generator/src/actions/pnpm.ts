import type { ActionType } from "plop";

import { $ } from "execa";
import { ResultAsync } from "neverthrow";

export const enablePnpm: ActionType = async (answers) =>
  ResultAsync.fromPromise(
    $({
      cwd: `${answers.repoSrc}/${answers.repoName}`,
    })`corepack use pnpm@latest`,
    () => new Error("Error enabling pnpm"),
  ).match(
    () => "pnpm enabled",
    ({ message }) => message,
  );

export const addPagoPaPnpmPlugin: ActionType = async (answers) =>
  ResultAsync.fromPromise(
    $({
      cwd: `${answers.repoSrc}/${answers.repoName}`,
    })`pnpm add --config pnpm-plugin-pagopa`,
    () => new Error("Error enabling pnpm-plugin-pagopa"),
  ).match(
    () => "pnpm-plugin-pagopa added",
    ({ message }) => `Error enabling pnpm-plugin-pagopa. ${message}`,
  );

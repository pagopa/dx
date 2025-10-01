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

export const installRootDependencies: ActionType = async (answers) =>
  $({
    cwd: `${answers.repoSrc}/${answers.repoName}`,
  })`pnpm -w add -D turbo @changesets/cli @devcontainers/cli`
    .then(() => "Root dependencies installed")
    .catch(() => "Error installing root dependencies");

export const configureChangesets: ActionType = async (answers) =>
  $({
    cwd: `${answers.repoSrc}/${answers.repoName}`,
  })`pnpm changeset init`
    .then(() => "Changeset configured")
    .catch(() => "Error configuring changeset");

export const configureDevContainer: ActionType = async (answers) =>
  $({
    cwd: `${answers.repoSrc}/${answers.repoName}`,
  })`pnpm devcontainer templates apply -t ghcr.io/pagopa/devcontainer-templates/node:1`
    .then(() => "DevContainer configured")
    .catch(() => "Error configuring DevContainer");

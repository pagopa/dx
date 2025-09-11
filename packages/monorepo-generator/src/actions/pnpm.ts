import { execSync } from "node:child_process";
import { ActionType } from "plop";

export const enablePnpm: ActionType = async (answers) => {
  try {
    execSync("corepack use pnpm", {
      cwd: `${answers.repoSrc}/${answers.repoName}`,
    });
    return "Pnpm enabled";
  } catch (error) {
    return `Error enabling Pnpm with Corepack. ${error}`;
  }
};

export const addPagoPaPnpmPlugin: ActionType = async (answers) => {
  try {
    execSync("pnpm add --config pnpm-plugin-pagopa", {
      cwd: `${answers.repoSrc}/${answers.repoName}`,
    });
    return "pnpm-plugin-pagopa added";
  } catch (error) {
    return `Error enabling pnpm-plugin-pagopa. ${error}`;
  }
};

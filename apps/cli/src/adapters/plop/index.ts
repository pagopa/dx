/**
 * Plop orchestration layer.
 *
 * Wires Plop generators and actions using injected dependencies (GitHubService,
 * CloudAccountService, etc.) provided by the CliRuntime. This decoupling allows
 * the same generators to run with real adapters in production and with fakes in
 * dry-run/test mode.
 */

import type { NodePlopAPI, PlopGenerator } from "plop";

import { getLogger } from "@logtape/logtape";
import { Answers } from "inquirer";
import nodePlop from "node-plop";
import path from "node:path";
import { oraPromise } from "ora";

import { GitHubRepo } from "../../domain/github-repo.js";
import { GitHubService, RepositoryNotFoundError } from "../../domain/github.js";
import createDeploymentEnvironmentGenerator, {
  Payload as EnvironmentPayload,
  payloadSchema as environmentPayloadSchema,
  PLOP_ENVIRONMENT_GENERATOR_NAME,
} from "../plop/generators/environment/index.js";
import createMonorepoGenerator, {
  Payload as MonorepoPayload,
  payloadSchema as monorepoPayloadSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "../plop/generators/monorepo/index.js";
import { type PlopDependencies } from "./dependencies.js";

export const setMonorepoGenerator = (
  plop: NodePlopAPI,
  deps: PlopDependencies,
) => {
  const templatesPath = path.join(
    import.meta.dirname,
    "../../../templates/monorepo",
  );
  createMonorepoGenerator(plop, templatesPath, deps.releaseClient);
};

const validatePayload = async (
  payload: MonorepoPayload,
  github: GitHubService,
) => {
  try {
    const repo = await github.getRepository(
      payload.repoOwner,
      payload.repoName,
    );
    throw new Error(`Repository ${repo.fullName} already exists.`);
  } catch (error) {
    if (!(error instanceof RepositoryNotFoundError)) {
      throw error;
    }
  }
};

export const getPlopInstance = async (): Promise<NodePlopAPI> => nodePlop();

export const runActions = async (
  generator: PlopGenerator,
  payload: Answers,
) => {
  const logger = getLogger(["dx-cli", "init"]);
  const result = await generator.runActions(payload);
  if (result.failures.length > 0) {
    const relevant = result.failures.filter(
      (failure) => failure.error !== "Aborted due to previous action failure",
    );
    if (relevant.length === 0) {
      return;
    }
    const summary = relevant
      .map(
        (failure) =>
          `${failure.type || "action"}: ${failure.error ?? "unknown error"}`,
      )
      .join("; ");
    for (const failure of relevant) {
      logger.error("Error on {type} step: {error}", {
        error: failure.error ?? "unknown error",
        type: failure.type || "action",
      });
    }
    throw new Error(
      `One or more actions failed during generation (${summary}).`,
    );
  }
};

export const runMonorepoGenerator = async (
  plop: NodePlopAPI,
  deps: PlopDependencies,
): Promise<MonorepoPayload> => {
  setMonorepoGenerator(plop, deps);
  const generator = plop.getGenerator(PLOP_MONOREPO_GENERATOR_NAME);
  const answers = await generator.runPrompts();
  const payload = monorepoPayloadSchema.parse(answers);
  await validatePayload(payload, deps.gitHubService);
  await oraPromise(runActions(generator, payload), {
    failText: "Failed to create workspace files.",
    successText: "Workspace files created successfully!",
    text: "Creating workspace files...",
  });
  return payload;
};

/**
 * Run the deployment environment generator
 *
 * @param plop - The plop instance
 * @param deps - Injected Plop dependencies
 * @param github - Optional GitHub repository info. When provided (by init command),
 *                 uses the explicitly passed repository. When omitted (by add command),
 *                 the generator infers it from the local git context.
 */
export const runDeploymentEnvironmentGenerator = async (
  plop: NodePlopAPI,
  deps: PlopDependencies,
  github?: GitHubRepo,
): Promise<EnvironmentPayload> => {
  setDeploymentEnvironmentGenerator(plop, deps, github);
  const generator = plop.getGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME);
  const answers = await generator.runPrompts();
  const payload = environmentPayloadSchema.parse(answers);
  await oraPromise(runActions(generator, payload), {
    failText: "Failed to create deployment environment",
    successText: "Environment created successfully!",
    text: "Creating environment...",
  });
  return payload;
};

/**
 * Configure the deployment environment generator
 *
 * @param plop - The plop instance
 * @param deps - Injected Plop dependencies
 * @param github - Optional GitHub repository info. When provided (by init command),
 *                 uses the explicitly passed repository. When omitted (by add command),
 *                 the generator infers it from the local git context.
 */
export const setDeploymentEnvironmentGenerator = (
  plop: NodePlopAPI,
  deps: PlopDependencies,
  github?: GitHubRepo,
) => {
  const templatesPath = path.join(
    import.meta.dirname,
    "../../../templates/environment",
  );

  createDeploymentEnvironmentGenerator(
    plop,
    templatesPath,
    deps.cloudAccountRepository,
    deps.cloudAccountService,
    deps.gitHubService,
    github,
  );
};

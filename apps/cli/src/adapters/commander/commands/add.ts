/**
 * Add command - Scaffold new components into existing workspaces
 *
 * This module implements the `dx add` command which allows developers to scaffold
 * new components into their existing workspace following DevEx guidelines.
 *
 * Currently supported components:
 * - environment: Add a new deployment environment to the project
 */
import { Command } from "commander";
import { ResultAsync } from "neverthrow";

import {
  getPlopInstance,
  runDeploymentEnvironmentGenerator,
} from "../../plop/index.js";
import { checkPreconditions } from "./init.js";

const addEnvironmentAction = () =>
  checkPreconditions()
    .andThen(() =>
      ResultAsync.fromPromise(
        getPlopInstance(),
        () => new Error("Failed to initialize plop"),
      ),
    )
    .andThen((plop) =>
      ResultAsync.fromPromise(
        runDeploymentEnvironmentGenerator(plop),
        () => new Error("Failed to run the deployment environment generator"),
      ),
    );

export const makeAddCommand = (): Command =>
  new Command()
    .name("add")
    .description("Add a new component to your workspace")
    .addCommand(
      new Command("environment")
        .description("Add a new deployment environment")
        .action(async function () {
          const result = await addEnvironmentAction();
          if (result.isErr()) {
            this.error(result.error.message);
          }
        }),
    );

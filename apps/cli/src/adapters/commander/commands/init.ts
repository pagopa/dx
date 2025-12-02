import type { Answers } from "@pagopa/monorepo-generator";

import scaffoldMonorepo, { answersSchema } from "@pagopa/monorepo-generator";
import { Command } from "commander";
import { Result, ResultAsync } from "neverthrow";
import nodePlop, { NodePlopAPI, PlopGenerator } from "node-plop";

import { decode } from "../../zod/index.js";

const initPlop = () =>
  ResultAsync.fromPromise(
    nodePlop(),
    () => new Error("Failed to initialize plop"),
  );

const getGenerator = (plopAPI: NodePlopAPI) =>
  Result.fromThrowable(
    plopAPI.getGenerator,
    () => new Error("Generator not found"),
  );

const getPrompts = (generator: PlopGenerator) =>
  ResultAsync.fromPromise(
    generator.runPrompts(),
    (error) =>
      new Error("Failed to run the generator prompts", { cause: error }),
  );

const validateAnswers = (answers: Answers): ResultAsync<Answers, Error> =>
  // TODO: Implement any additional validation if needed
  ResultAsync.fromSafePromise(Promise.resolve(answers));

const runGeneratorActions = (generator: PlopGenerator) => (answers: Answers) =>
  ResultAsync.fromPromise(generator.runActions(answers), (error) => {
    return new Error("Failed to run the generator actions", { cause: error });
  }).map(() => answers);

const displaySummary = (answers: Answers) => {
  console.log("\n🎉 Workspace created successfully!\n");
  console.log(`- Name: ${answers.repoName}`);
  console.log(`- Description: ${answers.repoDescription}`);
  console.log(`- Cloud Service Provider: ${answers.csp}`);
  console.log(
    `- GitHub Repository: https://github.com/pagopa/${answers.repoName}`,
  );
};

export const makeInitCommand = (): Command =>
  new Command()
    .name("init")
    .description(
      "Command to initialize resources (like projects, subscriptions, ...)",
    )
    .addCommand(
      new Command("project")
        .description("Initialize a new monorepo project")
        .action(async function () {
          await initPlop()
            .andTee(scaffoldMonorepo)
            .andThen((plop) => getGenerator(plop)("monorepo"))
            .andThen((generator) =>
              getPrompts(generator)
                .andThen(decode(answersSchema))
                .andThen(validateAnswers)
                .andThen(runGeneratorActions(generator))
                .andTee(displaySummary),
            )
            .orTee((err) => {
              this.error(err.message);
            });
        }),
    );

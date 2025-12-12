import { Result, ResultAsync } from "neverthrow";
import nodePlop, { NodePlopAPI, PlopGenerator } from "node-plop";

export const initPlop = () =>
  ResultAsync.fromPromise(
    nodePlop(),
    () => new Error("Failed to initialize plop"),
  );

export const getGenerator = (plopAPI: NodePlopAPI) =>
  Result.fromThrowable(
    plopAPI.getGenerator,
    () => new Error("Generator not found"),
  );

export const getPrompts = (generator: PlopGenerator) =>
  ResultAsync.fromPromise(
    generator.runPrompts(),
    (cause) => new Error("Failed to run the generator prompts", { cause }),
  );

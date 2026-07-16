/** This module is the GitHub Action entrypoint for dispatching dx-tasks tasks. */

import * as core from "@actions/core";
import { createDefaultTaskDispatcher } from "@pagopa/dx-tasks/default-dispatcher";
import * as z from "zod/mini";

const actionInputsSchema = z.object({
  payload: z.string().check(z.minLength(1, "Payload cannot be empty")),
  task: z.string().check(z.minLength(1, "Task name cannot be empty")),
});
const githubTokenSchema = z.optional(
  z.string().check(z.minLength(1, "GITHUB_TOKEN cannot be empty")),
);

const parsePayload = (rawPayload: string): unknown => {
  try {
    return JSON.parse(rawPayload);
  } catch (error) {
    throw new Error(
      `Failed to parse action payload as JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};

async function run(): Promise<void> {
  const inputsResult = actionInputsSchema.safeParse({
    payload: core.getInput("payload"),
    task: core.getInput("task"),
  });

  if (!inputsResult.success) {
    throw new Error(z.prettifyError(inputsResult.error));
  }

  const githubTokenResult = githubTokenSchema.safeParse(
    process.env.GITHUB_TOKEN,
  );
  if (!githubTokenResult.success) {
    throw new Error(z.prettifyError(githubTokenResult.error));
  }

  const dispatcher = createDefaultTaskDispatcher({
    githubToken: githubTokenResult.data,
  });
  const payload = parsePayload(inputsResult.data.payload);
  const result = await dispatcher.dispatchTask(inputsResult.data.task, payload);

  core.setOutput("result", JSON.stringify(result ?? null));
}

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});

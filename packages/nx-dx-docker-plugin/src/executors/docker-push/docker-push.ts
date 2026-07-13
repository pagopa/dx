// Nx executor for the `docker:push` target. Thin wrapper: all the actual
// build/push logic (tags, OCI labels, docker CLI invocation) lives in
// docker-run.ts, shared with the `docker:build` executor.
import type { ExecutorContext, PromiseExecutor } from "@nx/devkit";

import { runDockerCommand } from "../../docker-run.ts";
import {
  type DockerPushExecutorInput,
  dockerPushExecutorSchema,
} from "./schema.ts";

const runExecutor: PromiseExecutor<DockerPushExecutorInput> = async (
  options,
  context: ExecutorContext,
) => {
  const parseResult = dockerPushExecutorSchema.safeParse(options);
  if (!parseResult.success) {
    console.warn(
      "[@pagopa/nx-dx-docker-plugin] Invalid docker:push options:",
      parseResult.error.issues,
    );
    return { success: false };
  }

  return runDockerCommand("push", parseResult.data, context.root);
};

export default runExecutor;

// Nx executor for the `docker:build` target. Thin wrapper: all the actual
// build logic (tags, OCI labels, docker CLI invocation) lives in
// docker-run.ts, shared with the `docker:push` executor.
import type { ExecutorContext, PromiseExecutor } from "@nx/devkit";

import { runDockerCommand } from "../../docker-run.ts";
import {
  type DockerBuildExecutorInput,
  dockerBuildExecutorSchema,
} from "./schema.ts";

const runExecutor: PromiseExecutor<DockerBuildExecutorInput> = async (
  options,
  context: ExecutorContext,
) => {
  const parseResult = dockerBuildExecutorSchema.safeParse(options);
  if (!parseResult.success) {
    console.warn(
      "[@pagopa/nx-dx-docker-plugin] Invalid docker:build options:",
      parseResult.error.issues,
    );
    return { success: false };
  }

  return runDockerCommand("build", parseResult.data, context.root);
};

export default runExecutor;

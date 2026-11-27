// Resolves repository data paths from the active Copilot session workspace.
import { isAbsolute, join } from "node:path";

import { createActorState } from "./actor-state.mjs";
import { readCurrentGitHubRepository } from "./current-repository.mjs";

export async function createWorkspaceContext(workingDirectory) {
  if (typeof workingDirectory !== "string" || !isAbsolute(workingDirectory)) {
    throw new Error(
      "The Copilot host did not provide an absolute checkout directory.",
    );
  }

  return {
    actorState: createActorState(
      join(workingDirectory, "docs/brownfield/state.json"),
    ),
    currentRepository: await readCurrentGitHubRepository(workingDirectory),
  };
}

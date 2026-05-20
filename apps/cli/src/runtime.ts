/**
 * CLI Runtime — execution context builder.
 *
 * Encapsulates the decision of which adapters to use (real vs. fake) based on
 * the execution mode (normal vs. dry-run). The runtime is built at the
 * entrypoint and threaded through to commands and generators.
 */

import { type PlopDependencies } from "./adapters/plop/dependencies.js";
import { type WorkspaceEffects } from "./domain/workspace-effects.js";
import { type SandboxState } from "./sandbox/state.js";

export type CliRuntime = {
  mode: "dry-run" | "normal";
  plopDependencies: PlopDependencies;
  sandboxState?: SandboxState;
  workspaceEffects: WorkspaceEffects;
};

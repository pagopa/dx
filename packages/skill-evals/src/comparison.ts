/**
 * Resolves how a suite compares the local skill against a baseline.
 *
 * CLI flags override evals.json. `without-skill` is a reserved sentinel, not a
 * Git ref, so a branch with that name cannot hijack the no-plugin baseline.
 */
import { type ComparisonMode } from "./schema.js";

export const WITHOUT_SKILL_REF = "without-skill";

export type ComparisonRequest = Readonly<{
  baselineRef?: string;
  currentOnly: boolean;
  manifest: ComparisonMode;
}>;

export type ResolvedComparison = Readonly<{
  baselineRef?: string;
  mode: ComparisonMode;
}>;

export const isComparedRun = (mode: ComparisonMode): boolean =>
  mode !== "current-only";

/** CLI wins over the manifest. `--current-only` and `--baseline-ref` conflict. */
export const resolveComparison = (
  request: ComparisonRequest,
): ResolvedComparison => {
  if (request.currentOnly && request.baselineRef !== undefined) {
    throw new Error("--current-only cannot be combined with --baseline-ref");
  }
  if (request.currentOnly) {
    return { mode: "current-only" };
  }
  if (request.baselineRef === WITHOUT_SKILL_REF) {
    return { mode: "without-skill" };
  }
  if (request.baselineRef !== undefined) {
    return { baselineRef: request.baselineRef, mode: "previous" };
  }
  return { mode: request.manifest };
};

/**
 * Resolves how a suite compares the local skill against a baseline.
 *
 * CLI flags override evals.json. `--baseline-ref` is always a Git ref; the
 * no-plugin baseline is `--no-baseline`, never a fake branch name.
 */
import { type ComparisonMode } from "./schema.js";

export type ComparisonRequest = Readonly<{
  baselineRef?: string;
  currentOnly: boolean;
  manifest: ComparisonMode;
  noBaseline: boolean;
}>;

export type ResolvedComparison = Readonly<{
  baselineRef?: string;
  mode: ComparisonMode;
}>;

export const isComparedRun = (mode: ComparisonMode): boolean =>
  mode !== "current-only";

const exclusiveCliFlags = (request: ComparisonRequest): readonly string[] =>
  [
    request.currentOnly ? "--current-only" : undefined,
    request.noBaseline ? "--no-baseline" : undefined,
    request.baselineRef === undefined ? undefined : "--baseline-ref",
  ].filter((flag): flag is string => flag !== undefined);

/** CLI wins over the manifest. The three CLI overrides are mutually exclusive. */
export const resolveComparison = (
  request: ComparisonRequest,
): ResolvedComparison => {
  const flags = exclusiveCliFlags(request);
  if (flags.length > 1) {
    throw new Error(
      "--current-only, --no-baseline, and --baseline-ref cannot be combined",
    );
  }
  if (request.currentOnly) {
    return { mode: "current-only" };
  }
  if (request.noBaseline) {
    return { mode: "without-skill" };
  }
  if (request.baselineRef !== undefined) {
    return { baselineRef: request.baselineRef, mode: "previous" };
  }
  return { mode: request.manifest };
};

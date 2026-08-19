/**
 * Verifies the grading contract: response normalization, retry behavior, and
 * the view-only isolation of the grader session. runGradingSession is mocked
 * so no Copilot process runs.
 */
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type CopilotRunConfiguration,
  type EvalRunResult,
  type GraderRunResult,
  runGradingSession,
} from "../copilot-run.js";
import {
  gradeEval,
  type GradingRequest,
  normalizeGradeResponse,
} from "../grader.js";
import { emptyMetrics } from "../metrics.js";
import { type EvalCase } from "../schema.js";
import { temporaryDirectory } from "./temporary-directory.js";

vi.mock("../copilot-run.js", () => ({
  runGradingSession: vi.fn(),
}));

const mockedSession = vi.mocked(runGradingSession);

const evalCase: EvalCase = {
  assertions: ["No secrets.", "Uses the module."],
  expected_output: "Done.",
  files: [],
  fixture_required: false,
  id: 1,
  knowledge_base: "unavailable",
  name: "example-eval",
  prompt: "Do the thing.",
};

const variantGrade = {
  assertions: [
    { assertion: "No secrets.", evidence: "none written", passed: true },
    { assertion: "Uses the module.", evidence: "module used", passed: true },
  ],
  gates: {},
  pass: true,
  rubric: [{ criterion: "Quality", evidence: "good", score: 2 }],
  summary: "All good.",
};

const comparedResponse = JSON.stringify({
  baseline: variantGrade,
  comparison: {
    material_differences: [],
    regressions: [],
    winner: "current",
  },
  current: variantGrade,
  eval_name: "example-eval",
});

const config: CopilotRunConfiguration = {
  availableTools: ["*"],
  copilotBin: "copilot",
  disabledMcps: [],
  graderModel: "gpt-5-mini",
  hooks: {},
  knowledgeBase: "/kb",
  mainModel: "gpt-5.6-sol",
  maxAiCredits: 30,
  outputDirectory: "/out",
  pluginDirectory: "/plugin",
  reasoningEffort: "high",
  skillDirectory: "/skill",
  skillName: "example-skill",
  variant: "current",
};

const runResult = (directory: string): EvalRunResult => ({
  artifactDirectory: directory,
  evidence: "evidence",
  mechanical: {
    addedPlaceholders: false,
    diffCheck: true,
    executionSuccess: true,
    skillInvoked: true,
    skillLoaded: true,
  },
  metrics: emptyMetrics(),
});

const request = (
  evalDirectory: string,
  baseline?: EvalRunResult,
): GradingRequest => ({
  baseline,
  baselineLabel: "abc1234",
  current: runResult(evalDirectory),
  environment: {},
  evalCase,
  evalDirectory,
  instructions: "Grade strictly.",
  requireComparison: baseline !== undefined,
  rubric: "Rubric.",
});

const sessionAnswers = (outputs: readonly (GraderRunResult | string)[]) => {
  let call = 0;
  mockedSession.mockImplementation(
    async (
      _config,
      _prompt,
      workingDirectory,
      attempt,
    ): Promise<GraderRunResult> => {
      const artifactDirectory = join(
        workingDirectory,
        "grading",
        `attempt-${attempt}`,
      );
      await mkdir(artifactDirectory, { recursive: true });
      const answer = outputs[Math.min(call, outputs.length - 1)];
      call += 1;
      return typeof answer === "string"
        ? { artifactDirectory, metrics: emptyMetrics(), output: answer }
        : answer;
    },
  );
};

beforeEach(() => {
  mockedSession.mockReset();
});

describe("normalizeGradeResponse", () => {
  it("accepts a valid compared grade", () => {
    expect(normalizeGradeResponse(comparedResponse, evalCase, true)).toEqual(
      JSON.parse(comparedResponse),
    );
  });

  it("strips markdown fences around the JSON", () => {
    const fenced = `\`\`\`json\n${comparedResponse}\n\`\`\``;

    expect(normalizeGradeResponse(fenced, evalCase, true)).toBeDefined();
  });

  it("rejects a grade for a different eval", () => {
    const wrongName = JSON.stringify({
      ...JSON.parse(comparedResponse),
      eval_name: "other-eval",
    });

    expect(normalizeGradeResponse(wrongName, evalCase, true)).toBeUndefined();
  });

  it("rejects a mismatched current assertion set", () => {
    const mismatched = JSON.stringify({
      ...JSON.parse(comparedResponse),
      current: {
        ...variantGrade,
        assertions: [variantGrade.assertions[0]],
      },
    });

    expect(normalizeGradeResponse(mismatched, evalCase, true)).toBeUndefined();
  });

  it("rejects a missing baseline when comparison is required", () => {
    const currentOnly = JSON.stringify({
      current: variantGrade,
      eval_name: "example-eval",
    });

    expect(normalizeGradeResponse(currentOnly, evalCase, true)).toBeUndefined();
  });

  it("rejects a mismatched baseline assertion set", () => {
    const mismatched = JSON.stringify({
      ...JSON.parse(comparedResponse),
      baseline: {
        ...variantGrade,
        assertions: [variantGrade.assertions[0]],
      },
    });

    expect(normalizeGradeResponse(mismatched, evalCase, true)).toBeUndefined();
  });

  it("drops baseline and comparison when comparison is not required", () => {
    const grade = normalizeGradeResponse(comparedResponse, evalCase, false);

    expect(grade).toEqual({
      current: variantGrade,
      eval_name: "example-eval",
    });
  });

  it("rejects invalid JSON", () => {
    expect(normalizeGradeResponse("not json", evalCase, false)).toBeUndefined();
  });
});

describe("gradeEval", () => {
  it("returns the grade on the first valid response", async () => {
    const evalDirectory = await temporaryDirectory();
    sessionAnswers([comparedResponse]);

    const outcome = await gradeEval(
      config,
      request(evalDirectory, runResult(evalDirectory)),
    );

    expect(outcome.gradingError).toBeNull();
    expect(outcome.grade.current.pass).toBe(true);
    expect(mockedSession).toHaveBeenCalledTimes(1);
    const response = await readFile(
      join(evalDirectory, "grading", "attempt-1", "response.txt"),
      "utf8",
    );
    expect(response).toBe(comparedResponse);
  });

  it("tells the grader the previous answer was invalid when retrying", async () => {
    const evalDirectory = await temporaryDirectory();
    sessionAnswers(["garbage", comparedResponse]);

    const outcome = await gradeEval(
      config,
      request(evalDirectory, runResult(evalDirectory)),
    );

    expect(outcome.gradingError).toBeNull();
    expect(mockedSession).toHaveBeenCalledTimes(2);
    expect(mockedSession.mock.calls[1]?.[1]).toMatch(
      /^The previous answer was invalid/,
    );
  });

  it("returns a synthetic failing grade after two invalid responses", async () => {
    const evalDirectory = await temporaryDirectory();
    sessionAnswers(["garbage", "still garbage"]);

    const outcome = await gradeEval(config, request(evalDirectory));

    expect(outcome.gradingError).toBe(
      "The automated grader did not return valid JSON.",
    );
    expect(outcome.grade.current.pass).toBe(false);
    expect(outcome.grade.baseline).toBeUndefined();
    expect(outcome.grade.eval_name).toBe("example-eval");
  });

  it("treats a session error as an invalid answer and retries", async () => {
    const evalDirectory = await temporaryDirectory();
    const failed: GraderRunResult = {
      artifactDirectory: join(evalDirectory, "grading", "attempt-1"),
      error: "Copilot grader failed with exit code 1.",
      metrics: emptyMetrics(),
      output: "",
    };
    await mkdir(failed.artifactDirectory, { recursive: true });
    sessionAnswers([failed, comparedResponse]);

    const outcome = await gradeEval(
      config,
      request(evalDirectory, runResult(evalDirectory)),
    );

    expect(outcome.gradingError).toBeNull();
    expect(mockedSession).toHaveBeenCalledTimes(2);
  });

  it("sums metrics across attempts", async () => {
    const evalDirectory = await temporaryDirectory();
    let call = 0;
    mockedSession.mockImplementation(
      async (_c, _p, workingDirectory, attempt): Promise<GraderRunResult> => {
        const artifactDirectory = join(
          workingDirectory,
          "grading",
          `attempt-${attempt}`,
        );
        await mkdir(artifactDirectory, { recursive: true });
        call += 1;
        return {
          artifactDirectory,
          metrics: { ...emptyMetrics(), inputTokens: call * 10 },
          output: call === 1 ? "garbage" : comparedResponse,
        };
      },
    );

    const outcome = await gradeEval(
      config,
      request(evalDirectory, runResult(evalDirectory)),
    );

    expect(outcome.metrics.inputTokens).toBe(30);
  });

  it("runs the grader in a view-only session with no plugin or KB", async () => {
    const evalDirectory = await temporaryDirectory();
    sessionAnswers([comparedResponse]);

    await gradeEval(config, request(evalDirectory, runResult(evalDirectory)));

    const sessionConfig = mockedSession.mock.calls[0]?.[0];
    expect(sessionConfig?.availableTools).toEqual(["view"]);
    expect(sessionConfig?.pluginDirectory).toBeUndefined();
    expect(sessionConfig?.knowledgeBase).toBeUndefined();
  });

  it("tells the grader to skip baseline fields in current-only packets", async () => {
    const evalDirectory = await temporaryDirectory();
    sessionAnswers([comparedResponse]);

    await gradeEval(config, request(evalDirectory));

    const prompt = mockedSession.mock.calls[0]?.[1];
    expect(prompt).toContain("<comparison-mode>");
    expect(prompt).toContain(`"baseline": null`);
  });
});

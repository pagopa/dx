/**
 * Runs one Copilot session (skill variant or grader) and captures evidence.
 *
 * Each variant gets a disposable workspace plus a JSONL event log. Mechanical
 * checks are generic (diff, skill load/invoke); skill-specific checks arrive
 * from after_each. Grading sessions run a single isolated turn; the grader
 * contract (isolation, packet, schema) lives in grader.ts.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { describeCopilotEvent } from "./copilot-events.js";
import { formatConversationBlock, formatLogText } from "./format.js";
import { runSkillHook } from "./hooks.js";
import { emptyMetrics, type RunMetrics } from "./metrics.js";
import { runCommand, runCommandToFiles } from "./process.js";
import { type Progress, silentProgress } from "./progress.js";
import { initializeGitRepository, scaffoldEval } from "./scaffold.js";
import {
  type EvalCase,
  type EvalVariant,
  type ReasoningEffort,
  type SkillEvalManifest,
} from "./schema.js";

export type CopilotRunConfiguration = Readonly<{
  availableTools: readonly string[];
  copilotBin: string;
  disabledMcps: readonly string[];
  graderModel: string;
  hooks: SkillEvalManifest["hooks"];
  knowledgeBase?: string;
  knowledgeBaseEnvironmentVariable?: string;
  mainModel: string;
  maxAiCredits: number;
  outputDirectory: string;
  pluginDirectory?: string;
  progress?: Progress;
  promptPrefix?: string;
  reasoningEffort: ReasoningEffort;
  skillDirectory: string;
  skillName: string;
  variant?: EvalVariant;
}>;

export type EvalRunResult = Readonly<{
  artifactDirectory: string;
  evidence: string;
  mechanical: MechanicalChecks;
  metrics: RunMetrics;
}>;

export type GraderRunResult = Readonly<{
  artifactDirectory: string;
  error?: string;
  metrics: RunMetrics;
  output: string;
}>;

export type MechanicalChecks = Readonly<
  Record<string, boolean | null | number | string>
> &
  Readonly<{
    addedPlaceholders: boolean;
    diffCheck: boolean;
    executionSuccess: boolean;
    skillInvoked: boolean;
    skillLoaded: boolean;
  }>;

const eventSchema = z.object({
  attributes: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
});

type Event = z.infer<typeof eventSchema>;

const assistantMessageSchema = z.object({
  data: z.object({
    content: z.string(),
    toolRequests: z.array(z.unknown()),
  }),
  type: z.literal("assistant.message"),
});

const pluginSkillSchema = z.object({
  name: z.string(),
  source: z.literal("plugin"),
});

const skillInvocationSchema = z
  .object({
    name: z.literal("skill"),
  })
  .catchall(z.unknown());

/**
 * Copilot may emit a trailing incomplete line. Invalid rows are skipped so
 * one corrupt event cannot abort an otherwise successful run.
 */
const parseJsonLines = async (path: string): Promise<readonly Event[]> => {
  const content = await readFile(path, "utf8");
  return content.split("\n").flatMap((line) => {
    if (!line) {
      return [];
    }
    try {
      const parsed = eventSchema.safeParse(JSON.parse(line));
      return parsed.success ? [parsed.data] : [];
    } catch {
      return [];
    }
  });
};

/**
 * The last assistant.message without tool requests is the final answer.
 * Earlier messages are tool-call narration and would confuse the grader.
 */
const extractResponse = (events: readonly Event[]): string => {
  const responses = events.flatMap((event) => {
    const parsed = assistantMessageSchema.safeParse(event);
    if (!parsed.success || parsed.data.data.toolRequests.length > 0) {
      return [];
    }
    return [parsed.data.data.content];
  });
  return responses.at(-1) ?? "";
};

const readMetrics = async (path: string): Promise<RunMetrics> => {
  try {
    const events = await parseJsonLines(path);
    const calls = events.filter(
      (
        event,
      ): event is Event &
        Readonly<{
          attributes: Readonly<Record<string, unknown>>;
          name: string;
        }> =>
        event.type === "span" &&
        typeof event.name === "string" &&
        event.name.startsWith("chat ") &&
        typeof event.attributes === "object" &&
        event.attributes !== null,
    );
    const numeric = (key: string): number =>
      calls.reduce((total, call) => {
        const value = call.attributes[key];
        return total + (typeof value === "number" ? value : 0);
      }, 0);

    return {
      aiCredits: numeric("github.copilot.cost"),
      durationMs: numeric("github.copilot.server_duration"),
      inputTokens: numeric("gen_ai.usage.input_tokens"),
      models: [
        ...new Set(
          calls.flatMap((call) => {
            const value = call.attributes["gen_ai.response.model"];
            return typeof value === "string" ? [value] : [];
          }),
        ),
      ],
      outputTokens: numeric("gen_ai.usage.output_tokens"),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return emptyMetrics();
    }
    throw error;
  }
};

const copilotArguments = (
  config: CopilotRunConfiguration,
  workspace: string,
  logs: string,
  sessionId: string,
  mode: "new" | "resume",
  model: string,
): readonly string[] => {
  const args = [
    "-C",
    workspace,
    "--allow-all-tools",
    "--allow-all-urls",
    "--disable-builtin-mcps",
    "--no-custom-instructions",
    "--no-auto-update",
    "--no-color",
    "--no-remote",
    "--no-remote-export",
    "--plain-diff",
    "--stream",
    "off",
    "--output-format",
    "json",
    "--log-dir",
    logs,
    "--effort",
    config.reasoningEffort,
    "--max-ai-credits",
    String(config.maxAiCredits),
    `--available-tools=${config.availableTools.join(",")}`,
    "--model",
    model,
  ];

  if (config.pluginDirectory) {
    args.push("--plugin-dir", config.pluginDirectory);
  }
  if (config.knowledgeBase) {
    args.push("--add-dir", config.knowledgeBase);
  }
  for (const mcp of config.disabledMcps) {
    args.push("--disable-mcp-server", mcp);
  }
  args.push(mode === "new" ? "--session-id" : `--resume=${sessionId}`);
  if (mode === "new") {
    args.push(sessionId);
  }
  return args;
};

const HEARTBEAT_MS = 15_000;

const runTurn = async (
  config: CopilotRunConfiguration,
  workspace: string,
  artifactDirectory: string,
  turn: number,
  sessionId: string,
  mode: "new" | "resume",
  prompt: string,
  model: string,
  baseEnvironment: NodeJS.ProcessEnv,
): Promise<Readonly<{ events: readonly Event[]; exitCode: number }>> => {
  const eventsPath = join(artifactDirectory, `turn-${turn}.events.jsonl`);
  const stderrPath = join(artifactDirectory, `turn-${turn}.stderr.log`);
  const telemetryPath = join(artifactDirectory, "telemetry.jsonl");
  const progress = config.progress ?? silentProgress;
  const environment: NodeJS.ProcessEnv = {
    ...baseEnvironment,
    COPILOT_OTEL_FILE_EXPORTER_PATH: telemetryPath,
    COPILOT_OTEL_SOURCE_NAME: "skill-evals",
  };

  // Assigning undefined omits the variable from the child env. Do not delete
  // a dynamic key: ESLint forbids that, and spawn already drops undefined.
  const knowledgeBaseVariable = config.knowledgeBaseEnvironmentVariable;
  if (knowledgeBaseVariable) {
    environment[knowledgeBaseVariable] = config.knowledgeBase;
  }

  progress.debug(
    "Starting Copilot turn {turn} ({mode}) model={model} effort={effort} maxCredits={maxCredits}",
    {
      effort: config.reasoningEffort,
      maxCredits: config.maxAiCredits,
      mode,
      model,
      turn,
    },
  );
  if (progress.verbosity >= 2) {
    progress.debug(
      formatConversationBlock(
        `Question (turn ${turn}, ${prompt.length} chars)`,
        formatLogText(prompt),
      ),
    );
  }

  const startedAt = Date.now();
  const heartbeat = progress.verbose
    ? setInterval(() => {
        progress.debug("Waiting for Copilot turn {turn} ({elapsed}s)", {
          elapsed: Math.round((Date.now() - startedAt) / 1000),
          model,
          turn,
        });
      }, HEARTBEAT_MS)
    : undefined;
  heartbeat?.unref();

  try {
    const exitCode = await runCommandToFiles(
      config.copilotBin,
      [
        ...copilotArguments(
          config,
          workspace,
          join(artifactDirectory, "logs"),
          sessionId,
          mode,
          model,
        ),
        "-p",
        prompt,
      ],
      {
        cwd: workspace,
        env: environment,
        onStdoutLine: progress.verbose
          ? (line) => {
              const event = describeCopilotEvent(line, progress.verbosity);
              if (event) {
                progress.debug(event.message, event.properties);
              }
            }
          : undefined,
        stderrPath,
        stdoutPath: eventsPath,
      },
    );

    progress.debug("Copilot turn {turn} exited {exitCode} after {elapsed}s", {
      elapsed: Math.round((Date.now() - startedAt) / 1000),
      exitCode,
      model,
      turn,
    });

    const events = await parseJsonLines(eventsPath);
    const answer = extractResponse(events);
    if (answer && progress.verbosity >= 2) {
      progress.debug(
        formatConversationBlock(
          `Answer (turn ${turn}, ${answer.length} chars)`,
          formatLogText(answer),
        ),
      );
    }

    return {
      events,
      exitCode,
    };
  } finally {
    if (heartbeat) {
      clearInterval(heartbeat);
    }
  }
};

/** Builds the workspace and runs before_each before any Copilot turn. */
export const prepareEvalWorkspace = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  workspace: string,
  environment: NodeJS.ProcessEnv,
): Promise<void> => {
  const progress = config.progress ?? silentProgress;
  progress.debug("Preparing {variant} workspace for {eval}", {
    eval: evalCase.name,
    fixture: evalCase.fixture_required,
    variant: config.variant ?? "current",
  });

  if (evalCase.fixture_required) {
    await scaffoldEval(config.skillDirectory, evalCase.name, workspace);
  } else {
    await mkdir(workspace, { recursive: true });
    await initializeGitRepository(workspace, "empty");
  }

  if (config.hooks.before_each) {
    progress.debug("Running before_each for {eval}", { eval: evalCase.name });
  }
  await runSkillHook(
    config.hooks,
    "before_each",
    {
      evalName: evalCase.name,
      outputDirectory: config.outputDirectory,
      skillDirectory: config.skillDirectory,
      variant: config.variant,
      workspace,
    },
    environment,
  );
};

const collectArtifacts = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  artifactDirectory: string,
  workspace: string,
  responses: readonly string[],
  exitCodes: readonly number[],
  environment: NodeJS.ProcessEnv,
): Promise<EvalRunResult> => {
  const diff = await runCommand("git", ["diff", "--binary"], {
    cwd: workspace,
  });
  const diffCheck = await runCommand("git", ["diff", "--check"], {
    cwd: workspace,
  });
  const status = await runCommand("git", ["status", "--short"], {
    cwd: workspace,
  });
  const eventPaths = exitCodes.map((_, index) =>
    join(artifactDirectory, `turn-${index + 1}.events.jsonl`),
  );
  const events = (
    await Promise.all(eventPaths.map((path) => parseJsonLines(path)))
  ).flat();
  const toolRequests = events.flatMap((event) => {
    const requests = event.data?.toolRequests;
    return Array.isArray(requests) ? requests : [];
  });
  const loadedSkills = events.flatMap((event) => {
    const skills = event.data?.skills;
    return event.type === "session.skills_loaded" && Array.isArray(skills)
      ? skills
      : [];
  });
  const skillLoaded = loadedSkills.some((skill) => {
    const parsed = pluginSkillSchema.safeParse(skill);
    return parsed.success && parsed.data.name === config.skillName;
  });
  const skillInvoked = toolRequests.some((request) => {
    const parsed = skillInvocationSchema.safeParse(request);
    return (
      parsed.success && JSON.stringify(parsed.data).includes(config.skillName)
    );
  });
  const addedPlaceholders = /^\+[^+].*(TODO|FIXME|<[^>]+>)/m.test(diff.stdout);
  const progress = config.progress ?? silentProgress;
  if (config.hooks.after_each) {
    progress.debug("Running after_each for {eval}", { eval: evalCase.name });
  }
  const hookChecks = await runSkillHook(
    config.hooks,
    "after_each",
    {
      artifactDirectory,
      evalName: evalCase.name,
      outputDirectory: config.outputDirectory,
      skillDirectory: config.skillDirectory,
      variant: config.variant,
      workspace,
    },
    environment,
  );
  const metrics = await readMetrics(join(artifactDirectory, "telemetry.jsonl"));
  const mechanical: MechanicalChecks = {
    ...hookChecks,
    addedPlaceholders,
    diffCheck: diffCheck.exitCode === 0,
    executionSuccess: exitCodes.every((exitCode) => exitCode === 0),
    skillInvoked,
    skillLoaded,
  };
  const combinedResponse = responses
    .map((response, index) => {
      const followUp =
        index === 1 && evalCase.follow_up
          ? `# Scripted follow-up\n\n${evalCase.follow_up}\n\n`
          : "";
      return `${followUp}# Turn ${index + 1}\n\n${response}`;
    })
    .join("\n\n");
  const evidence = [
    `# Eval: ${evalCase.name}`,
    `## Original prompt\n\n${evalCase.prompt}`,
    `## Expected output\n\n${evalCase.expected_output}`,
    `## Assertions\n\n${evalCase.assertions.map((value) => `- ${value}`).join("\n")}`,
    `## Agent response\n\n${combinedResponse}`,
    `## Git diff\n\n\`\`\`diff\n${diff.stdout}\n\`\`\``,
    `## Tool requests\n\n\`\`\`json\n${JSON.stringify(toolRequests, null, 2)}\n\`\`\``,
    `## Mechanical checks\n\n\`\`\`json\n${JSON.stringify(mechanical, null, 2)}\n\`\`\``,
    `## Metrics\n\n\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\``,
  ].join("\n\n");

  await Promise.all([
    writeFile(
      join(artifactDirectory, "combined-response.md"),
      combinedResponse,
    ),
    writeFile(join(artifactDirectory, "diff.patch"), diff.stdout),
    writeFile(join(artifactDirectory, "status.txt"), status.stdout),
    writeFile(
      join(artifactDirectory, "tool-requests.json"),
      `${JSON.stringify(toolRequests, null, 2)}\n`,
    ),
    writeFile(
      join(artifactDirectory, "mechanical.json"),
      `${JSON.stringify(mechanical, null, 2)}\n`,
    ),
    writeFile(
      join(artifactDirectory, "metrics.json"),
      `${JSON.stringify(metrics, null, 2)}\n`,
    ),
  ]);

  return {
    artifactDirectory,
    evidence,
    mechanical,
    metrics,
  };
};

/** Executes the skill prompt (and optional follow-up) for one variant. */
export const runEvalVariant = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  environment: NodeJS.ProcessEnv,
): Promise<EvalRunResult> => {
  // Evals that declare the KB unavailable must not inherit the suite clone.
  const evalConfig =
    evalCase.knowledge_base === "available"
      ? config
      : { ...config, knowledgeBase: undefined };
  const variant = config.variant ?? "current";
  const artifactDirectory = join(
    config.outputDirectory,
    evalCase.name,
    variant,
  );
  const workspace = join(artifactDirectory, "workspace");
  await mkdir(join(artifactDirectory, "logs"), { recursive: true });
  await prepareEvalWorkspace(config, evalCase, workspace, environment);

  const progress = config.progress ?? silentProgress;
  progress.debug("Running {eval} ({variant}) with {model}", {
    eval: evalCase.name,
    followUp: Boolean(evalCase.follow_up),
    model: config.mainModel,
    variant,
  });

  const sessionId = randomUUID();
  const first = await runTurn(
    evalConfig,
    workspace,
    artifactDirectory,
    1,
    sessionId,
    "new",
    `${config.promptPrefix ?? ""}${evalCase.prompt}`,
    config.mainModel,
    environment,
  );
  const responses = [extractResponse(first.events)];
  const exitCodes = [first.exitCode];

  if (evalCase.follow_up && first.exitCode === 0) {
    const second = await runTurn(
      evalConfig,
      workspace,
      artifactDirectory,
      2,
      sessionId,
      "resume",
      evalCase.follow_up,
      config.mainModel,
      environment,
    );
    responses.push(extractResponse(second.events));
    exitCodes.push(second.exitCode);
  }

  return collectArtifacts(
    config,
    evalCase,
    artifactDirectory,
    workspace,
    responses,
    exitCodes,
    environment,
  );
};

/**
 * Executes one isolated grading turn: no workspace prep, no artifact
 * collection. Callers supply an already-isolated config (see grader.ts).
 */
export const runGradingSession = async (
  config: CopilotRunConfiguration,
  prompt: string,
  workingDirectory: string,
  attempt: number,
  environment: NodeJS.ProcessEnv,
): Promise<GraderRunResult> => {
  const artifactDirectory = join(
    workingDirectory,
    "grading",
    `attempt-${attempt}`,
  );
  await mkdir(join(artifactDirectory, "logs"), { recursive: true });

  const progress = config.progress ?? silentProgress;
  progress.debug("Grading attempt {attempt} with {model}", {
    attempt,
    model: config.graderModel,
  });

  const sessionId = randomUUID();
  const result = await runTurn(
    config,
    workingDirectory,
    artifactDirectory,
    1,
    sessionId,
    "new",
    prompt,
    config.graderModel,
    environment,
  );
  const metrics = await readMetrics(join(artifactDirectory, "telemetry.jsonl"));
  return {
    artifactDirectory,
    error:
      result.exitCode === 0
        ? undefined
        : `Copilot grader failed with exit code ${result.exitCode}.`,
    metrics,
    output: extractResponse(result.events),
  };
};

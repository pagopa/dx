/**
 * Executes isolated Copilot CLI eval variants and grader turns with captured evidence.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runCommand, runCommandToFiles } from "./process.js";
import { scaffoldEval } from "./scaffold.js";
import { type EvalCase } from "./schema.js";

export type CopilotRunConfiguration = Readonly<{
  availableTools: readonly string[];
  copilotBin: string;
  disabledMcps: readonly string[];
  graderModel: string;
  knowledgeBase?: string;
  mainModel: string;
  maxAiCredits: number;
  outputDirectory: string;
  pluginDirectory?: string;
  promptPrefix?: string;
  reasoningEffort: string;
  skillDirectory: string;
  skillName: string;
  variant?: "baseline" | "current";
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

export type MechanicalChecks = Readonly<{
  addedPlaceholders: boolean;
  diffCheck: boolean;
  executionSuccess: boolean;
  skillInvoked: boolean;
  skillLoaded: boolean;
  terraformFormat: boolean | null;
}>;

export type RunMetrics = Readonly<{
  aiCredits: number;
  durationMs: number;
  inputTokens: number;
  models: readonly string[];
  outputTokens: number;
}>;

type Event = Readonly<{
  attributes?: Readonly<Record<string, unknown>>;
  data?: Readonly<Record<string, unknown>>;
  name?: string;
  type?: string;
}>;

const emptyMetrics = (): RunMetrics => ({
  aiCredits: 0,
  durationMs: 0,
  inputTokens: 0,
  models: [],
  outputTokens: 0,
});

const parseJsonLines = async (path: string): Promise<readonly Event[]> => {
  const content = await readFile(path, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(
      (event): event is Event => typeof event === "object" && event !== null,
    );
};

const extractResponse = (events: readonly Event[]): string => {
  const responses = events.flatMap((event) => {
    const data = event.data;
    if (
      event.type !== "assistant.message" ||
      !data ||
      !("content" in data) ||
      typeof data.content !== "string" ||
      !("toolRequests" in data) ||
      !Array.isArray(data.toolRequests) ||
      data.toolRequests.length > 0
    ) {
      return [];
    }
    return [data.content];
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
  const environment: NodeJS.ProcessEnv = {
    ...baseEnvironment,
    COPILOT_OTEL_FILE_EXPORTER_PATH: telemetryPath,
    COPILOT_OTEL_SOURCE_NAME: "skill-evals",
  };

  if (config.knowledgeBase) {
    environment.DX_KB_PATH = config.knowledgeBase;
  } else {
    delete environment.DX_KB_PATH;
  }

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
      stderrPath,
      stdoutPath: eventsPath,
    },
  );

  return {
    events: await parseJsonLines(eventsPath),
    exitCode,
  };
};

export const prepareEvalWorkspace = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  workspace: string,
): Promise<void> => {
  if (evalCase.fixture_required) {
    await scaffoldEval(config.skillDirectory, evalCase.name, workspace);
    return;
  }

  await mkdir(workspace, { recursive: true });
  const commands: readonly (readonly string[])[] = [
    ["init", "--quiet"],
    ["config", "user.name", "Skill Evals"],
    ["config", "user.email", "skill-evals@example.invalid"],
    ["commit", "--quiet", "--allow-empty", "-m", "Baseline skill eval fixture"],
  ];
  for (const args of commands) {
    const result = await runCommand("git", args, { cwd: workspace });
    if (result.exitCode !== 0) {
      throw new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
    }
  }
};

const collectArtifacts = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  artifactDirectory: string,
  workspace: string,
  responses: readonly string[],
  exitCodes: readonly number[],
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
  const skillLoaded = loadedSkills.some(
    (skill) =>
      typeof skill === "object" &&
      skill !== null &&
      "name" in skill &&
      skill.name === config.skillName &&
      "source" in skill &&
      skill.source === "plugin",
  );
  const skillInvoked = toolRequests.some(
    (request) =>
      typeof request === "object" &&
      request !== null &&
      "name" in request &&
      request.name === "skill" &&
      JSON.stringify(request).includes(config.skillName),
  );
  const addedPlaceholders = /^\+[^+].*(TODO|FIXME|<[^>]+>)/m.test(diff.stdout);
  const terraformFormat = await stat(join(workspace, "infra"))
    .then((value) =>
      value.isDirectory()
        ? runCommand("terraform", [
            "fmt",
            "-check",
            "-recursive",
            join(workspace, "infra"),
          ]).catch(() => undefined)
        : undefined,
    )
    .catch(() => undefined);
  const metrics = await readMetrics(join(artifactDirectory, "telemetry.jsonl"));
  const mechanical: MechanicalChecks = {
    addedPlaceholders,
    diffCheck: diffCheck.exitCode === 0,
    executionSuccess: exitCodes.every((exitCode) => exitCode === 0),
    skillInvoked,
    skillLoaded,
    terraformFormat:
      terraformFormat === undefined ? null : terraformFormat.exitCode === 0,
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

export const runEvalVariant = async (
  config: CopilotRunConfiguration,
  evalCase: EvalCase,
  environment: NodeJS.ProcessEnv,
): Promise<EvalRunResult> => {
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
  await prepareEvalWorkspace(config, evalCase, workspace);

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

  const result = await collectArtifacts(
    config,
    evalCase,
    artifactDirectory,
    workspace,
    responses,
    exitCodes,
  );
  const terraformDirectories = await runCommand("find", [
    workspace,
    "-type",
    "d",
    "-name",
    ".terraform",
    "-prune",
    "-print",
  ]);
  await Promise.all(
    terraformDirectories.stdout
      .split("\n")
      .filter(Boolean)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
  return result;
};

export const runGrader = async (
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

  const sessionId = randomUUID();
  const result = await runTurn(
    {
      ...config,
      availableTools: ["view"],
      knowledgeBase: undefined,
      pluginDirectory: undefined,
    },
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

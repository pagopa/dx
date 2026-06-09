import "core-js/actual/set/index.js";
import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel";
import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { execa } from "execa";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Octokit } from "octokit";

import { enableAzureMonitor } from "./adapters/azure-monitor/instrumentation.js";
import { flushTelemetry } from "./adapters/azure-monitor/telemetry.js";
import codemodRegistry from "./adapters/codemods/index.js";
import { cliEnvSchema } from "./adapters/commander/env.js";
import { makeCli } from "./adapters/commander/index.js";
import { makePackageJsonReader } from "./adapters/node/package-json.js";
import { makeRepositoryReader } from "./adapters/node/repository.js";
import {
  getGitHubPAT,
  isPagopaOrgMember,
  OctokitGitHubService,
} from "./adapters/octokit/index.js";
import { makeAzureAuthorizationService } from "./adapters/pagopa-technology/azure-authorization.js";
import { getConfig } from "./config.js";
import { getInfo } from "./domain/info.js";
import { applyCodemodById } from "./use-cases/apply-codemod.js";
import { listCodemods } from "./use-cases/list-codemods.js";

/**
 * Returns `true` when `-v` or `--verbose` is present in argv.
 *
 * We inspect argv directly — instead of relying on Commander — because the
 * logtape configuration must be in place before any command handler runs
 * (including the ones that emit debug logs while parsing prompts).
 */
const detectVerboseFromArgv = (argv: readonly string[]): boolean =>
  argv.includes("-v") || argv.includes("--verbose");

/**
 * Returns `true` for invocations that should not require GitHub login or emit
 * telemetry: `--version`/`-V`, `--help`/`-h`, the `help` subcommand, and the
 * bare `dx` (which only prints usage).
 *
 * We inspect argv directly — instead of relying on Commander — because the
 * login/telemetry gate must run before `parseAsync()`, and Commander's
 * `preAction` hook fires too late (after the root span has already started).
 * Note `-v` is the verbose flag, not version; version is `-V`.
 */
const isVersionOrHelp = (argv: readonly string[]): boolean => {
  const args = argv.slice(2);
  return (
    args.length === 0 ||
    args[0] === "help" ||
    args.includes("--help") ||
    args.includes("-h") ||
    args.includes("--version") ||
    args.includes("-V")
  );
};

const configureLogging = async (verbose: boolean): Promise<void> => {
  const level = verbose ? "debug" : "info";
  // Wire logtape logs to the same OTel LoggerProvider that useAzureMonitor()
  // registered globally. When telemetry is disabled the provider is a no-op,
  // so this is always safe to call unconditionally.
  const otelSink = getOpenTelemetrySink({
    loggerProvider: logs.getLoggerProvider(),
  });
  await configure({
    loggers: [
      { category: ["dx-cli"], lowestLevel: level, sinks: ["console", "otel"] },
      // The environment generator (`gen.env`) emits debug messages about
      // provisioned Azure resources; surfacing them is the main value of
      // `--verbose` when running `dx init` / `dx add environment`.
      { category: ["gen"], lowestLevel: level, sinks: ["console", "otel"] },
      // `savemoney` already emits structured debug output by default.
      {
        category: ["savemoney"],
        lowestLevel: "debug",
        sinks: ["console", "otel"],
      },
      { category: ["json"], lowestLevel: "info", sinks: ["rawJson"] },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
    sinks: {
      console: getConsoleSink(),
      otel: otelSink,
      rawJson(record) {
        console.log(record.rawMessage);
      },
    },
  });
};

export const runCli = async (version: string) => {
  const verbose = detectVerboseFromArgv(process.argv);

  // Enforce GitHub login (for every command except --version/--help) and decide
  // whether telemetry is allowed. This runs before configureLogging() so the
  // logtape OTel sink binds to the real LoggerProvider only when telemetry is
  // enabled, and before the root span starts so enablement actually affects it.
  if (!isVersionOrHelp(process.argv)) {
    const token = await getGitHubPAT();
    if (!token) {
      await configureLogging(verbose);
      getLogger(["dx-cli"]).error(
        "You need to be logged in to GitHub. Run `gh auth login`, or set the GH_TOKEN or GITHUB_TOKEN environment variable.",
      );
      process.exitCode = 1;
      return;
    }
    // Telemetry is restricted to PagoPA org members; everyone else uses the CLI
    // normally with telemetry disabled.
    if (await isPagopaOrgMember(token)) {
      enableAzureMonitor();
    }
  }

  await configureLogging(verbose);

  const repositoryReader = makeRepositoryReader();
  const packageJsonReader = makePackageJsonReader();

  /**
   * Lazily creates GitHub-authenticated services on first call.
   * Only commands that actually need GitHub (init, add) will trigger this,
   * so credential-free commands (spec, doctor, info, …) never require a PAT.
   */
  const requireGitHubAuth = () =>
    ResultAsync.fromPromise(
      getGitHubPAT(),
      (cause) => new Error("Failed to read GitHub PAT", { cause }),
    ).andThen((auth) => {
      if (!auth) {
        return errAsync(
          new Error(
            "GitHub PAT is required. Please set the GH_TOKEN environment variable or login using GitHub CLI.",
          ),
        );
      }
      const octokit = new Octokit({ auth });
      const gitHubService = new OctokitGitHubService(octokit);
      const authorizationService = makeAzureAuthorizationService(gitHubService);
      return okAsync({ authorizationService, gitHubService });
    });

  const deps = {
    packageJsonReader,
    repositoryReader,
    requireGitHubAuth,
  };

  const config = getConfig();
  const env = cliEnvSchema.parse(process.env);

  const useCases = {
    applyCodemodById: applyCodemodById(codemodRegistry, getInfo(deps)),
    listCodemods: listCodemods(codemodRegistry),
  };

  const program = makeCli(deps, config, useCases, env, version);

  // Store the CLI version on the root program so hooks and exitWithError can
  // retrieve it without needing it passed through every call site.
  program.setOptionValue("_cliVersion", version);

  // Fetch tool versions concurrently before parseAsync() so they are ready
  // when the preAction hook fires (which is synchronous).
  const [azVersion, tfVersion] = await Promise.all([
    execa("az", ["version", "--output", "json"])
      .then(
        ({ stdout }) =>
          (JSON.parse(stdout) as Record<string, string>)["azure-cli"],
      )
      .catch(() => undefined),
    execa("terraform", ["version", "-json"])
      .then(
        ({ stdout }) =>
          (JSON.parse(stdout) as Record<string, string>)["terraform_version"],
      )
      .catch(() => undefined),
  ]);

  // Rename the root span to the actual command (e.g. "init", "codemod apply")
  // and tag it with CLI metadata. This runs inside context.with(rootSpan, ...)
  // below, so trace.getActiveSpan() returns rootSpan.
  program.hook("preAction", (_thisCommand, actionCommand) => {
    trace.getActiveSpan()?.updateName(getCommandPath(actionCommand) || "dx");
    const attrs: Record<string, string> = {
      "cli.version": version,
      "node.version": process.versions.node,
    };
    if (azVersion) attrs["az.version"] = azVersion;
    if (tfVersion) attrs["terraform.version"] = tfVersion;
    trace.getActiveSpan()?.setAttributes(attrs);
  });

  // exitOverride makes command.error() throw a CommanderError instead of
  // calling process.exit(), so the finally block below always runs.
  program.exitOverride();

  // Create a single root span for the entire CLI invocation. Wrapping
  // parseAsync() with context.with() makes this the active span for the
  // duration of all command handlers, which causes every outbound HTTP
  // dependency span (from UndiciInstrumentation) and every logtape log
  // record to share the same operation ID and hang under this span.
  const rootSpan = trace.getTracer("dx-cli", version).startSpan("dx", {
    // SpanKind.SERVER causes Azure Monitor to classify this span as a
    // "Request" rather than a dependency or internal span. This is what
    // makes it appear as the root item at the top of the App Insights
    // End-to-end transaction timeline.
    kind: SpanKind.SERVER,
  });

  try {
    await context.with(trace.setSpan(context.active(), rootSpan), () =>
      program.parseAsync(),
    );
  } catch (error) {
    rootSpan.setStatus({ code: SpanStatusCode.ERROR });
    // CommanderError is thrown by exitOverride when command.error() is called.
    // Re-apply the exit code so the process exits with the correct status.
    if (error instanceof Error && "exitCode" in error) {
      process.exitCode = (error as { exitCode: number }).exitCode;
    }
  } finally {
    rootSpan.end();
    await flushTelemetry();
  }
};

/** Build a dot-separated command path, e.g. "codemod apply", "add environment". */
const getCommandPath = (command: import("commander").Command): string => {
  const parts: string[] = [];

  let cmd: import("commander").Command | null = command;
  while (cmd !== null && cmd.name() !== "") {
    if (cmd.name() !== "dx") {
      parts.unshift(cmd.name());
    }
    cmd = cmd.parent;
  }
  return parts.join(" ");
};

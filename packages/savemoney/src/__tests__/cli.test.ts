import type { Command } from "commander";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AzureConfig,
  AzureDetailedResourceReport,
} from "../azure/types.js";

import { makeSavemoneyCli } from "../cli.js";
import { azure, loadConfig } from "../index.js";

const config: AzureConfig = {
  preferredLocation: "italynorth",
  sources: ["advisor", "custom"],
  subscriptionIds: ["config-subscription"],
  timespanDays: 30,
};

const report: AzureDetailedResourceReport = {
  analysis: {
    costRisk: "medium",
    reason: "Very low CPU usage.",
    suspectedUnused: true,
  },
  resource: {
    id: "/subscriptions/config-subscription/resourceGroups/rg-fixture/providers/Microsoft.Compute/virtualMachines/vm-fixture",
    location: "italynorth",
    name: "vm-fixture",
    type: "Microsoft.Compute/virtualMachines",
  },
};

type Dependencies = {
  analyzeAzureResources: typeof azure.analyzeAzureResources;
  generateReport: typeof azure.generateReport;
  loadConfig: typeof loadConfig;
};

function makeDependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    analyzeAzureResources: vi.fn(async () => [report]),
    generateReport: azure.generateReport,
    loadConfig: vi.fn(async () => config),
    ...overrides,
  };
}

function makeTestCommand(deps: Dependencies) {
  const command = makeSavemoneyCli("test", deps).exitOverride();
  const analyze = command.commands.find(
    (subcommand) => subcommand.name() === "analyze",
  );
  if (!analyze) throw new Error("Analyze command was not registered");
  analyze.exitOverride();
  const suppressOutput = () => {};
  command.configureOutput({
    writeErr: suppressOutput,
    writeOut: suppressOutput,
  });
  analyze.configureOutput({
    writeErr: suppressOutput,
    writeOut: suppressOutput,
  });
  return { analyze, command };
}

function runAnalyze(command: Command, options: string[] = []) {
  return command.parseAsync(["node", "savemoney", "analyze", ...options]);
}

let previousExitCode: typeof process.exitCode;

beforeEach(() => {
  previousExitCode = process.exitCode;
  process.exitCode = undefined;
});

afterEach(() => {
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
});

describe("savemoney CLI", () => {
  it("preserves configured values when flags are absent", async () => {
    const configured: AzureConfig = {
      ...config,
      azqrReportPath: "./config-report.json",
      preferredLocation: "westeurope",
      sources: ["custom"],
      timespanDays: 60,
    };
    const generateReport = vi.fn(azure.generateReport);
    const deps = makeDependencies({
      generateReport,
      loadConfig: vi.fn(async () => configured),
    });
    const { command } = makeTestCommand(deps);

    await runAnalyze(command, ["--config", "config.yaml"]);

    expect(deps.loadConfig).toHaveBeenCalledWith(
      "config.yaml",
      expect.objectContaining({ subscriptionIds: undefined }),
    );
    expect(deps.analyzeAzureResources).toHaveBeenCalledWith({
      ...configured,
      verbose: false,
    });
    expect(generateReport).toHaveBeenCalledWith([report], "table");
  });

  it("applies CLI options, including source, pricing, AZQR, verbose, and tags", async () => {
    const deps = makeDependencies();
    const { command } = makeTestCommand(deps);

    await runAnalyze(command, [
      "--subscriptionIds",
      "cli-subscription-1",
      "cli-subscription-2",
      "--days",
      "60",
      "--location",
      "westeurope",
      "--source",
      "all",
      "--tags",
      " env = prod ",
      "url=https://example.com/path=1",
      "--format",
      "json",
      "--no-pricing",
      "--azqr-report",
      "./azqr-report.json",
      "--verbose",
    ]);

    expect(deps.loadConfig).toHaveBeenCalledWith(undefined, {
      interactive: expect.any(Boolean),
      subscriptionIds: ["cli-subscription-1", "cli-subscription-2"],
    });
    expect(deps.analyzeAzureResources).toHaveBeenCalledWith({
      ...config,
      azqrReportPath: "./azqr-report.json",
      filterTags: new Map([
        ["env", "prod"],
        ["url", "https://example.com/path=1"],
      ]),
      preferredLocation: "westeurope",
      pricing: { enabled: false },
      sources: ["advisor", "custom"],
      timespanDays: 60,
      verbose: true,
    });
  });

  it.each(["table", "json", "detailed-json", "lint"] as const)(
    "renders a non-empty report as %s",
    async (format) => {
      const output = vi.spyOn(console, "log").mockImplementation(() => {});
      const { command } = makeTestCommand(makeDependencies());

      await runAnalyze(command, ["--format", format]);

      const stdout = output.mock.calls.map(([line]) => String(line)).join("\n");
      const isJson = format === "json" || format === "detailed-json";
      const parsed = isJson ? JSON.parse(stdout) : null;
      const expectedJson = {
        "detailed-json": [report],
        json: expect.arrayContaining([
          expect.objectContaining({ name: "vm-fixture" }),
        ]),
        lint: null,
        table: null,
      };
      const expectedContent = {
        "detailed-json": '"resource": {',
        json: '"name": "vm-fixture"',
        lint: report.resource.id,
        table: "Name",
      };

      expect(stdout).toContain(expectedContent[format]);
      expect(parsed).toEqual(expectedJson[format]);
      expect(stdout.includes("Summary:")).toBe(!isJson);
    },
  );

  it("shows the Advisor tag-filter limitation in help", () => {
    const { analyze } = makeTestCommand(makeDependencies());

    expect(analyze.helpInformation().replace(/\s+/g, " ")).toContain(
      "Advisor subscription-level findings remain global.",
    );
  });
});

describe("savemoney CLI errors", () => {
  it.each([
    ["days", ["--days", "0"]],
    ["format", ["--format", "xml"]],
    ["source", ["--source", "aws"]],
  ])(
    "rejects invalid %s before loading config or contacting Azure",
    async (_, options) => {
      const deps = makeDependencies();
      const { command } = makeTestCommand(deps);

      await expect(runAnalyze(command, options)).rejects.toBeInstanceOf(Error);

      expect(deps.loadConfig).not.toHaveBeenCalled();
      expect(deps.analyzeAzureResources).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["subscription IDs", ["--subscriptionIds", "  "]],
    ["tags", ["--tags", "environment"]],
  ])(
    "reports invalid %s to stderr and exits with status 1",
    async (_, options) => {
      const deps = makeDependencies();
      const writeError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { command } = makeTestCommand(deps);

      await runAnalyze(command, options);

      expect(process.exitCode).toBe(1);
      expect(writeError).toHaveBeenCalledWith(
        expect.stringContaining("failed"),
      );
      expect(deps.loadConfig).not.toHaveBeenCalled();
      expect(deps.analyzeAzureResources).not.toHaveBeenCalled();
    },
  );

  it("does not render after analysis fails", async () => {
    const generateReport = vi.fn(async () => {});
    const deps = makeDependencies({
      analyzeAzureResources: vi
        .fn()
        .mockRejectedValue(new Error("Azure unavailable")),
      generateReport,
    });
    const writeError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { command } = makeTestCommand(deps);

    await runAnalyze(command);

    expect(process.exitCode).toBe(1);
    expect(writeError).toHaveBeenCalledWith(
      "Analysis failed: Azure unavailable",
    );
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("reports rendering failures to stderr and exits with status 1", async () => {
    const deps = makeDependencies({
      generateReport: vi
        .fn()
        .mockRejectedValue(new Error("report unavailable")),
    });
    const writeError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { command } = makeTestCommand(deps);

    await runAnalyze(command, ["--format", "json"]);

    expect(process.exitCode).toBe(1);
    expect(writeError).toHaveBeenCalledWith(
      "Analysis failed: report unavailable",
    );
    expect(deps.generateReport).toHaveBeenCalledWith([report], "json");
  });
});

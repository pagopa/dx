import { describe, expect, it } from "vitest";

import type { Finding } from "../finding.js";

import {
  buildSavemoneyInvocationTelemetryAttributes,
  buildSavemoneyOutcomeTelemetryAttributes,
} from "../telemetry/savemoney-command-telemetry.js";

const BASE_FINDING: Finding = {
  category: "cost",
  code: "vm.low-cpu",
  reason: "Low CPU usage.",
  resourceId:
    "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm",
  severity: "low",
  source: "custom",
};

describe("buildSavemoneyInvocationTelemetryAttributes", () => {
  it("sets azqr_report_source to cli when --azqr-report is provided", () => {
    const attributes = buildSavemoneyInvocationTelemetryAttributes({
      azqrReportPathOption: "./azqr.json",
      format: "table",
      resolvedConfig: {
        azqrReportPath: "./from-config.json",
        pricing: { enabled: true },
        sources: ["advisor", "custom"],
        subscriptionIds: ["sub-a"],
      },
    });

    expect(attributes["savemoney.azqr_report_source"]).toBe("cli");
  });

  it("sets azqr_report_source to config when only config path is present", () => {
    const attributes = buildSavemoneyInvocationTelemetryAttributes({
      format: "table",
      resolvedConfig: {
        azqrReportPath: "./from-config.json",
        pricing: { enabled: true },
        sources: ["advisor", "custom"],
        subscriptionIds: ["sub-a"],
      },
    });

    expect(attributes["savemoney.azqr_report_source"]).toBe("config");
  });

  it("sets azqr_report_source to none when azqr is absent", () => {
    const attributes = buildSavemoneyInvocationTelemetryAttributes({
      format: "table",
      resolvedConfig: {
        pricing: { enabled: true },
        sources: ["advisor", "custom"],
        subscriptionIds: ["sub-a"],
      },
    });

    expect(attributes["savemoney.azqr_report_source"]).toBe("none");
  });

  it("derives subscriptions_source as config, env, or prompt", () => {
    const fromConfig = buildSavemoneyInvocationTelemetryAttributes({
      configPathOption: "./config.yaml",
      format: "table",
      resolvedConfig: {
        pricing: { enabled: true },
        sources: ["advisor", "custom"],
        subscriptionIds: ["sub-a"],
      },
      subscriptionIdsEnv: "sub-env",
    });
    const fromEnv = buildSavemoneyInvocationTelemetryAttributes({
      format: "table",
      resolvedConfig: {
        pricing: { enabled: true },
        sources: ["advisor", "custom"],
        subscriptionIds: ["sub-a"],
      },
      subscriptionIdsEnv: "sub-env",
    });
    const fromPrompt = buildSavemoneyInvocationTelemetryAttributes({
      format: "table",
      resolvedConfig: {
        pricing: { enabled: true },
        sources: ["advisor", "custom"],
        subscriptionIds: ["sub-a"],
      },
    });

    expect(fromConfig["savemoney.subscriptions_source"]).toBe("config");
    expect(fromEnv["savemoney.subscriptions_source"]).toBe("env");
    expect(fromPrompt["savemoney.subscriptions_source"]).toBe("prompt");
  });
});

describe("buildSavemoneyOutcomeTelemetryAttributes", () => {
  it("counts findings and analyzed resources", () => {
    const attributes = buildSavemoneyOutcomeTelemetryAttributes([
      {
        findings: [BASE_FINDING, { ...BASE_FINDING, code: "disk.unattached" }],
      },
      {
        findings: [
          { ...BASE_FINDING, code: "advisor.right-size", source: "advisor" },
        ],
      },
      {},
    ]);

    expect(attributes).toEqual({
      "savemoney.findings_count": 3,
      "savemoney.resources_analyzed": 3,
    });
  });
});

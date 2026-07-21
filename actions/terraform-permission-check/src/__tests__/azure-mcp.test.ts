import { describe, expect, it } from "vitest";

import {
  collectAzureMcpContext,
  formatMcpError,
  splitCommandLine,
} from "../azure-mcp.js";

describe("splitCommandLine", () => {
  it("preserves quoted arguments", () => {
    expect(
      splitCommandLine(
        '-y @azure/mcp@latest server start --read-only --name "DX AI"',
      ),
    ).toEqual([
      "-y",
      "@azure/mcp@latest",
      "server",
      "start",
      "--read-only",
      "--name",
      "DX AI",
    ]);
  });
});

describe("formatMcpError", () => {
  it("includes bounded MCP stderr when startup fails", () => {
    expect(
      formatMcpError(
        new Error("MCP error -32000: Connection closed"),
        "npm error code EAI_AGAIN",
      ),
    ).toBe(
      "MCP error -32000: Connection closed. MCP stderr: npm error code EAI_AGAIN",
    );
  });
});

describe("collectAzureMcpContext", () => {
  it("skips collection when disabled", async () => {
    await expect(
      collectAzureMcpContext({
        argsText: "server start",
        command: "azure-mcp",
        enabled: false,
        environment: {},
        planText: "",
        timeoutMs: 1000,
        workingDirectory: ".",
      }),
    ).resolves.toContain("Status: skipped");
  });

  it("rejects commands that are not explicitly read-only", async () => {
    await expect(
      collectAzureMcpContext({
        argsText: "server start",
        command: "azure-mcp",
        enabled: true,
        environment: {},
        planText: "",
        timeoutMs: 1000,
        workingDirectory: ".",
      }),
    ).rejects.toThrow("--read-only");
  });
});

/**
 * Tests for generateReport() with the "lint" format.
 *
 * Since process.stdout.isTTY is false/undefined in test environments,
 * ANSI color codes are empty strings (~no-ops), making the output
 * easy to assert on plain text.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AzureDetailedResourceReport } from "../types.js";

import { generateReport } from "../report.js";

// ── test fixtures ──────────────────────────────────────────────────────────

function makeEntry(
  id: string,
  costRisk: "high" | "low" | "medium",
  reason: string,
  suspectedUnused = true,
): AzureDetailedResourceReport {
  return {
    analysis: { costRisk, reason, suspectedUnused },
    resource: {
      id,
      name: id.split("/").pop() ?? "unknown",
      type: "Microsoft.Compute/virtualMachines",
    },
  };
}

const HIGH_ENTRY = makeEntry(
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm-high",
  "high",
  "VM is deallocated. No disk activity detected.",
);

const MEDIUM_ENTRY = makeEntry(
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm-medium",
  "medium",
  "Low CPU usage.",
);

const LOW_ENTRY = makeEntry(
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm-low",
  "low",
  "Possible idle resource.",
  false,
);

// ── helpers ────────────────────────────────────────────────────────────────

function allLogs(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((c) => c[0] as string).join("\n");
}

// ── tests ──────────────────────────────────────────────────────────────────

describe("generateReport — lint format", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints the resource ID for each entry", async () => {
    await generateReport([HIGH_ENTRY], "lint");
    const output = allLogs(logSpy);
    expect(output).toContain(HIGH_ENTRY.resource.id);
  });

  it("uses ✖ icon for high-risk resources", async () => {
    await generateReport([HIGH_ENTRY], "lint");
    const output = allLogs(logSpy);
    expect(output).toContain("✖");
  });

  it("uses ⚠ icon for medium-risk resources", async () => {
    await generateReport([MEDIUM_ENTRY], "lint");
    const output = allLogs(logSpy);
    expect(output).toContain("⚠");
  });

  it("uses ℹ icon for low-risk resources", async () => {
    await generateReport([LOW_ENTRY], "lint");
    const output = allLogs(logSpy);
    expect(output).toContain("ℹ");
  });

  it("splits a multi-sentence reason into separate findings", async () => {
    // Reason has two sentences separated by '. '
    await generateReport([HIGH_ENTRY], "lint");
    const calls = logSpy.mock.calls.map(
      (c) => (c[0] as string | undefined) ?? "",
    );
    const findingLines = calls.filter((l) => l.startsWith("  "));
    // "VM is deallocated." and "No disk activity detected." → 2 findings
    expect(findingLines.length).toBe(2);
  });

  it("prints a Summary line at the end", async () => {
    await generateReport([HIGH_ENTRY, MEDIUM_ENTRY, LOW_ENTRY], "lint");
    const output = allLogs(logSpy);
    expect(output).toContain("Summary:");
  });

  it("summary reports correct total issue count", async () => {
    await generateReport([HIGH_ENTRY, MEDIUM_ENTRY, LOW_ENTRY], "lint");
    const output = allLogs(logSpy);
    // HIGH has 2 findings (split reason), MEDIUM and LOW have 1 each → total 4
    expect(output).toContain("4 issues found");
  });

  it("summary reports correctly with a single issue (no plural)", async () => {
    await generateReport([MEDIUM_ENTRY], "lint");
    const output = allLogs(logSpy);
    // "1 issue found" (not "1 issues found")
    expect(output).toContain("1 issue found");
  });

  it("shows risk level label in uppercase for each finding", async () => {
    await generateReport([HIGH_ENTRY], "lint");
    const output = allLogs(logSpy);
    expect(output).toContain("HIGH");
  });

  it("prints nothing but the summary for an empty report", async () => {
    await generateReport([], "lint");
    const calls = logSpy.mock.calls.map((c) => c[0] as string);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("0 issues found");
  });
});

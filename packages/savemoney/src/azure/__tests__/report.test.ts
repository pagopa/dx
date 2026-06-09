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
  return spy.mock.calls.map((c: string[]) => c[0]).join("\n");
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
    const calls = logSpy.mock.calls.map((c: string[]) => c[0] ?? "");
    const findingLines = calls.filter((l: string) => l.startsWith("  "));
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
    const calls = logSpy.mock.calls.map((c: string[]) => c[0]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("0 issues found");
  });

  describe("monetary annotations", () => {
    const VM_WITH_COST: AzureDetailedResourceReport = {
      analysis: {
        costRisk: "high",
        estimatedMonthlySavings: { amount: 29.94, currency: "EUR" },
        reason: "No tags found. VM is deallocated.",
        suspectedUnused: true,
      },
      resource: {
        id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm-x",
        name: "vm-x",
        type: "Microsoft.Compute/virtualMachines",
      },
    };

    it("renders the resource monthly cost ONCE as a header annotation, not on each finding", async () => {
      await generateReport([VM_WITH_COST], "lint");
      const output = allLogs(logSpy);
      // header line contains the cost-at-risk label
      expect(output).toMatch(/cost at risk:.*29[.,]94/);
      // exactly one occurrence — must NOT appear next to each finding
      const matches = output.match(/29[.,]94/g) ?? [];
      // 1× header + 1× summary trailer = 2 occurrences; the per-finding line must not carry it
      expect(matches.length).toBe(2);
    });

    it("does not attach the resource cost to the 'No tags found' finding line", async () => {
      await generateReport([VM_WITH_COST], "lint");
      const findingLines = logSpy.mock.calls
        .map((c: unknown[]) => String(c[0]))
        .filter((l: string) => l.includes("No tags found"));
      expect(findingLines).toHaveLength(1);
      expect(findingLines[0]).not.toMatch(/29[.,]94/);
    });

    it("uses the 'Estimated monthly cost at risk' label in the summary trailer", async () => {
      await generateReport([VM_WITH_COST], "lint");
      const output = allLogs(logSpy);
      expect(output).toContain("Estimated monthly cost at risk");
      // The old, misleading "Estimated monthly savings (custom)" label is gone
      expect(output).not.toMatch(/Estimated monthly savings:\s*€/);
    });
  });
});

describe("generateReport — table format", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without throwing for an empty report", async () => {
    await expect(generateReport([], "table")).resolves.toBeUndefined();
    // Table is always printed; the summary line ("0 issues found") follows.
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    const output = logSpy.mock.calls
      .map((c: string[]) => String(c[0]))
      .join("\n");
    expect(output).toContain("0 issues found");
  });

  it("includes resource name and reason in the rendered table", async () => {
    await generateReport([HIGH_ENTRY], "table");
    const output = logSpy.mock.calls
      .map((c: string[]) => String(c[0]))
      .join("\n");
    expect(output).toContain("vm-high");
    expect(output).toContain("VM is deallocated");
  });
});

import type { PlopGenerator } from "plop";

/**
 * Tests for the internal `runActions` helper that coordinates plop's
 * generator execution and surfaces meaningful error messages (CES-1923).
 */
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import { runActions } from "../index.js";

const makeGenerator = (result: {
  changes: unknown[];
  failures: { error: string; path?: string; type: string }[];
}): PlopGenerator => {
  const generator = mock<PlopGenerator>();
  generator.runActions.mockResolvedValue(
    result as unknown as Awaited<ReturnType<PlopGenerator["runActions"]>>,
  );
  return generator;
};

describe("runActions", () => {
  it("resolves silently when there are no failures", async () => {
    const generator = makeGenerator({ changes: [], failures: [] });
    await expect(runActions(generator, {})).resolves.toBeUndefined();
  });

  it("ignores 'Aborted due to previous action failure' entries", async () => {
    const generator = makeGenerator({
      changes: [],
      failures: [
        {
          error: "Aborted due to previous action failure",
          path: "",
          type: "add",
        },
      ],
    });
    await expect(runActions(generator, {})).resolves.toBeUndefined();
  });

  it("surfaces the original failure message (no more 'undefined')", async () => {
    const generator = makeGenerator({
      changes: [],
      failures: [
        {
          error: "Failed to create the key vault: quota exceeded",
          path: "",
          type: "initCloudAccounts",
        },
      ],
    });

    await expect(runActions(generator, {})).rejects.toThrow(
      /initCloudAccounts.*Failed to create the key vault: quota exceeded/,
    );
  });

  it("aggregates multiple failures into the thrown message", async () => {
    const generator = makeGenerator({
      changes: [],
      failures: [
        { error: "Missing template", path: "", type: "add" },
        {
          error: "Aborted due to previous action failure",
          path: "",
          type: "modify",
        },
        { error: "Permission denied", path: "", type: "initCloudAccounts" },
      ],
    });

    await expect(runActions(generator, {})).rejects.toThrow(
      /add: Missing template.*initCloudAccounts: Permission denied/s,
    );
  });

  it("falls back to 'unknown error' when plop provides no error string", async () => {
    const generator = makeGenerator({
      changes: [],
      failures: [
        { error: undefined as unknown as string, path: "", type: "add" },
      ],
    });

    await expect(runActions(generator, {})).rejects.toThrow(/unknown error/);
  });
});

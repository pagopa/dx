/**
 * Repository Terraform executions share the verified cache and lease cancellation.
 */
import { describe, expect, it, vi } from "vitest";

import { repositoryTerraformRunner } from "../repository-state.js";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(async () => ({ stdout: "" })),
}));

vi.mock("execa", () => ({ execa: mocks.execute }));

describe("repository Terraform execution", () => {
  it("passes migration-lease cancellation and the owned backend cache to Terraform", async () => {
    const abort = new AbortController();
    await repositoryTerraformRunner("/repository", abort.signal)(["init"]);
    expect(mocks.execute).toHaveBeenCalledWith("terraform", ["init"], {
      cancelSignal: abort.signal,
      cwd: "/repository",
      env: {
        NO_COLOR: "1",
        TF_DATA_DIR: "/repository/.terraform",
        TF_IN_AUTOMATION: "1",
        TF_INPUT: "0",
      },
    });
  });
});

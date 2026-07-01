import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface ExecFileResult {
  stderr: string;
  stdout: string;
}

const { execFilePromiseMock } = vi.hoisted(() => ({
  execFilePromiseMock: vi.fn<
    (file: string, args: readonly string[]) => Promise<ExecFileResult>
  >(async () => ({ stderr: "", stdout: "" })),
}));

vi.mock("node:child_process", () => ({
  execFile: Object.assign(vi.fn(), {
    [promisify.custom]: execFilePromiseMock,
  }),
}));

import { isEnvironmentProject } from "../shared.js";

describe("isEnvironmentProject", () => {
  beforeEach(() => {
    execFilePromiseMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when the project has an environment tag", async () => {
    execFilePromiseMock.mockResolvedValue({
      stderr: "",
      stdout: '{"tags":["terraform","env:dev"]}',
    });

    await expect(isEnvironmentProject("infra-resources-dev")).resolves.toBe(
      true,
    );
    expect(execFilePromiseMock).toHaveBeenCalledWith("npx", [
      "nx",
      "show",
      "project",
      "infra-resources-dev",
      "--json",
    ]);
  });

  it("returns false when the project only has public tags", async () => {
    execFilePromiseMock.mockResolvedValue({
      stderr: "",
      stdout: '{"tags":["terraform","terraform:public"]}',
    });

    await expect(isEnvironmentProject("infra-modules-storage")).resolves.toBe(
      false,
    );
  });

  it("returns false when the project has no tags", async () => {
    execFilePromiseMock.mockResolvedValue({
      stderr: "",
      stdout: '{"root":"infra/resources/dev"}',
    });

    await expect(isEnvironmentProject("infra-resources-dev")).resolves.toBe(
      false,
    );
  });

  it("returns false when project metadata cannot be retrieved", async () => {
    execFilePromiseMock.mockRejectedValue(new Error("nx show project failed"));

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(isEnvironmentProject("infra-resources-dev")).resolves.toBe(
      false,
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "getNxProjectMetadata(infra-resources-dev) failed:",
      expect.any(Error),
    );
  });
});

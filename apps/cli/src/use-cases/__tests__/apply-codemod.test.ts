import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { Codemod, CodemodRegistry } from "../../domain/codemod.js";

import { InfoResult } from "../../domain/info.js";
import { applyCodemodById } from "../apply-codemod.js";

const info = vi.fn().mockResolvedValue({
  packageManager: "npm",
} satisfies InfoResult);

describe("applyCodemodById", () => {
  it("applies the codemod when found", async () => {
    const apply: Codemod["apply"] = vi.fn().mockResolvedValue(undefined);

    const codemod: Codemod = {
      apply,
      description: "test codemod",
      id: "foo",
    };

    const registry: CodemodRegistry = {
      getAll: vi.fn(),
      getById: vi
        .fn()
        .mockReturnValue(okAsync<Codemod | undefined, Error>(codemod)),
    };

    const result = await applyCodemodById(registry, info)("foo");

    expect(result.isOk()).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("returns an error when codemod is not found", async () => {
    const registry: CodemodRegistry = {
      getAll: vi.fn(),
      getById: vi
        .fn()
        .mockReturnValue(okAsync<Codemod | undefined, Error>(undefined)),
    };

    const result = await applyCodemodById(registry, info)("missing-id");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe("Codemod with id missing-id not found");
    }
  });

  it("propagates getById errors", async () => {
    const registryError = new Error("registry failed");
    const registry: CodemodRegistry = {
      getAll: vi.fn(),
      getById: vi
        .fn()
        .mockReturnValue(errAsync<Codemod | undefined, Error>(registryError)),
    };

    const result = await applyCodemodById(registry, info)("foo");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain(registryError.message);
    }
  });

  it("propagates apply errors", async () => {
    const applyError = new Error("apply failed");
    const codemod: Codemod = {
      apply: vi.fn().mockRejectedValue(applyError),
      description: "test codemod",
      id: "foo",
    };

    const registry: CodemodRegistry = {
      getAll: vi.fn(),
      getById: vi
        .fn()
        .mockReturnValue(okAsync<Codemod | undefined, Error>(codemod)),
    };

    const result = await applyCodemodById(registry, info)("foo");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain(applyError.message);
    }
  });
});

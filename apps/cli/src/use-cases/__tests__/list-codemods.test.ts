import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { Codemod, CodemodRegistry } from "../../domain/codemod.js";

import { listCodemods } from "../list-codemods.js";

describe("listCodemods", () => {
  it("returns codemods from the registry", async () => {
    const codemods: Codemod[] = [
      {
        apply: vi.fn().mockResolvedValue(undefined),
        description: "a",
        id: "a",
      },
      {
        apply: vi.fn().mockResolvedValue(undefined),
        description: "b",
        id: "b",
      },
    ];

    const registry: CodemodRegistry = {
      getAll: vi.fn().mockReturnValue(okAsync<Codemod[], Error>(codemods)),
      getById: vi.fn(),
    };

    const result = await listCodemods(registry)();

    expect(result.isOk()).toBe(true);
    expect(registry.getAll).toHaveBeenCalledTimes(1);
  });

  it("propagates registry errors", async () => {
    const error = new Error("boom");
    const registry: CodemodRegistry = {
      getAll: vi.fn().mockReturnValue(errAsync<Codemod[], Error>(error)),
      getById: vi.fn(),
    };

    const result = await listCodemods(registry)();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe(error);
    }
  });
});

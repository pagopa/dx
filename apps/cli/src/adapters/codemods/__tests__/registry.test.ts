import { ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { Codemod } from "../../../domain/codemod.js";

import { LocalCodemodRegistry } from "../registry.js";

describe("LocalCodemodRegistry", () => {
  const makeCodemod = (id: string, description = id): Codemod => ({
    apply: vi.fn().mockResolvedValue(undefined),
    description,
    id,
  });

  it("returns empty list when no codemods are registered", async () => {
    const registry = new LocalCodemodRegistry();

    const result = await registry.getAll();

    expect(result).toStrictEqual(ok([]));
  });

  it("adds codemods and lists them via getAll", async () => {
    const registry = new LocalCodemodRegistry();

    const a = makeCodemod("a", "A");
    const b = makeCodemod("b", "B");

    registry.add(a);
    registry.add(b);

    const result = await registry.getAll();

    expect.assertions(3);

    expect(result.isOk()).toBe(true);

    const expected = result.unwrapOr([]);

    expect(expected).toHaveLength(2);
    expect(expected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "a" }),
        expect.objectContaining({ id: "b" }),
      ]),
    );
  });

  it("retrieves a codemod by id and returns undefined when missing", async () => {
    const registry = new LocalCodemodRegistry();
    const a = makeCodemod("a", "A");
    registry.add(a);

    const found = await registry.getById("a");
    expect(found.isOk()).toBe(true);

    const expected = found.unwrapOr(undefined);
    expect(expected).toBe(a);

    const missing = await registry.getById("nope");
    expect(missing.isOk()).toBe(true);
    const missingValue = missing.unwrapOr(undefined);
    expect(missingValue).toBeUndefined();
  });

  it("overwrites an existing codemod when adding with the same id", async () => {
    const registry = new LocalCodemodRegistry();
    const first = makeCodemod("a", "first");
    const second = makeCodemod("a", "second");

    registry.add(first);
    registry.add(second);

    const byId = await registry.getById("a");
    expect(byId.isOk()).toBe(true);
    const byIdValue = byId.unwrapOr(undefined);
    expect(byIdValue).toBe(second);
    expect(byIdValue).not.toBe(first);
  });
});

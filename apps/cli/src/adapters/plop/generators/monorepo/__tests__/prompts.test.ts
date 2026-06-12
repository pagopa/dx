/**
 * Verifies how the monorepo generator prompts behave when init pre-fills
 * answers from CLI flags before invoking plop.
 */
import { describe, expect, it } from "vitest";

import { getPrompts } from "../prompts.js";

describe("getPrompts", () => {
  it("asks only for init answers that were not provided via flags", () => {
    const prompts = getPrompts({
      repoName: "my-dx-workspace",
    });

    expect(prompts).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "repoOwner" }),
        expect.objectContaining({ name: "repoDescription" }),
      ]),
    );
  });

  it("asks no payload questions when all init answers were provided via flags", () => {
    expect(
      getPrompts({
        repoDescription: "My DX workspace",
        repoName: "my-dx-workspace",
        repoOwner: "pagopa",
      }),
    ).toStrictEqual([]);
  });

  it("ask all prompts", () => {
    const prompts = getPrompts();

    expect(prompts).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "repoName" }),
        expect.objectContaining({ name: "repoOwner" }),
        expect.objectContaining({ name: "repoDescription" }),
      ]),
    );
  });
});

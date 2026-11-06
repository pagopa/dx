/**
 * Verifies how the monorepo generator prompts behave when init pre-fills
 * answers from CLI flags before invoking plop.
 */
import { describe, expect, it } from "vitest";

import {
  getPrompts,
  payloadSchema,
  repoTopicsSchema,
  splitTopics,
} from "../prompts.js";

describe("getPrompts", () => {
  it("asks only for init answers that were not provided via flags", () => {
    const prompts = getPrompts({
      repoName: "my-dx-workspace",
    });

    expect(prompts).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "repoOwner" }),
        expect.objectContaining({ name: "repoDescription" }),
        expect.objectContaining({ name: "repoTopics" }),
      ]),
    );
  });

  it("asks no payload questions when all init answers were provided via flags", () => {
    expect(
      getPrompts({
        repoDescription: "My DX workspace",
        repoName: "my-dx-workspace",
        repoOwner: "pagopa",
        repoTopics: [],
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
        expect.objectContaining({ name: "repoTopics" }),
      ]),
    );
  });

  describe("repository topics", () => {
    it("defaults missing topics to an empty array", () => {
      expect(payloadSchema.parse({ repoName: "my-repo" }).repoTopics).toEqual(
        [],
      );
    });

    it("converts comma-separated prompt input to an array", () => {
      expect(splitTopics("typescript, pagopa-dx, ,terraform")).toEqual([
        "typescript",
        "pagopa-dx",
        "terraform",
      ]);
      expect(splitTopics("   ")).toEqual([]);
    });

    it.each([
      'invalid"topic',
      "${injection}",
      "UPPERCASE",
      "has spaces",
      "a".repeat(51),
    ])("rejects invalid topic %s", (topic) => {
      expect(repoTopicsSchema.safeParse([topic]).success).toBe(false);
    });

    it("rejects more than 20 topics", () => {
      expect(
        repoTopicsSchema.safeParse(
          Array.from({ length: 21 }, (_, i) => `topic-${i}`),
        ).success,
      ).toBe(false);
    });
  });
});

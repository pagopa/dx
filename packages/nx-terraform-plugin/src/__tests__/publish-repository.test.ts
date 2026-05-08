import { describe, expect, it } from "vitest";

import { ensureRepository } from "../github.ts";

describe("ensureRepository", () => {
  it("returns created false when the repository already exists", async () => {
    const createdRepositories: string[] = [];
    const client = {
      createRepo: async (owner: string, repo: string) => {
        createdRepositories.push(`${owner}/${repo}`);
      },
      getRepo: async () => "found" as const,
    };

    const result = await ensureRepository(client, {
      owner: "pagopa-dx",
      repo: "terraform-aws-x",
    });

    expect(result).toEqual({
      created: false,
      owner: "pagopa-dx",
      repo: "terraform-aws-x",
    });
    expect(createdRepositories).toEqual([]);
  });

  it("creates the repository when it does not exist", async () => {
    const createdRepositories: string[] = [];
    const client = {
      createRepo: async (owner: string, repo: string) => {
        createdRepositories.push(`${owner}/${repo}`);
      },
      getRepo: async () => "not-found" as const,
    };

    const result = await ensureRepository(client, {
      owner: "pagopa-dx",
      repo: "terraform-aws-x",
    });

    expect(result).toEqual({
      created: true,
      owner: "pagopa-dx",
      repo: "terraform-aws-x",
    });
    expect(createdRepositories).toEqual(["pagopa-dx/terraform-aws-x"]);
  });

  it("propagates repository creation failures", async () => {
    const client = {
      createRepo: async () => {
        throw new Error("cannot create repository");
      },
      getRepo: async () => "not-found" as const,
    };

    await expect(
      ensureRepository(client, {
        owner: "pagopa-dx",
        repo: "terraform-aws-x",
      }),
    ).rejects.toThrow("cannot create repository");
  });
});

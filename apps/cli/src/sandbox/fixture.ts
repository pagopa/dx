/**
 * Sandbox fixture loader.
 *
 * Loads initial sandbox state from JSON fixture files. Developers and tests
 * select a scenario to seed fake services with realistic cloud accounts,
 * repositories, and configuration.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod/v4";

import { createEmptySandboxState, type SandboxState } from "./state.js";

const sandboxFixtureSchema = z.object({
  cloudAccounts: z
    .array(
      z.object({
        csp: z.literal("azure").default("azure"),
        defaultLocation: z.string(),
        displayName: z.string(),
        id: z.string(),
        initialized: z.boolean().optional(),
        terraformBackendProvisioned: z.boolean().optional(),
      }),
    )
    .optional()
    .default([]),
  repositories: z
    .array(
      z.object({
        branches: z.array(z.string()).optional().default(["main"]),
        name: z.string(),
        owner: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export type SandboxFixture = z.infer<typeof sandboxFixtureSchema>;

/**
 * Loads a fixture file and returns the initial sandbox state.
 * If no path is provided, returns an empty state.
 */
export const loadFixture = async (
  fixturePath?: string,
): Promise<SandboxState> => {
  if (!fixturePath) {
    return createEmptySandboxState();
  }

  const resolved = path.resolve(fixturePath);
  const content = await fs.readFile(resolved, "utf-8");
  const parsed = JSON.parse(content);
  const fixture = sandboxFixtureSchema.parse(parsed);

  return {
    cloudAccounts: fixture.cloudAccounts,
    environmentSecrets: [],
    operationLog: [],
    pullRequests: [],
    repositories: fixture.repositories,
  };
};

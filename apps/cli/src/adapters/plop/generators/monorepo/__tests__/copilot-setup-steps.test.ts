/**
 * Contract tests for the GitHub Copilot coding agent support of the monorepo
 * generator: the scaffold must ship a `copilot-setup-steps` workflow that a
 * freshly generated repository can run without manual setup.
 */
import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";

import { resolveTemplatesPath } from "../../../templates-path.js";
import {
  cleanupTempDir,
  readGeneratedFiles,
} from "../../__tests__/temp-dir.js";
import getActions from "../actions.js";
import { Payload, PLOP_MONOREPO_GENERATOR_NAME } from "../index.js";

const COPILOT_WORKFLOW_PATH = ".github/workflows/copilot-setup-steps.yml";

/** Copilot only picks up the setup steps of a job named like this. */
const COPILOT_JOB_NAME = "copilot-setup-steps";

const COMMIT_SHA_PIN = /@[0-9a-f]{40}\b/;

/** Copilot ignores any other job setting without warning. */
const HONOURED_JOB_SETTINGS = new Set([
  "permissions",
  "runs-on",
  "services",
  "snapshot",
  "steps",
  "timeout-minutes",
]);

/** Copilot refuses a `timeout-minutes` above this value. */
const MAX_TIMEOUT_MINUTES = 59;

const stepSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  run: z.string().optional(),
  uses: z.string().optional(),
  with: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
});

const workflowSchema = z.object({
  jobs: z.object({
    [COPILOT_JOB_NAME]: z.object({
      permissions: z.record(z.string(), z.string()),
      steps: z.array(stepSchema),
      "timeout-minutes": z.number(),
    }),
  }),
});

type SetupJob = z.infer<typeof workflowSchema>["jobs"]["copilot-setup-steps"];
type Step = SetupJob["steps"][number];

/** Stubs for the custom action types that call external services. */
const registerStubActions = (plop: NodePlopAPI) => {
  plop.setActionType("getNodeVersion", async (data) => {
    data.nodeVersion = "22.14.0";
    return "Fetched latest version: 22.14.0";
  });
  plop.setActionType("fetchGithubRelease", async (data, ctx) => {
    const resultKey = (ctx as Record<string, unknown>).resultKey as string;
    data[resultKey] = "1.11.0";
    return `Fetched latest version: 1.11.0`;
  });
  plop.setActionType("setupPnpm", async () => "Monorepo bootstrapped");
};

const payload: Payload = {
  repoDescription: "A test repository for DX",
  repoName: "my-test-repo",
  repoOwner: "pagopa",
};

const readSetupJob = async (generatedRoot: string): Promise<SetupJob> => {
  const files = await readGeneratedFiles(generatedRoot, [
    COPILOT_WORKFLOW_PATH,
  ]);

  return workflowSchema.parse(parse(files[COPILOT_WORKFLOW_PATH])).jobs[
    COPILOT_JOB_NAME
  ];
};

/** Reads the job as written, so the schema cannot hide an unsupported key. */
const readRawSetupJob = async (
  generatedRoot: string,
): Promise<Record<string, unknown>> => {
  const files = await readGeneratedFiles(generatedRoot, [
    COPILOT_WORKFLOW_PATH,
  ]);
  const workflow = parse(files[COPILOT_WORKFLOW_PATH]) as {
    jobs: Record<string, Record<string, unknown>>;
  };

  return workflow.jobs[COPILOT_JOB_NAME];
};

const requireStepUsing = (steps: readonly Step[], action: string) => {
  const index = steps.findIndex((step) => step.uses?.startsWith(`${action}@`));
  const step = steps[index];

  if (!step?.uses) {
    throw new Error(`No step uses ${action}`);
  }

  return { index, uses: step.uses, with: step.with };
};

describe("monorepo generator — Copilot coding agent setup", () => {
  let generatedRoot: string;
  let tmpDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-cli-monorepo-copilot-test-"),
    );
    process.chdir(tmpDir);
    generatedRoot = path.join(tmpDir, payload.repoName);

    const plop = await nodePlop();
    registerStubActions(plop);
    plop.setGenerator(PLOP_MONOREPO_GENERATOR_NAME, {
      actions: getActions(resolveTemplatesPath("monorepo")),
      description: "A scaffold for a monorepo repository",
      prompts: [],
    });

    const generator = plop.getGenerator(PLOP_MONOREPO_GENERATOR_NAME);
    const result = await generator.runActions(payload);

    const realFailures = result.failures.filter(
      (f) => f.error !== "Aborted due to previous action failure",
    );
    if (realFailures.length > 0) {
      const summary = realFailures
        .map((f) => `${f.type}: ${f.error}`)
        .join("\n");
      throw new Error(`Generator failed:\n${summary}`);
    }
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  });

  it("ships the workflow Copilot runs before it starts", async () => {
    const job = await readSetupJob(generatedRoot);

    expect(job.steps.length).toBeGreaterThan(0);
  });

  it("installs the mise toolchain before authenticating to the registry", async () => {
    const job = await readSetupJob(generatedRoot);
    const miseStep = requireStepUsing(job.steps, "jdx/mise-action");
    const registryStep = requireStepUsing(
      job.steps,
      "pagopa/dx/actions/setup-npm-registry",
    );

    expect(miseStep.uses).toMatch(COMMIT_SHA_PIN);
    expect(miseStep.index).toBeLessThan(registryStep.index);
    // The scaffold enables mise experimental settings and pins a minimum
    // release age: without these inputs the action refuses the config and the
    // `pnpm` the last step needs is never installed.
    expect(miseStep.with).toStrictEqual({
      experimental: true,
      minimum_release_age: "7d",
    });
  });

  it("authenticates to the registry with the workflow token", async () => {
    const job = await readSetupJob(generatedRoot);
    const registryStep = requireStepUsing(
      job.steps,
      "pagopa/dx/actions/setup-npm-registry",
    );

    expect(registryStep.uses).toBe("pagopa/dx/actions/setup-npm-registry@main");
    // GitHub Packages wants a token even for public packages. The scaffold
    // reads none, so the credential is the workflow token granted above: no
    // secret to configure, and nothing Copilot would have to receive.
    expect(registryStep.with?.token).toBe("${{ github.token }}");
  });

  it("grants the scope the fallback workflow token needs", async () => {
    const job = await readSetupJob(generatedRoot);

    expect(job.permissions).toStrictEqual({
      contents: "read",
      packages: "read",
    });
  });

  it("declares a timeout Copilot accepts", async () => {
    const job = await readSetupJob(generatedRoot);

    expect(job["timeout-minutes"]).toBeGreaterThan(0);
    expect(job["timeout-minutes"]).toBeLessThanOrEqual(MAX_TIMEOUT_MINUTES);
  });

  it("only configures the job settings Copilot honours", async () => {
    const job = await readRawSetupJob(generatedRoot);
    const unsupported = Object.keys(job).filter(
      (key) => !HONOURED_JOB_SETTINGS.has(key),
    );

    // Copilot drops every other setting silently, so an `env:` or a
    // `concurrency:` here would read as effective while changing nothing.
    expect(unsupported).toStrictEqual([]);
  });

  it("installs the workspace dependencies so the agent can build", async () => {
    const job = await readSetupJob(generatedRoot);

    expect(job.steps.some((step) => step.run?.includes("pnpm install"))).toBe(
      true,
    );
  });

  it("pins every external action to a commit SHA", async () => {
    const job = await readSetupJob(generatedRoot);
    const externalActions = job.steps
      .map((step) => step.uses)
      .filter((uses) => uses !== undefined && !uses.startsWith("pagopa/dx/"));

    expect(externalActions.length).toBeGreaterThan(0);
    for (const action of externalActions) {
      expect(action).toMatch(COMMIT_SHA_PIN);
    }
  });

  it("documents that the workflow needs no secret", async () => {
    const files = await readGeneratedFiles(generatedRoot, ["README.md"]);
    const readme = files["README.md"];

    expect(readme).toContain(COPILOT_WORKFLOW_PATH);
    // The scaffold installs only public packages, so the workflow token is the
    // whole credential story and the README must not send anyone looking for a
    // secret to configure.
    expect(readme).toContain("needs no secret");
    expect(readme).not.toContain("PACKAGES_TOKEN");
  });

  it("tells AI agents about the workflow in AGENTS.md", async () => {
    const files = await readGeneratedFiles(generatedRoot, ["AGENTS.md"]);

    expect(files["AGENTS.md"]).toContain(COPILOT_WORKFLOW_PATH);
  });
});

/**
 * Protects the optional registry authentication contract used by the generated
 * Code Review caller and the shared validation workflow.
 */
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";

import { resolveTemplatesPath } from "../../../templates-path.js";
import { cleanupTempDir } from "../../__tests__/temp-dir.js";

const execute = promisify(execFile);
const stepSchema = z.object({
  "continue-on-error": z.boolean().optional(),
  env: z.record(z.string(), z.string()).optional(),
  id: z.string().optional(),
  if: z.string().optional(),
  name: z.string(),
  run: z.string().optional(),
  uses: z.string().optional(),
  with: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .optional(),
});
const workflowSchema = z.object({
  jobs: z.record(
    z.string(),
    z.object({
      env: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
      if: z.string().optional(),
      needs: z.union([z.string(), z.array(z.string())]).optional(),
      outputs: z.record(z.string(), z.string()).optional(),
      permissions: z.record(z.string(), z.string()).optional(),
      steps: z.array(stepSchema),
    }),
  ),
  on: z.object({
    workflow_call: z.object({
      secrets: z.record(z.string(), z.object({ required: z.boolean() })),
    }),
  }),
});

describe("shared validation workflow - optional ECR Public login", () => {
  let workflow: z.infer<typeof workflowSchema>;

  beforeAll(async () => {
    const source = await fs.readFile(
      path.resolve(
        resolveTemplatesPath("monorepo"),
        "../../../../.github/workflows/validate-v2.yaml",
      ),
      "utf8",
    );
    const result = workflowSchema.safeParse(parse(source));
    if (!result.success) {
      throw new Error("Invalid validation workflow contract", {
        cause: result.error,
      });
    }
    workflow = result.data;
  });

  it("keeps the pull role optional and evaluates its presence behind the fork gate", () => {
    expect(workflow.on.workflow_call.secrets.ECR_PUBLIC_ROLE_ARN.required).toBe(
      false,
    );
    const gate = workflow.jobs.gate;
    const evaluation = gate.steps.find(
      (step) => step.id === "evaluate-ecr-public",
    );
    expect(evaluation?.if).toBe("${{ steps.evaluate.outputs.run == 'true' }}");
    expect(evaluation?.env).toEqual({
      ECR_PUBLIC_ROLE_ARN: "${{ secrets.ECR_PUBLIC_ROLE_ARN }}",
    });
    expect(gate.outputs?.["ecr-public-configured"]).toBe(
      "${{ steps.evaluate-ecr-public.outputs.configured }}",
    );
  });

  it.each([
    ["absent or withheld", "", "false"],
    ["available", "arn:aws:iam::123456789012:role/ecr-public-pull", "true"],
    ["invalid but configured", "invalid-role", "true"],
  ])(
    "detects %s credentials without printing them",
    async (_, role, enabled) => {
      const script = workflow.jobs.gate.steps.find(
        (step) => step.id === "evaluate-ecr-public",
      )?.run;
      expect(script).toBeDefined();
      if (!script) {
        throw new Error("Missing ECR Public credential evaluation");
      }
      const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "dx-ecr-public-test-"),
      );
      const output = path.join(directory, "output");

      try {
        const { stderr, stdout } = await execute(
          "/bin/bash",
          ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script],
          { env: { ECR_PUBLIC_ROLE_ARN: role, GITHUB_OUTPUT: output } },
        );

        await expect(fs.readFile(output, "utf8")).resolves.toBe(
          `configured=${enabled}\n`,
        );
        expect(stderr).toBe("");
        expect(stdout).toBe(
          role
            ? ""
            : "::notice::ECR_PUBLIC_ROLE_ARN is not configured. ECR Public pulls remain anonymous.\n",
        );
      } finally {
        await cleanupTempDir(directory);
      }
    },
  );

  it.each([
    ["code-review", "Run code quality checks on affected projects"],
    [
      "code-review-with-environment",
      "Run Terraform plan on affected environment projects",
    ],
  ])("logs the pull client in before checks in %s", (jobName, checkName) => {
    const job = workflow.jobs[jobName];
    const credentials = job.steps.find(
      (step) => step.id === "ecr-public-credentials",
    );
    const login = job.steps.find(
      (step) => step.name === "Log in to Amazon ECR Public",
    );
    const condition =
      "${{ needs.gate.outputs.ecr-public-configured == 'true' }}";

    expect(job.needs).toContain("gate");
    expect(job.permissions?.["id-token"]).toBe("write");
    expect(credentials?.if).toBe(condition);
    expect(credentials?.uses).toMatch(
      /^aws-actions\/configure-aws-credentials@[a-f0-9]{40}$/,
    );
    expect(credentials?.with).toMatchObject({
      "aws-region": "us-east-1",
      "mask-aws-account-id": true,
      "output-credentials": true,
      "output-env-credentials": false,
      "role-to-assume": "${{ secrets.ECR_PUBLIC_ROLE_ARN }}",
    });
    expect(login?.if).toBe(condition);
    expect(login?.uses).toMatch(/^aws-actions\/amazon-ecr-login@[a-f0-9]{40}$/);
    expect(login?.env).toEqual({
      AWS_ACCESS_KEY_ID:
        "${{ steps.ecr-public-credentials.outputs.aws-access-key-id }}",
      AWS_DEFAULT_REGION: "us-east-1",
      AWS_REGION: "us-east-1",
      AWS_SECRET_ACCESS_KEY:
        "${{ steps.ecr-public-credentials.outputs.aws-secret-access-key }}",
      AWS_SESSION_TOKEN:
        "${{ steps.ecr-public-credentials.outputs.aws-session-token }}",
    });
    expect(login?.with).toEqual({
      "mask-password": "true",
      "registry-type": "public",
    });
    expect(credentials?.["continue-on-error"]).not.toBe(true);
    expect(login?.["continue-on-error"]).not.toBe(true);
    expect(
      job.steps.findIndex((step) => step.id === credentials?.id),
    ).toBeLessThan(job.steps.findIndex((step) => step.name === login?.name));
    expect(
      job.steps.findIndex((step) => step.name === login?.name),
    ).toBeLessThan(job.steps.findIndex((step) => step.name === checkName));
    expect(job.env ?? {}).not.toHaveProperty("AWS_ACCESS_KEY_ID");
    expect(job.env ?? {}).not.toHaveProperty("AWS_SECRET_ACCESS_KEY");
  });
});

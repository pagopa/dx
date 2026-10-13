/**
 * Repository-state CLI contracts through real commands, generators, and presenters.
 */
import inquirer from "inquirer";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { seedInitializedSubscription } from "../../../azure/__tests__/arm-fixture.js";
import { localState } from "../../../terraform/__tests__/state-fixture.js";
import { createCliStateFixture } from "./cli-state-fixture.js";

vi.mock("@azure/arm-resourcegraph", async () => {
  const { ResourceGraphClient } =
    await import("../../../azure/__tests__/arm-fixture.js");
  return { ResourceGraphClient };
});
vi.mock("@azure/arm-msi", async () => {
  const { ManagedServiceIdentityClient } =
    await import("../../../azure/__tests__/arm-fixture.js");
  return { ManagedServiceIdentityClient };
});
vi.mock("@azure/arm-resources", async () => {
  const { ResourceManagementClient } =
    await import("../../../azure/__tests__/arm-fixture.js");
  return { ResourceManagementClient };
});
vi.mock("@azure/arm-resources-subscriptions", async () => {
  const { SubscriptionClient } =
    await import("../../../azure/__tests__/arm-fixture.js");
  return { SubscriptionClient };
});
vi.mock("@azure/storage-blob", async () => {
  const { BlobServiceClient } =
    await import("../../../azure/__tests__/blob-fixture.js");
  return { BlobServiceClient };
});

let fixture: Awaited<ReturnType<typeof createCliStateFixture>>;

beforeEach(async () => {
  fixture = await createCliStateFixture();
});

afterEach(async () => {
  await fixture.dispose();
});

const initArguments = [
  "node",
  "dx",
  "init",
  "--name",
  "test-repo",
  "--owner",
  "pagopa",
  "--description",
  "Repository-state contract fixture",
];

const repositoryConfiguration = `module "github_repository" {
  source = "fixture"
  repository = {
    name = "test-repo"
  }
}
`;

const addArguments = (keyPath: string) => [
  "node",
  "dx",
  "add",
  "environment",
  "--name",
  "dev",
  "--prefix",
  "dx",
  "--domain",
  "payments",
  "--owner",
  "DX Platform",
  "--account",
  "subscription-dev",
  "--cost-center",
  "TS000 - TECNOLOGIA & SERVIZI",
  "--business-unit",
  "Platform",
  "--management-team",
  "DX",
  "--location",
  "subscription-dev=italynorth",
  "--runner-app-id",
  "fixture-app",
  "--client-id",
  "fixture-client",
  "--installation-id",
  "fixture-installation",
  "--private-key-path",
  keyPath,
];

describe("repository-state CLI contracts", () => {
  it("reports published repository state as temporary and keeps the actual local snapshot", async () => {
    await fixture.program().parseAsync([...initArguments, "--publish"]);

    expect(JSON.parse(fixture.stdout.join(""))).toMatchObject({
      data: {
        repositoryState: {
          nextStep: "dx add environment",
          path: "infra/repository/terraform.tfstate",
          status: "local-temporary",
        },
      },
      ok: true,
    });
    await expect(
      fs.readFile(
        path.join(
          fixture.root,
          "test-repo",
          "infra",
          "repository",
          "terraform.tfstate",
        ),
        "utf8",
      ),
    ).resolves.toBe(localState);
    expect(fixture.consoleOutput).toEqual([]);
  });

  it("reports state as not created when the operator declines GitHub publication", async () => {
    vi.spyOn(inquirer, "prompt").mockResolvedValue({ confirm: false });

    await fixture.program().parseAsync(initArguments);

    expect(JSON.parse(fixture.stdout.join(""))).toMatchObject({
      data: {
        gitHubRepoCreationSkipped: true,
        repositoryState: {
          nextStep:
            "Apply infra/repository manually, then run dx add environment",
          path: "infra/repository/terraform.tfstate",
          status: "not-created",
        },
      },
      ok: true,
    });
    await expect(
      fs.readdir(path.join(fixture.root, "test-repo", "infra", "repository")),
    ).resolves.not.toContain("terraform.tfstate");
    expect(fixture.consoleOutput).toEqual([]);
  });

  it("warns text-mode operators to keep temporary state until add environment migrates it", async () => {
    await fixture
      .program("text", false)
      .parseAsync([...initArguments, "--publish"]);

    const output = fixture.consoleOutput.join("\n");
    expect(output).toContain(
      "Repository state is temporarily local at infra/repository/terraform.tfstate.",
    );
    expect(output).toContain(
      "Do not delete it or run repository apply from another device.",
    );
    expect(output).toContain("Run `dx add environment`");
  });
});

describe("repository-state environment commands", () => {
  it("reports a real migration failure with credential-free retry guidance before applying environments", async () => {
    fixture.useExistingRepository();
    seedInitializedSubscription();
    const keyPath = path.join(fixture.root, "runner.pem");
    await fs.writeFile(keyPath, "fixture-private-key-value");
    await fs.writeFile(
      path.join(fixture.repositoryPath, "main.tf"),
      repositoryConfiguration,
    );
    await fixture.seedLocal();
    await fixture.scenario({ failure: "migration" });

    await fixture.program().parseAsync([...addArguments(keyPath), "--yes"]);

    const envelope = z
      .object({ error: z.string(), ok: z.literal(false) })
      .parse(JSON.parse(fixture.stdout.join("")));
    expect(envelope.error).toContain(
      "Terraform init failed during repository state preparation",
    );
    expect(envelope.error).toContain("Retry:\n  dx add environment");
    expect(envelope.error).toContain("--name 'dev'");
    expect(envelope.error).toContain("--yes");
    expect(envelope.error).not.toContain("fixture-private-key-value");
    expect(process.exitCode).toBe(1);
    await expect(
      fs.readFile(path.join(fixture.repositoryPath, "main.tf"), "utf8"),
    ).resolves.toBe(repositoryConfiguration);
    await expect(fs.readdir(fixture.root)).resolves.not.toContain(
      "environment-applied",
    );
    expect(fixture.consoleOutput).toEqual([]);
  });

  it("requires explicit permanent-placement consent in CI before changing any repository configuration", async () => {
    fixture.useExistingRepository();
    seedInitializedSubscription();
    const keyPath = path.join(fixture.root, "runner.pem");
    await fs.writeFile(keyPath, "fixture-private-key-value");
    await fs.writeFile(
      path.join(fixture.repositoryPath, "main.tf"),
      repositoryConfiguration,
    );
    await fixture.seedLocal();
    await fixture.scenario({ failure: "migration" });

    await fixture.program().parseAsync(addArguments(keyPath));

    const envelope = z
      .object({ error: z.string(), ok: z.literal(false) })
      .parse(JSON.parse(fixture.stdout.join("")));
    expect(envelope.error).toContain(
      "Pass --yes to confirm repository state placement",
    );
    expect(envelope.error).toContain("Subscription: subscription-dev");
    expect(envelope.error).toContain("Key: dx/payments/repository.tfstate");
    expect(envelope.error).toContain("This destination is permanent");
    await expect(
      fs.readFile(path.join(fixture.repositoryPath, "providers.tf"), "utf8"),
    ).resolves.toBe("terraform {\n}\n");
    await expect(fs.readdir(fixture.root)).resolves.not.toContain(
      "environment-applied",
    );
  });

  it("leaves repository state local when an interactive operator declines permanent placement", async () => {
    fixture.useExistingRepository();
    seedInitializedSubscription();
    vi.spyOn(inquirer, "prompt").mockResolvedValue({ confirm: false });
    const keyPath = path.join(fixture.root, "runner.pem");
    await fs.writeFile(keyPath, "fixture-private-key-value");
    await fs.writeFile(
      path.join(fixture.repositoryPath, "main.tf"),
      repositoryConfiguration,
    );
    await fixture.seedLocal();
    await fixture.scenario({ failure: "migration" });

    await fixture.program("json", false).parseAsync(addArguments(keyPath));

    expect(JSON.parse(fixture.stdout.join(""))).toMatchObject({
      error:
        "Repository state placement was not confirmed. No environment actions have run.",
      ok: false,
    });
    await expect(
      fs.readFile(path.join(fixture.repositoryPath, "providers.tf"), "utf8"),
    ).resolves.toBe("terraform {\n}\n");
    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("reports verified permanent state and reuses its destination when adding a different domain", async () => {
    fixture.useExistingRepository();
    seedInitializedSubscription();
    const keyPath = path.join(fixture.root, "runner.pem");
    await fs.writeFile(keyPath, "fixture-private-key-value");
    await fs.writeFile(
      path.join(fixture.repositoryPath, "main.tf"),
      repositoryConfiguration,
    );
    await fixture.configureBackend();
    await fixture.putRemote(localState);
    const args = addArguments(keyPath).map((argument) =>
      argument === "payments" ? "next-domain" : argument,
    );

    await fixture.program().parseAsync(args);

    expect(JSON.parse(fixture.stdout.join(""))).toMatchObject({
      data: {
        payload: {
          repositoryState: {
            destination: {
              containerName: "terraform-state",
              key: "dx/payments/repository.tfstate",
            },
            status: "remote-verified",
          },
        },
      },
      ok: true,
    });
    await expect(
      fs.readFile(path.join(fixture.root, "environment-applied"), "utf8"),
    ).resolves.toBe("applied");
    expect(fixture.consoleOutput).toEqual([]);
  }, 20_000);
});

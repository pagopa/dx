/**
 * Unit tests for packager utilities.
 */

import { mkdtempSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TerraformConfig } from "@/core/config/config.schema.js";

import { generateTerraformAssets } from "@/builders/azure-dashboard/packager.js";

describe("generateTerraformAssets", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "opex-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true });
  });

  it("should generate main.tf and variables.tf without terraform config", () => {
    generateTerraformAssets(tempDir);

    expect(statSync(join(tempDir, "main.tf")).isFile()).toBe(true);
    expect(statSync(join(tempDir, "variables.tf")).isFile()).toBe(true);

    const mainTf = readFileSync(join(tempDir, "main.tf"), "utf-8");
    const variablesTf = readFileSync(join(tempDir, "variables.tf"), "utf-8");

    expect(mainTf).toContain("terraform");
    expect(variablesTf).toContain("variable");
  });

  it("should generate environment-specific files when terraform config is provided", () => {
    const terraformConfig: TerraformConfig = {
      environments: {
        dev: {
          backend: {
            container_name: "tfstate",
            key: "dev.tfstate",
            resource_group_name: "test-rg",
            storage_account_name: "teststorage",
          },
          env_short: "d",
          prefix: "test",
        },
        prod: {
          env_short: "p",
          prefix: "test",
        },
      },
    };

    generateTerraformAssets(tempDir, terraformConfig);

    // Check main files
    expect(statSync(join(tempDir, "main.tf")).isFile()).toBe(true);
    expect(statSync(join(tempDir, "variables.tf")).isFile()).toBe(true);

    // Check env/dev
    expect(statSync(join(tempDir, "env", "dev")).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, "env", "dev", "backend.tfvars")).isFile()).toBe(true);
    expect(statSync(join(tempDir, "env", "dev", "terraform.tfvars")).isFile()).toBe(true);

    // Check env/prod
    expect(statSync(join(tempDir, "env", "prod")).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, "env", "prod", "terraform.tfvars")).isFile()).toBe(true);
    // prod has no backend, so no backend.tfvars

    // Check content
    const devBackend = readFileSync(join(tempDir, "env", "dev", "backend.tfvars"), "utf-8");
    expect(devBackend).toContain('resource_group_name  = "test-rg"');
    expect(devBackend).toContain('storage_account_name = "teststorage"');
    expect(devBackend).toContain('container_name       = "tfstate"');
    expect(devBackend).toContain('key                  = "dev.tfstate"');

    const devTerraform = readFileSync(join(tempDir, "env", "dev", "terraform.tfvars"), "utf-8");
    expect(devTerraform).toContain('prefix    = "test"');
    expect(devTerraform).toContain('env_short = "d"');
  });

  it("should skip environments without config", () => {
    const terraformConfig: TerraformConfig = {
      environments: {
        dev: undefined,
        prod: {
          env_short: "p",
          prefix: "test",
        },
      },
    };

    generateTerraformAssets(tempDir, terraformConfig);

    // dev should not be created
    expect(() => statSync(join(tempDir, "env", "dev"))).toThrow();

    // prod should be created
    expect(statSync(join(tempDir, "env", "prod")).isDirectory()).toBe(true);
  });
});
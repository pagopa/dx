/**
 * Terraform package creation utilities.
 */

import * as fs from "fs";
import * as path from "path";

import type { TerraformConfig } from "../../core/config/config.schema.js";

import {
  generateBackendTfvars,
  generateMainTf,
  generateTerraformTfvars,
  generateVariablesTf,
} from "./terraform-assets.js";

/**
 * Generate Terraform assets (main.tf, variables.tf) in output directory.
 */
export function generateTerraformAssets(
  outputPath: string,
  terraformConfig?: TerraformConfig,
): void {
  // Generate main.tf
  const mainTfContent = generateMainTf();
  fs.writeFileSync(path.join(outputPath, "main.tf"), mainTfContent, "utf-8");

  // Generate variables.tf
  const variablesTfContent = generateVariablesTf();
  fs.writeFileSync(
    path.join(outputPath, "variables.tf"),
    variablesTfContent,
    "utf-8",
  );

  // Generate env/ directories for dev, uat, prod
  if (terraformConfig?.environments) {
    for (const env of Object.keys(terraformConfig.environments) as (
      | "dev"
      | "prod"
      | "uat"
    )[]) {
      const envConfig = terraformConfig.environments[env];
      if (envConfig) {
        const envPath = path.join(outputPath, "env", env);
        fs.mkdirSync(envPath, { recursive: true });

        // Generate backend.tfvars
        const backendTfvarsContent = generateBackendTfvars(envConfig.backend);
        fs.writeFileSync(
          path.join(envPath, "backend.tfvars"),
          backendTfvarsContent,
          "utf-8",
        );

        // Generate terraform.tfvars
        const terraformTfvarsContent = generateTerraformTfvars(envConfig);
        fs.writeFileSync(
          path.join(envPath, "terraform.tfvars"),
          terraformTfvarsContent,
          "utf-8",
        );
      }
    }
  }
}

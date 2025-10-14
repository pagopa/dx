/**
 * Prompts Registry
 *
 * Central registry of all available prompts. Add new prompts by importing
 * them and adding to the prompts array.
 */

import type { CatalogEntry } from "../types.js";

import { debugProductionIssue } from "./debug-production-issue.js";
import { generateTerraformConfiguration } from "./generate-terraform-configuration.js";
import { optimizeAzureCosts } from "./optimize-azure-costs.js";
import { setupNewMicroservice } from "./setup-new-microservice.js";

/**
 * Array of all available prompts.
 * Add new prompts here after creating their definition files.
 */
export const prompts: CatalogEntry[] = [
  generateTerraformConfiguration,
  setupNewMicroservice,
  debugProductionIssue,
  optimizeAzureCosts,
];

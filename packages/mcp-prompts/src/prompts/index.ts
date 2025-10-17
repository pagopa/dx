/**
 * Prompts Registry
 *
 * Central registry of all available prompts. Add new prompts by importing
 * them and adding to the prompts array.
 */

import type { CatalogEntry } from "../types.js";

import { generateTerraformConfiguration } from "./generate-terraform-configuration.js";
import { resolveSecurityFindings } from "./resolve-security-findings.js";

/**
 * Array of all available prompts.
 * Add new prompts here after creating their definition files.
 */
export const prompts: CatalogEntry[] = [
  generateTerraformConfiguration,
  resolveSecurityFindings,
];

/**
 * Dynamic Prompt Loader
 *
 * This module handles the complex task of dynamically discovering and loading
 * prompt definitions from the filesystem at runtime. It's designed to work
 * in both development (TypeScript) and production (compiled JavaScript) environments.
 *
 * Key challenges solved:
 * 1. ESM module path resolution in different environments
 * 2. Dynamic import of unknown modules with error handling
 * 3. Version injection from package.json
 * 4. Filtering valid prompt objects from module exports
 */

import { readdir, readFile } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogEntry } from "../types.js";

// import { logger } from "../utils/logger.js";

/**
 * Type guard to validate if an object conforms to the CatalogEntry interface.
 * Performs runtime validation of all required properties and their types.
 *
 * @param obj - Object to validate
 * @returns boolean - True if object is a valid CatalogEntry
 */
const isCatalogEntry = (obj: unknown): obj is CatalogEntry => {
  if (!obj || typeof obj !== "object") return false;

  const entry = obj as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.category === "string" &&
    typeof entry.enabled === "boolean" &&
    Array.isArray(entry.tags) &&
    typeof entry.metadata === "object" &&
    entry.metadata !== null &&
    typeof entry.prompt === "object" &&
    entry.prompt !== null
  );
};

// Convert import.meta.url to __dirname equivalent for ESM compatibility
// This is necessary because ESM doesn't provide __dirname by default
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, "../../package.json");

// Cache the version to avoid repeated file system reads
let packageVersion = "unknown"; // Default version if reading fails

/**
 * Reads and caches the package version from package.json.
 * Uses callback-style fs.readFile wrapped in Promise for compatibility.
 *
 * @returns Promise<string> - The package version or "0.0.0" if reading fails
 */
const getPackageVersion = async (): Promise<string> => {
  if (packageVersion === "unknown") {
    try {
      // Wrap callback-style readFile in Promise for async/await usage
      const packageJson = JSON.parse(
        await new Promise<string>((resolve, reject) => {
          readFile(packageJsonPath, "utf8", (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        }),
      );
      packageVersion = packageJson.version;
    } catch (e) {
      // logger.error(e, "Failed to read package.json version");
      packageVersion = "0.0.0";
    }
  }
  return packageVersion;
};

/**
 * Dynamically loads all prompt definitions from the prompts directory.
 *
 * Process:
 * 1. Scans the prompts directory for .ts/.js files
 * 2. Dynamically imports each module using file:// protocol
 * 3. Inspects module exports for objects with 'id' property (prompt definitions)
 * 4. Injects version information into each prompt
 * 5. Returns array of valid CatalogEntry objects
 *
 * Error handling:
 * - Directory read errors: Returns empty array
 * - Module import errors: Logs and skips invalid files
 * - Malformed prompts: Filtered out during object inspection
 *
 * @returns Promise<CatalogEntry[]> - Array of loaded and validated prompt definitions
 */
export const loadPrompts = async (): Promise<CatalogEntry[]> => {
  const prompts: CatalogEntry[] = [];
  const promptsDir = `${__dirname}/prompts/`;
  // logger.debug(`Loading prompts from ${promptsDir}`);
  const version = await getPackageVersion();
  // logger.debug(`Package version: ${version}`);

  return new Promise((resolve) => {
    readdir(promptsDir, async (err, files) => {
      // logger.debug(
      //   `Found ${files.length} files in prompts directory\n\n${files.join("\n")}`,
      // );

      if (err) {
        // logger.error(err, "Error reading prompts directory");
        resolve([]);
        return;
      }

      // Process each TypeScript/JavaScript file in the directory
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          try {
            // Dynamic import using file:// protocol for absolute path resolution
            // This ensures compatibility across different Node.js environments
            const module = await import(`file://${join(promptsDir, file)}`);

            // Inspect all exports from the module
            for (const key in module) {
              // Filter out inherited properties from prototype chain
              if (Object.prototype.hasOwnProperty.call(module, key)) {
                const value = module[key];
                // Validate if export conforms to CatalogEntry interface
                if (isCatalogEntry(value)) {
                  // logger.info(`Loaded prompt: ${value.id}`);
                  // Inject version and add to catalog
                  prompts.push({ ...value, version } as CatalogEntry);
                }
              }
            }
          } catch (e) {
            // Log import failures but continue processing other files
            // This allows the system to be resilient to individual file issues
            // logger.debug(
            //   e,
            //   `Not loading prompt from file ${file} cause it is not a prompt module\n\n${e}`,
            // );
          }
        }
      }

      // logger.debug(`Loaded ${prompts.length} prompts total`);
      resolve(prompts);
    });
  });
};

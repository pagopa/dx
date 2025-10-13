import { readdir, readFile } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogEntry } from "../types.js";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, "../../package.json");

let packageVersion: string = "unknown"; // Default version if reading fails

const getPackageVersion = async (): Promise<string> => {
  if (packageVersion === "unknown") {
    try {
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
      logger.error(e, "Failed to read package.json version");
      packageVersion = "0.0.0";
    }
  }
  return packageVersion;
};

export const loadPrompts = async (): Promise<CatalogEntry[]> => {
  const prompts: CatalogEntry[] = [];
  const promptsDir = `${__dirname}/prompts/`;
  logger.debug(`Loading prompts from ${promptsDir}`);
  const version = await getPackageVersion();
  logger.debug(`Package version: ${version}`);
  return new Promise((resolve) => {
    readdir(promptsDir, async (err, files) => {
      logger.debug(
        `Found ${files.length} files in prompts directory\n\n${files.join("\n")}`,
      );
      if (err) {
        logger.error(err, "Error reading prompts directory");
        resolve([]);
        return;
      }

      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          try {
            const module = await import(`file://${join(promptsDir, file)}`);
            for (const key in module) {
              const value = module[key];
              if (value && typeof value === "object" && "id" in value) {
                logger.info(`Loaded prompt: ${value.id}`);
                prompts.push({ ...value, version } as CatalogEntry);
              }
            }
          } catch (e) {
            logger.debug(
              e,
              `Not loading prompt from file ${file} cause it is not a prompt module\n\n${e}`,
            );
          }
        }
      }

      logger.debug(`Loaded ${prompts.length} prompts total`);
      resolve(prompts);
    });
  });
};

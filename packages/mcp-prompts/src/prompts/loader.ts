import { readdir } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogEntry } from "../types.js";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const loadPrompts = async (): Promise<CatalogEntry[]> => {
  const prompts: CatalogEntry[] = [];
  const promptsDir = __dirname;

  return new Promise((resolve) => {
    readdir(promptsDir, async (err, files) => {
      if (err) {
        // resolve([]);
        // return;
        logger.error(err, "Error reading prompts directory");
      }
      logger.info("TEST");
      for (const file of files) {
        // if (
        //   (file.endsWith(".ts") || file.endsWith(".js")) &&
        //   file !== "loader.ts" &&
        //   file !== "loader.js" &&
        //   !file.endsWith(".d.ts") &&
        //   file !== "index.js" &&
        //   file !== "index.ts" &&
        //   file !== "types.js" &&
        //   file !== "types.ts"
        // ) {
        try {
          const module = await import(`./${file}`);
          for (const key in module) {
            const value = module[key];
            if (value && typeof value === "object" && "id" in value) {
              logger.info(`Loaded prompt: ${value.id}`);
              prompts.push(value as CatalogEntry);
            }
          }
        } catch (e) {
          logger.error(e, `Error loading prompt from file ${file}`);
        }
        // }
      }

      resolve(prompts);
    });
  });
};

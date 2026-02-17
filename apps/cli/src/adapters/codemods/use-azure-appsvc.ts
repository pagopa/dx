import { getLogger, Logger } from "@logtape/logtape";
import { replaceInFile } from "replace-in-file";
import YAML from "yaml";

import { Codemod } from "../../domain/codemod.js";
import { getLatestCommitShaOrRef } from "./git.js";
import { isChildOf } from "./yaml.js";

export const migrateWorkflow =
  (sha: string) => (workflow: string, filename: string) => {
    const logger: Logger = getLogger(["dx-cli", "codemod"]);
    logger.debug("Processing {filename} file", { filename });
    const document = YAML.parseDocument(workflow);
    let updated = false;
    /**
     * Visit the YAML AST to find and update specific keys
     * - Visit the tree until we find job with "uses" containing "web_app_deploy" or "function_app_deploy"
     * - Add "disable_auto_staging_deploy: true" under "with"
     * - Rename "function_app_name" to "web_app_name"
     * - Remove "use_staging_slot"
     * - Update "uses" to point to "pagopa/dx/.github/workflows/release-azure-appsvc.yaml@LATEST_SHA"
     */
    YAML.visit(document, {
      Map(_, map, path) {
        if (isChildOf(path, "jobs") || isChildOf(path, "with")) {
          return undefined;
        }
        if (map.has("jobs")) {
          return undefined;
        }
        if (map.has("uses")) {
          const uses = map.get("uses");
          if (
            typeof uses === "string" &&
            uses.match(
              /^pagopa\/dx\/.github\/workflows\/(web|function)_app_deploy/,
            )
          ) {
            logger.debug("Adding disable_auto_staging_deploy");
            map.addIn(["with", "disable_auto_staging_deploy"], true);
            map.set("permissions", {
              attestations: "write",
              contents: "read",
              "id-token": "write",
            });
            updated = true;
            return undefined;
          }
        }
        return YAML.visit.SKIP;
      },
      Pair(_, pair) {
        if (YAML.isScalar(pair.key)) {
          if (pair.key.value === "function_app_name") {
            updated = true;
            logger.debug("Updating function_app_name to web_app_name");
            return new YAML.Pair("web_app_name", pair.value);
          }
          if (pair.key.value === "use_staging_slot") {
            updated = true;
            logger.debug("Removing use_staging_slot");
            return YAML.visit.REMOVE;
          }
          if (pair.key.value === "uses") {
            updated = true;
            logger.debug("Updating uses value");
            return new YAML.Pair(
              "uses",
              `pagopa/dx/.github/workflows/release-azure-appsvc-v1.yaml@${sha}`,
            );
          }
        }
      },
    });
    if (updated) {
      logger.info("Workflow {filename} updated", {
        filename,
      });
      return YAML.stringify(document);
    }
    logger.debug("No changes applied to {filename}", { filename });
    return workflow;
  };

export const useAzureAppsvc: Codemod = {
  apply: async () => {
    const sha = await getLatestCommitShaOrRef("pagopa", "dx");
    await replaceInFile({
      allowEmptyPaths: true,
      files: [".github/workflows/*.yaml"],
      processor: migrateWorkflow(sha),
    });
  },
  description: "Refactor legacy deploy workflows to use release-azure-appsvc",
  id: "use-azure-appsvc",
};

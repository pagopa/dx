import { getLogger } from "@logtape/logtape";
import { replaceInFile } from "replace-in-file";
import * as YAML from "yaml";

import { Codemod } from "../../domain/codemod.js";
import { getLatestCommitSha } from "./git.js";
import { isChildOf } from "./yaml.js";

export const updateJSCodeReviewJob =
  (sha: string) => (workflow: string, filename: string) => {
    const logger = getLogger(["dx-cli", "codemod"]);
    const document = YAML.parseDocument(workflow);

    let updated = false;

    YAML.visit(document, {
      Map(_, map, path) {
        if (map.has("jobs") || isChildOf(path, "jobs")) {
          return undefined;
        }
        if (map.has("uses")) {
          const uses = map.get("uses");
          if (
            typeof uses === "string" &&
            uses.startsWith("pagopa/dx/.github/workflows/js_code_review.yaml@")
          ) {
            map.set("secrets", "inherit");
            map.set("permissions", {
              contents: "read",
              "pull-requests": "write",
            });
            map.set(
              "uses",
              `pagopa/dx/.github/workflows/js_code_review.yaml@${sha}`,
            );
            updated = true;
          }
        }
        return YAML.visit.SKIP;
      },
    });

    if (updated) {
      logger.info("Workflow {filename} updated", {
        filename,
      });
      return YAML.stringify(document);
    }

    return workflow;
  };

export const updateCodeReview: Codemod = {
  apply: async () => {
    const logger = getLogger(["dx-cli", "codemod"]);
    const owner = "pagopa";
    const repo = "dx";
    return getLatestCommitSha(owner, repo)
      .then(async (sha) => {
        await replaceInFile({
          allowEmptyPaths: true,
          files: [".github/workflows/*.yaml"],
          processor: updateJSCodeReviewJob(sha),
        });
      })
      .catch(() => {
        logger.error(
          "Failed to fetch the latest commit sha from {repository}",
          {
            repository: `${owner}/${repo}`,
          },
        );
      });
  },
  description: "Update js_code_review workflow to its latest version",
  id: "update-code-review",
};

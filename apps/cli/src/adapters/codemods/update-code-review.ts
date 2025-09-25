import { getLogger } from "@logtape/logtape";
import { replaceInFile } from "replace-in-file";

import { Codemod } from "../../domain/codemod.js";
import { getLatestCommitSha } from "./git.js";

export const updateJSCodeReview = async (sha: string): Promise<string[]> => {
  const results = await replaceInFile({
    allowEmptyPaths: true,
    files: [".github/workflows/*.yaml"],
    from: [/pagopa\/dx\/.github\/workflows\/js_code_review.yaml@(\S+)/g],
    to: [`pagopa/dx/.github/workflows/js_code_review.yaml@${sha}`],
  });
  return results.filter((r) => r.hasChanged).map((r) => r.file);
};

export const updateCodeReview: Codemod = {
  apply: async () => {
    const logger = getLogger(["dx-cli", "codemod"]);
    const owner = "pagopa";
    const repo = "dx";
    return getLatestCommitSha(owner, repo)
      .then(async (sha) => {
        const updatedFiles = await updateJSCodeReview(sha);
        updatedFiles.forEach((file) => {
          logger.info("Updated js_code_review workflow in {file}", { file });
        });
      })
      .catch(() => {
        logger.error(
          "Failed to fetch the latest commit sha from {owner}/{repo}",
          {
            owner,
            repo,
          },
        );
      });
  },
  description: "Update js_code_review workflow to its latest version",
  id: "update-code-review",
};

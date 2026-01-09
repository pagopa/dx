import { type NodePlopAPI } from "node-plop";
import { type Octokit } from "octokit";
import { z } from "zod";

import { fetchLatestSemver } from "../../../actions/semver.js";
import { fetchLatestRelease, fetchLatestTag } from "../../octokit/index.js";

const configSchema = z.object({
  dependencies: z.array(
    z.object({
      name: z.string().min(1),
      repository: z.object({
        name: z.string().min(1),
        owner: z.string().min(1),
      }),
      source: z.enum(["tag", "release"]),
    }),
  ),
});

export default function (plop: NodePlopAPI, octokit: Octokit) {
  plop.setActionType("fetchTerraformVersions", async (data, config) => {
    const { dependencies } = configSchema.parse(config);
    data.terraform ??= {};
    data.terraform.versions ??= {};
    for (const dependency of dependencies) {
      await fetchLatestSemver(
        () => {
          const fetchVersion =
            dependency.source === "tag" ? fetchLatestTag : fetchLatestRelease;
          return fetchVersion({
            client: octokit,
            owner: dependency.repository.owner,
            repo: dependency.repository.name,
          });
        },
        data.terraform.versions,
        dependency.name,
        ({ major, minor }) => `${major}.${minor}`,
      );
    }
    return "Terraform Versions Fetched";
  });
}

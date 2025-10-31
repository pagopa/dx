import type { ActionType } from "plop";

import { ResultAsync } from "neverthrow";
import * as assert from "node:assert/strict";
import { SemVer } from "semver";
import semverParse from "semver/functions/parse.js";
import { z } from "zod/v4";

import { fetchLatestSemver, FetchSemverFn } from "./semver.js";

const nodeReleaseSchema = z.object({
  lts: z.union([z.string(), z.boolean()]).nullable(),
  version: z.string(),
});

type NodeRelease = z.infer<typeof nodeReleaseSchema>;

async function getLatestByCodename(codename: "Jod"): Promise<SemVer> {
  const releases = await nodeReleases();
  for (const release of releases) {
    if (release.lts === codename) {
      // throws if the version is invalid
      return semverParse(release.version, {}, true);
    }
  }
  throw new Error(`No LTS release found for codename: ${codename}`);
}

async function nodeReleases(): Promise<NodeRelease[]> {
  try {
    const response = await fetch("https://nodejs.org/dist/index.json");
    assert.ok(
      response.ok,
      `Failed to fetch Node.js releases: ${response.statusText}`,
    );
    const json = await response.json();
    return z.array(nodeReleaseSchema).parse(json);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error("Invalid data format for Node.js releases", {
        cause: err,
      });
    }
    throw err;
  }
}

const fetchNodeVersion: FetchSemverFn = () =>
  ResultAsync.fromPromise(
    // Jod is the codename for Node.js 22 LTS
    getLatestByCodename("Jod"),
    (e) => new Error("Failed to fetch Node.js releases", { cause: e }),
  );

export const getLatestNodeVersion = (): ActionType => async (answers) =>
  fetchLatestSemver(fetchNodeVersion, answers, "nodeVersion");

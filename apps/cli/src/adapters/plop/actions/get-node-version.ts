import { ResultAsync } from "neverthrow";
import { type NodePlopAPI } from "node-plop";

import { getLatestByCodename } from "../../node/release.js";
import { fetchLatestSemver, FetchSemverFn } from "./semver.js";

const fetchNodeVersion: FetchSemverFn = () =>
  ResultAsync.fromPromise(
    // Krypton is the codename for Node.js 24 LTS
    getLatestByCodename("Krypton"),
    (e) => new Error("Failed to fetch Node.js releases", { cause: e }),
  );

export default function (plop: NodePlopAPI) {
  plop.setActionType("getNodeVersion", async (data) =>
    fetchLatestSemver(fetchNodeVersion, data, "nodeVersion"),
  );
}

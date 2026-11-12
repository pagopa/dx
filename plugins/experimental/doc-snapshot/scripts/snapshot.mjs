// Standalone deterministic MCP client: OAuth is delegated to mcp-remote, never the LLM.
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { withAtlassian } from "./mcp-client.mjs";
import { captureSnapshot, existingSnapshot } from "./snapshot-core.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean" },
    site: { type: "string", default: "https://pagopa.atlassian.net" },
    handoff: { type: "string", default: "initial" },
    root: { type: "string", default: process.env.PADEF_SNAPSHOT_ROOT ?? join(homedir(), ".cache", "pagopa-padef", "snapshots") },
    "repo-root": { type: "string", default: process.cwd() },
  },
});
if (values.help) {
  console.log("Usage: node scripts/snapshot.mjs TICKET [--site URL] [--handoff ID] [--root DIR] [--repo-root DIR]\nDefault root: PADEF_SNAPSHOT_ROOT or ~/.cache/pagopa-padef/snapshots.\nReuse a handoff without network access; choose a NEW handoff ID and a NEW session for new requirements.\nFirst network use requires an independent Atlassian OAuth browser sign-in.");
} else {
  try {
    if (positionals.length !== 1) throw new Error("Supply exactly one Jira ticket key; see --help");
    const options = {
      site: new URL(values.site).origin, ticket: positionals[0],
      handoff: values.handoff, root: values.root, repoRoot: values["repo-root"],
    };
    const existing = await existingSnapshot(options);
    if (existing) {
      console.log(existing);
    } else {
      process.umask(0o077);
      console.log(await withAtlassian((call) => captureSnapshot(options, call)));
    }
  } catch (error) {
    console.error(`snapshot: ${error.message}`);
    process.exitCode = 1;
  }
}

# Experimental deterministic document snapshots

Historical snapshot MVP, preserved independently of the active [PADEF plugin](../../padef).
This is not the production `/implement` workflow or a session-wide enforcement
mechanism. Load it explicitly, without another plugin providing `/implement`.

The Node client captures Jira and its discovered sources without an LLM writing
source files. It stores the Jira body and remote links, Confluence HTML/JSON and
derived GFM Markdown, and byte-identical local Markdown. A manifest records
site/ticket/handoff identity, page versions, timestamps, and SHA-256 digests.
Capture uses an exclusive lock, staging, atomic publication, and read-only files
and directories. Reuse verifies identity, artifact hashes, and file permissions
before connecting to MCP; failures do not trigger a live refresh.

## Run

Use the repository's Node version (`.node-version`), npm, Copilot CLI with
Agent Plugins 1.0 support, and access to the target Atlassian site. This standalone
experiment retains its original npm lockfile and is outside the pnpm workspace;
it is not registered in the plugin marketplace or Nx release configuration.

From the repository root:

```sh
P="$PWD/plugins/experimental/doc-snapshot"
npm --prefix "$P" ci --ignore-scripts --no-audit --no-fund
node "$P/scripts/snapshot.mjs" EXAMPLE-1 --handoff handoff-1 --repo-root "$PWD"
copilot --plugin-dir "$P"
```

Replace `EXAMPLE-1` with the ticket key. Only start the session after capture
succeeds. In the CLI, invoke `/implement EXAMPLE-1 handoff-1`. The portable
[skill](skills/implement/SKILL.md) also invokes the script, reads the frozen
inputs, and preserves existing readiness and human handoff gates. It does not
transition Jira issues or authorize implementation.

```sh
node "$P/scripts/snapshot.mjs" --help
```

| Input | Default | Meaning |
| --- | --- | --- |
| `TICKET` | Required | One Jira ticket key |
| `--handoff ID` | `initial` | Immutable handoff identity |
| `--site URL` | `https://pagopa.atlassian.net` | HTTPS Atlassian site |
| `--repo-root DIR` | Current directory | Root for local Markdown sources |
| `--root DIR` | `PADEF_SNAPSHOT_ROOT` or `~/.cache/pagopa-padef/snapshots` | Snapshot cache |

The command prints the verified bundle directory on success and exits nonzero
on failure. Use a **new handoff ID and new session** for changed requirements;
there is no refresh operation. Keep the cache outside Git. Never commit or share
captured Jira/Confluence documents, OAuth credentials, or session logs.

First live capture uses the SDK-backed MCP client and `mcp-remote` to open its own
Atlassian OAuth login. It does not extract app/CLI credentials. The credential
cache is `~/.mcp-auth` (override: `MCP_REMOTE_CONFIG_DIR`), separate from snapshots.
The endpoint's default consent includes broad write scopes even though this
client calls only read operations; narrower scope compatibility is unverified.

## Source discovery and limitations

The preserved legacy parser discovers same-site Confluence URLs in Jira remote
links and description prose, plus backtick-delimited local `.md` paths on
`Source document:` / `Source documents:` lines. It rejects empty source sets,
local path escapes, unsupported Confluence URLs, and recognized dynamic macro
wrappers. Capture is deterministic code, not a byte-reproducible live response:
timestamps and upstream versions can differ between handoffs.

The current Jira authoring convention is a visible `## Source` list with document
bullets in fixed key order (`prd`, `dr`, `uc`, then the remaining catalog).
This MVP does **not** implement or validate that full contract. It does not use
Jira issue properties; broad description-link discovery is only legacy behavior,
not an exhaustive source inventory.

Confluence Markdown is a derived view of the captured MCP HTML/JSON, not an export
of underlying ADF/storage. Attachments, external embeds, comments, transitive
sources, and cross-page transactional consistency are unsupported. Macro
detection is conservative, not a completeness guarantee.

Read-only modes and digests protect against accidents, not deliberate changes by
the same OS user. No pre-launch wrapper, session-to-manifest binding,
manifest-aware deny hook, or MCP proxy is included. Skill instructions cannot
guarantee capture or consumption of every source. Search can bypass hooks that
block only direct fetches; do not claim strict session-wide enforcement.

## Existing checks

The recovered nine offline tests use synthetic fixtures and cover capture,
reuse, integrity failures, handoff isolation, atomic failure/retry, empty and
macro-dependent sources, byte preservation, traversal, and discovery.
Run only with the user's permission:

```sh
npm --prefix "$P" test
```

The original investigation reported successful local-document and Confluence
capture, offline reuse, and historical-version retrieval. No captured bundles,
downloaded documents, OAuth caches, or investigation logs are included here.

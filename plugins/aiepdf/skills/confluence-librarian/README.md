# confluence-librarian: running the Harbor benchmark

This skill publishes and updates **real Confluence pages**. Its `evals/`
benchmark is driven by [harbor-bench](../../../../apps/harbor-bench/README.md),
which converts `evals/evals.json` into Harbor tasks, runs a Copilot CLI agent on
them, and grades each trial with RewardKit.

The agent inside the benchmark container talks to Confluence through the
**Atlassian remote MCP server** (`mcp.atlassian.com/v2/mcp`). That server is
authenticated with **OAuth only** — there is no static token — and the evals
write **only** inside the DevEx Playground folder
`…/spaces/DevEx/folder/3314123072`: the `safe-update` case copies the seed page
`…/spaces/DevEx/pages/3313926515` into that folder and updates the copy, while
every other case creates its page directly under the folder. The seed page
itself is read-only. Run them deliberately.

## 1. Obtain the Atlassian OAuth credential (one time)

An Atlassian **API token (Basic `email:token`)** authenticates the *Confluence
REST API*, but **not** the Atlassian MCP server: MCP tool calls then fail with
`HTTP 403 missing scope claim / Current user not permitted to use Confluence`.
For the MCP you need an OAuth session for your Atlassian user.

Get it once with `mcp-remote` into a **dedicated store** (a browser on the
host is needed, Node ≥ 20). Using its own directory keeps the benchmark archive
scoped to the Atlassian session instead of shipping every server's tokens that
may already live in `~/.mcp-auth`:

```sh
export MCP_REMOTE_CONFIG_DIR="$HOME/.mcp-auth-atlassian"
npx -y -p mcp-remote@0.8.4 mcp-remote-client https://mcp.atlassian.com/v2/mcp
```

Approve the Atlassian consent screen (it requests the
`read/write:confluence:agent-interface` scopes). On success mcp-remote stores
the refresh + access tokens under `~/.mcp-auth-atlassian/`
(`mcp-remote-v1/…_tokens.json`) and refreshes them automatically afterwards.

The version is pinned (here and in `harbor/environment/prepare.sh`) so
identical benchmark commits build the same task image and use the same OAuth
client; bump both together when you upgrade.

## 2. Requirements

- The PagoPA DX repo, with `uv` available.
- Docker (or Apple's `container` CLI — pass `--environment apple-container` to
  `convert`).
- `gh` authenticated, for `COPILOT_GITHUB_TOKEN`.
- The OAuth store from step 1 (`~/.mcp-auth-atlassian`).

The generated task environment image is prepared by this skill's
[`harbor/environment/prepare.sh`](harbor/environment/prepare.sh) — it bakes
Node 22 LTS (pinned release, digest-verified) and `mcp-remote` into the image,
so the agent container needs nothing at run time.

## 3. Convert the evals to Harbor tasks

```sh
cd <repo-root>
uv run --project apps/harbor-bench --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor --config-out .harbor/config.yaml
```

This generates one task per eval case (the `.harbor/` directory is gitignored).
The skill customizes those tasks through its `harbor/` overlay:
[`harbor/environment/prepare.sh`](harbor/environment/prepare.sh) is added to
every task's environment (the generated Dockerfile runs it at image build time,
before the git baseline), and each per-task
`harbor/<generated-task-dir>/task.toml` carries the Atlassian MCP server + env
wiring in its `[environment]` table.

## 4. Run the eval tasks

Export the credentials on the host, then run **only** the confluence tasks
(they mutate real Confluence and share the Playground, so keep concurrency at 1):

```sh
cd <repo-root>
export COPILOT_GITHUB_TOKEN="$(gh auth token)"
export MCP_AUTH_B64="$(tar -C "$HOME" -czf - .mcp-auth-atlassian | base64 | tr -d '\n')"
```

Create a run config that filters to this skill's tasks and keeps concurrency at
1 — for example by editing `.harbor/config.yaml`:

```yaml
n_concurrent_trials: 1
datasets:
  - path: /path/to/.harbor/tasks
    task_names:
      - confluence-librarian-*
```

Then:

```sh
uv run --project apps/harbor-bench --package harbor-bench harbor run \
  -c /path/to/config.yaml -y --ae COPILOT_GITHUB_TOKEN="$COPILOT_GITHUB_TOKEN" \
  --jobs-dir runs --job-name confluence-baseline
```

Notes:

- `-y` auto-confirms host env passthrough (needed for CI too).
- `COPILOT_GITHUB_TOKEN` (exported above) authenticates the Copilot agent and
  the LLM judge; pass it with `--ae`, the same way `harbor-bench` documents
  manual runs.
- `MCP_AUTH_B64` must be exported in the host environment: Harbor resolves the
  `[environment].env` template `${MCP_AUTH_B64}` at run time and injects it at
  **container level** (agent `--ae` env does not reach the MCP server process).
- The archive holds only the dedicated Atlassian store from step 1 — not every
  session in `~/.mcp-auth`. Each container rebuilds that store from the env
  var into an ephemeral temp dir that only the MCP process owns and that
  disappears with the container — nothing is written to the repo, the task
  config, or the host (the archive only ever exists as an env var). Harbor
  task config exposes no sidecar/secret-mount channel for a stdio MCP server,
  so the container-level env var is the one supported way to reach the MCP
  process; the dedicated-store + ephemeral-temp-dir scoping keeps that surface
  minimal.
- `--job-name` must change whenever the config/task changes (Harbor refuses to
  resume a job dir with a different config). Results land in `runs/<name>/`.

## 5. Report / compare

```sh
uv run --project apps/harbor-bench --package harbor-bench harbor-bench report \
  runs/skill-a runs/skill-b --format html --report comparison.html
```

or use `harbor-bench compare` for a base/head skill delta. See the
[harbor-bench README](../../../../apps/harbor-bench/README.md) and
[advanced usage](../../../../apps/harbor-bench/docs/advanced-usage.md).

## Troubleshooting

- **`HTTP 403 missing scope claim` / `Current user not permitted to use
  Confluence`** — the session is authenticated with an API token (Basic), not
  OAuth. Re-run step 1 and export `MCP_AUTH_B64` from
  `~/.mcp-auth-atlassian`.
- **MCP server `failed to initialize` with
  `MCP_AUTH_B64 … is required`** — the env var did not reach the container.
  Export it on the host (see step 4); the template lives in
  each per-task `harbor/<generated-task-dir>/task.toml` `[environment].env`.
- **MCP server exits before the initialize handshake with a Node stack trace** —
  `mcp-remote` needs Node ≥ 20.18; the image installs Node 22 via
  `harbor/environment/prepare.sh`. Rebuild the task image (or delete cached
  images).
- **`Job directory … cannot be resumed with a different config`** — use a new
  `--job-name`.
- **`reward 0` on a task that created the page** — RewardKit is an LLM judge;
  read `runs/<name>/<trial>/verifier/reward-details.json` for the per-criterion
  reasoning (some criteria are about process order / parity verification, not
  the transport).

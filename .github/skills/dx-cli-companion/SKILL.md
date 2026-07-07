---
name: dx-cli-companion
description: 'Guide the use of the DX CLI for bootstrap tasks. Use when the user wants to inspect the CLI contract with `spec`, create a repository with `init`, or create an environment with `add environment`. Default to the published npm package `@pagopa/dx-cli`, show the exact parameters before execution, ask for missing inputs upfront, and avoid separate prerequisite checks unless the user explicitly asks to run the local compiled JS entrypoint.'
---

# DX CLI Companion

Use this skill when the user wants guided execution of the DX CLI, especially for `init` and `add environment`.

## When to Use This Skill

- Guide a user through DX CLI usage.
- Inspect the command contract with `spec`.
- Initialize a new repository with `init`.
- Add a deployment environment with `add environment`.
- Turn an interactive DX CLI flow into a non-interactive command sequence.

## Default Workflow

1. Start by running the CLI spec with the correct launcher. Use the published npm package by default:

   ```bash
   CI=1 npx -y @pagopa/dx-cli spec
   ```

   If the user explicitly asks for the local compiled JS entrypoint, replace that command with `CI=1 node apps/cli/bin/index.js spec`.

2. Read the `init` or `add environment` section from the current spec output and treat it as the source of truth for flags, prompts, and accepted choices.

3. Ask the user upfront for every missing value needed to finish the command without interactive discovery.

4. If `add environment` is missing a subscription ID, you may try to read the current Azure subscription from Azure CLI, show the user both the subscription ID and subscription name, and ask the user to confirm them. If that lookup fails, keep going and let the DX CLI surface the runtime issue.

5. Before execution, show the user the exact parameter set that will be used for the command.

6. Execute the target command directly with `CI=1`.

7. Rely on the DX CLI to report missing auth, toolchain, or environment issues. Do not do separate preflight commands such as `gh auth status`, `terraform -version`, `corepack -v`, or `az login`.

8. If the CLI still stops on a prompt, treat that as a missing input contract: ask the user for the missing value and rerun.

## Command Location

- Run `init` from the directory where the new repository should be created.
- Run `add environment` from inside the generated repository so the CLI can detect the target GitHub repository from the current working tree.
- If the user explicitly wants the local JS entrypoint, run it from the DX repository root or use an absolute path to `apps/cli/bin/index.js`.

## Node Runtime Consistency

- Ensure the Node.js version specified in the .node-version file is installed.
- Always use this version when running the DX CLI instead of relying on the system default.

## Preparing `init`

- Use the current `spec` output as the source of truth for the `init` command contract.
- Collect every missing value before running the command. In practice, expect to ask for the GitHub owner, repository name, description choice, and publish choice.
- Before execution, show a short preview with the exact resolved values for owner, repository name, description, and whether the repository will be published immediately.

### `init` Command Templates

Use `--publish` when the user wants immediate GitHub publication. That avoids the publish confirmation prompt.

Non-empty description, publish now:

```bash
CI=1 npx -y @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name> \
  --description "<description>" \
  --publish
```

Intentionally empty description, publish now:

```bash
printf '\n' | CI=1 npx -y @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name> \
  --publish
```

Non-empty description, do not publish:

```bash
printf 'n\n' | CI=1 npx -y @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name> \
  --description "<description>"
```

Intentionally empty description, do not publish:

```bash
printf '\nn\n' | CI=1 npx -y @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name>
```

### `init` Notes

- Run `spec` first even if the command shape seems obvious.
- `--description ""` does not suppress the description prompt; treat an empty description as a deliberate blank-line answer on stdin.
- There is no `--no-publish` flag. If the user does not want publication, answer the publish prompt explicitly on stdin instead of guessing.
- If the user explicitly wants the local JS entrypoint, replace `npx -y @pagopa/dx-cli` with `node apps/cli/bin/index.js`.

## Preparing `add environment`

- Use the current `spec` output as the source of truth for the `add environment` command contract.
- Collect every value needed to avoid follow-up prompts. In practice, expect to ask for the environment name, subscription or account IDs, location mappings, prefix, domain, business unit, management team, auto-confirm choice, and runner app credentials when environment initialization still needs them.
- Before execution, show a short preview with the exact resolved values for the current run, including subscription and location pairs plus runner app values when they are in scope.
- For a first-time environment setup, ask for the four GitHub Runner App values (`runner-app-id`, `client-id`, `installation-id`, `private-key-path`) before the first `add environment` execution unless the user explicitly confirms runner setup is already initialized and those values are not needed.

### Missing Subscription ID Flow

If the user did not provide a subscription ID:

1. Try to read it from the current Azure CLI session:

   ```bash
   az account show --query '{id:id,name:name}' -o json
   ```

2. If that command returns a value, show the user both the subscription ID and subscription name, then ask whether that subscription should be used.

3. If Azure CLI is not logged in, not configured, or the command returns no value, do not stop to troubleshoot the session. Continue with the DX CLI workflow and let the CLI report the runtime issue or prompt for the missing input.

This is the only allowed proactive Azure CLI lookup in this skill. Do not expand it into general prerequisite checks.

### `add environment` Command Template

Run this command from inside the generated repository:

```bash
cd /path/to/generated-repo
CI=1 npx -y @pagopa/dx-cli add environment \
  --account <subscription-id> \
  --name <dev|uat|prod> \
  --prefix <prefix> \
  --domain <domain> \
  --location <subscription-id>=<region> \
  --business-unit <business-unit> \
  --management-team <management-team> \
  -y
```

If the initialization path requires GitHub Runner App credentials, extend the command with:

```bash
  --runner-app-id <runner-app-id> \
  --client-id <client-id> \
  --installation-id <installation-id> \
  --private-key-path <private-key-path>
```

### `add environment` Notes

- `spec` is the first source of truth for the command name, flags, and choices.
- In practice, missing `--business-unit` or `--management-team` causes the command to stop for input, so collect them before execution.
- The spec output lists the Runner App flags as required because they are declared with value placeholders, but the runtime only needs them when the initialization flow reaches GitHub Runner App setup. Ask for them upfront when the goal is a fully non-interactive initialization of an environment that still needs setup.
- Do not defer Runner App value collection to runtime prompts when performing first-time setup: collect them upfront unless the user explicitly confirms runner setup is already completed for the target environment.
- Repeat `--account` and `--location` for multi-subscription environments.
- If a subscription was inferred from Azure CLI, show both its ID and name to the user and ask for confirmation before using it.
- The current CLI spec does not expose a separate cost center flag. If the user provides a cost center requirement, surface that mismatch and ask how it should be mapped instead of inventing an unsupported flag.
- If the user explicitly wants the local JS entrypoint, replace `npx -y @pagopa/dx-cli` with `node /absolute/path/to/apps/cli/bin/index.js`.

## Troubleshooting

| Symptom | Meaning | Action |
| --- | --- | --- |
| `? Description` appears during `init` | The description was not prefilled, or it is intentionally empty | Ask for the description choice upfront; for an empty description, pipe a blank line on stdin. |
| Publish confirmation appears during `init` | The publish choice was not encoded in the command | Ask whether to publish now; use `--publish` for yes, or answer `n` on stdin for no. |
| `? Business unit` appears during `add environment` | `--business-unit` is missing | Ask for the value and rerun with the flag. |
| `? Management team` appears during `add environment` | `--management-team` is missing | Ask for the value and rerun with the flag. |
| Runner App credential prompts appear | The environment needs initialization credentials | Ask for the four Runner App values and rerun with the related flags. |

## Practical Rules

- Default to the published npm package `@pagopa/dx-cli`.
- Only use the local compiled JS entrypoint when the user explicitly asks for it.
- Always run `spec` first with the chosen launcher.
- Always treat the current `spec` output as the source of truth for flags, prompts, and accepted choices.
- Always gather missing command inputs before the mutating command.
- Always show the final parameter set before running the command.
- Always execute the CLI directly; do not front-load separate prerequisite probes.
- If the subscription ID is missing, optionally try `az account show --query '{id:id,name:name}' -o json`, confirm both values with the user, and otherwise continue without turning that lookup into a prerequisite gate.
- For first-time `add environment`, always ask runner-app-id/client-id/installation-id/private-key-path before execution unless the user explicitly confirms runner setup is already completed.
- In generated repositories, run mutating DX CLI commands with `NODENV_VERSION=$(cat .node-version)` (and install the pinned version if missing) to prevent runtime feature mismatches.
- Stop on unexpected prompts and convert them into explicit user questions for the next run.

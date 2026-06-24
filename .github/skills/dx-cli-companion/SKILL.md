---
name: dx-cli-companion
description: 'Guide the use of the DX CLI for bootstrap tasks. Use when the user wants to inspect the CLI contract with `spec`, create a repository with `init`, or create an environment with `add environment`. Default to the published npm package `@pagopa/dx-cli`, show the exact parameters before execution, ask for missing inputs upfront, and avoid separate prerequisite checks unless the user explicitly asks to run the local compiled JS entrypoint.'
license: Complete terms in LICENSE.txt
---

# DX CLI Companion

Use this skill when the user wants guided execution of the DX CLI, especially for `init` and `add environment`.

## When to Use This Skill

- Guide a user through DX CLI usage.
- Inspect the command contract with `spec`.
- Initialize a new repository with `init`.
- Add a deployment environment with `add environment`.
- Turn an interactive DX CLI flow into a non-interactive command sequence.

## CLI Source Selection

- **Default:** run the published npm package from the registry:

  ```bash
  CI=1 npx @pagopa/dx-cli <command>
  ```

- **Only when explicitly requested by the user:** run the local compiled JS entrypoint:

  ```bash
  CI=1 node apps/cli/bin/index.js <command>
  ```

Do not choose the local JS entrypoint on your own. Default to `@pagopa/dx-cli`.

## Default Workflow

1. Start by running the CLI spec with the selected launcher.

   Published package:

   ```bash
   CI=1 npx @pagopa/dx-cli spec
   ```

   Local JS entrypoint, only if explicitly requested:

   ```bash
   CI=1 node apps/cli/bin/index.js spec
   ```

2. Read the `init` or `add environment` section from the spec before building the command.

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

## Inputs to Gather Before `init`

Collect these values before running `init`:

| Input | Required for non-interactive run | Notes |
| --- | --- | --- |
| GitHub owner | Yes | Maps to `--owner`. |
| Repository name | Yes | Maps to `--name`. |
| Description choice | Yes | Ask whether the description is non-empty or intentionally blank. |
| Publish choice | Yes | Ask whether the repository should be published immediately. |

### `init` Parameter Preview

Before running the command, show the user the exact values that will be used:

| Parameter | Value to show |
| --- | --- |
| Owner | `<owner>` |
| Repository name | `<repo-name>` |
| Description | `<description>` or `empty` |
| Publish now | `yes` or `no` |

### `init` Command Templates

Use `--publish` when the user wants immediate GitHub publication. That avoids the publish confirmation prompt.

Non-empty description, publish now:

```bash
CI=1 npx @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name> \
  --description "<description>" \
  --publish
```

Intentionally empty description, publish now:

```bash
printf '\n' | CI=1 npx @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name> \
  --publish
```

Non-empty description, do not publish:

```bash
printf 'n\n' | CI=1 npx @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name> \
  --description "<description>"
```

Intentionally empty description, do not publish:

```bash
printf '\nn\n' | CI=1 npx @pagopa/dx-cli init \
  --owner <owner> \
  --name <repo-name>
```

### `init` Notes

- Run `spec` first even if the command shape seems obvious.
- `--description ""` does not suppress the description prompt; treat an empty description as a deliberate blank-line answer on stdin.
- There is no `--no-publish` flag. If the user does not want publication, answer the publish prompt explicitly on stdin instead of guessing.
- If the user explicitly wants the local JS entrypoint, replace `npx @pagopa/dx-cli` with `node apps/cli/bin/index.js`.

## Inputs to Gather Before `add environment`

Collect these values before running `add environment`:

| Input | Required for non-interactive run | Notes |
| --- | --- | --- |
| Environment name | Yes | `dev`, `uat`, or `prod`; maps to `--name`. |
| Subscription/account IDs | Yes | Repeat `--account` for multiple subscriptions. If the user did not provide one, try to read the current default subscription from Azure CLI and ask the user to confirm it. |
| Location for each subscription | Yes | Use `--location <subscription-id>=<region>` once per subscription. |
| Prefix | Yes | Maps to `--prefix`. |
| Domain | Yes | Maps to `--domain`. |
| Business unit | Yes | Pass `--business-unit` to avoid the prompt. |
| Management team | Yes | Pass `--management-team` to avoid the prompt. |
| Auto-confirm initialization | Usually yes | Use `-y` for non-interactive runs unless the user explicitly wants the confirmation prompt. |
| Runner App credentials | Conditional | Ask upfront when the user expects a fully non-interactive initialization path for a not-yet-initialized environment. |

### Missing Subscription ID Flow

If the user did not provide a subscription ID:

1. Try to read it from the current Azure CLI session:

   ```bash
   az account show --query '{id:id,name:name}' -o json
   ```

2. If that command returns a value, show the user both the subscription ID and subscription name, then ask whether that subscription should be used.

3. If Azure CLI is not logged in, not configured, or the command returns no value, do not stop to troubleshoot the session. Continue with the DX CLI workflow and let the CLI report the runtime issue or prompt for the missing input.

This is the only allowed proactive Azure CLI lookup in this skill. Do not expand it into general prerequisite checks.

### `add environment` Parameter Preview

Before running the command, show the user the exact values that will be used:

| Parameter | Value to show |
| --- | --- |
| Environment name | `<dev|uat|prod>` |
| Subscription ID(s) | `<subscription-id>` |
| Location mapping(s) | `<subscription-id>=<region>` |
| Prefix | `<prefix>` |
| Domain | `<domain>` |
| Business unit | `<business-unit>` |
| Management team | `<management-team>` |
| Auto-confirm | `yes` or `no` |
| Runner App ID | `<runner-app-id>` or `not provided` |
| Runner App Client ID | `<client-id>` or `not provided` |
| Runner App Installation ID | `<installation-id>` or `not provided` |
| Runner App private key path | `<private-key-path>` or `not provided` |

### `add environment` Command Template

Run this command from inside the generated repository:

```bash
cd /path/to/generated-repo
CI=1 npx @pagopa/dx-cli add environment \
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
- Repeat `--account` and `--location` for multi-subscription environments.
- If a subscription was inferred from Azure CLI, show both its ID and name to the user and ask for confirmation before using it.
- The current CLI spec does not expose a separate cost center flag. If the user provides a cost center requirement, surface that mismatch and ask how it should be mapped instead of inventing an unsupported flag.
- If the user explicitly wants the local JS entrypoint, replace `npx @pagopa/dx-cli` with `node /absolute/path/to/apps/cli/bin/index.js`.

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
- Always gather missing command inputs before the mutating command.
- Always show the final parameter set before running the command.
- Always execute the CLI directly; do not front-load separate prerequisite probes.
- If the subscription ID is missing, optionally try `az account show --query '{id:id,name:name}' -o json`, confirm both values with the user, and otherwise continue without turning that lookup into a prerequisite gate.
- Stop on unexpected prompts and convert them into explicit user questions for the next run.

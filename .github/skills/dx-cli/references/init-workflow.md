# `dx init` Workflow

This workflow is intentionally limited to `dx init` and must always start from the live `dx spec` output.

## 1. Read the live CLI spec first

Run one of these commands before doing anything else:

```bash
# Inside the pagopa/dx repository
pnpm dx spec

# In an environment where the CLI is already installed
dx spec
```

Filter the JSON to the root `globalOptions` plus the `init` command entry instead of scraping `--help`.

The current live `init` surface includes:

| Scope  | Flag                          | Meaning                                                       |
| ------ | ----------------------------- | ------------------------------------------------------------- |
| global | `-v, --verbose`               | Enable verbose logging and full error chains                  |
| global | `--output <mode>`             | Select `text` or `json` output                                |
| init   | `--name <name>`               | Repository name                                               |
| init   | `--owner <owner>`             | GitHub organization or user that owns the repository          |
| init   | `--description <description>` | Repository description                                        |
| init   | `--publish`                   | Publish the scaffolded repository to GitHub without prompting |

Re-read `dx spec` for every task. Do not trust stale documentation over the live command surface.

## 2. Choose the execution mode

Use the simplest command that matches the user's request:

- Run `dx init` only when the user explicitly wants the interactive experience and the runtime can handle prompts.
- Prefer `dx --output json init ...` when the user has already provided the inputs or when an agent needs structured progress/output.
- Add `--publish` only when the user explicitly wants immediate GitHub publication.
- The current CLI does not expose `--no-publish`, so omitting `--publish` still leads to an interactive confirmation later in the flow.

## 3. Ask only for missing command inputs

When you need more information, ask only for missing `init` inputs:

1. Repository name
2. GitHub owner
3. Repository description
4. Whether to publish immediately

Do **not** ask about Terraform, Corepack, GitHub authentication, Azure authentication, or whether the repository already exists. Those checks belong to the CLI, not to the agent.

If the user does not want immediate publication and the runtime cannot answer interactive prompts, explain that the current CLI surface still prompts for that decision.

## 4. Run the requested command directly

Examples:

```bash
# Interactive
dx init

# Prefilled scaffold (the CLI still prompts for publish confirmation later)
dx --output json init \
  --name my-monorepo \
  --owner pagopa \
  --description "My new PagoPA monorepo"

# Non-interactive scaffold and publish immediately
dx --output json init \
  --name my-monorepo \
  --owner pagopa \
  --description "My new PagoPA monorepo" \
  --publish
```

Inside the `pagopa/dx` source repository, replace `dx` with `pnpm dx`.

## 5. Interpret the result without adding your own preflight logic

When you run `init` with `--output json`:

- progress step events are emitted on stderr
- the final result is emitted on stdout

If the final result contains `gitHubRepoCreationSkipped: true`, the workspace was scaffolded locally and GitHub publication was skipped intentionally.

If the command fails because prerequisites are missing or authentication is not ready, surface the CLI error clearly. Do not insert extra precondition checks before retrying unless the user explicitly asks for diagnosis.

## 6. Respect the current boundary

- Support only `init`
- Always run `dx spec` first
- Never run agent-side precondition checks before invoking the CLI

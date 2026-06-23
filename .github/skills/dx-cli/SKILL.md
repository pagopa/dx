---
name: dx-cli
description: Run the PagoPA DX CLI to inspect the live command surface with `dx spec` and bootstrap new workspaces with `dx init`. Use when the user asks to create a new DX monorepo, scaffold a repository, publish the scaffold to GitHub, or otherwise run the DX CLI. Always start from `dx spec`, support only `init` for now, and do not run separate precondition or tool-availability checks before invoking the CLI.
license: Complete terms in LICENSE.txt
---

# DX CLI Skill

Use this skill when an agent needs to run the PagoPA DX CLI.

## Supported Scope

- Support only `dx init` for now.
- If the user asks for another `dx` subcommand, stop and explain that this skill currently supports `init` only.

## Core Rules

1. Run `dx spec` first and treat its JSON output as the source of truth for commands, flags, and global options.
2. Prefer `pnpm dx ...` inside the `pagopa/dx` repository. Prefer `dx ...` when the CLI is already installed in the target environment.
3. Do not scrape `--help` when `dx spec` is available.
4. Do not run separate precondition checks such as `terraform -version`, `corepack -v`, `gh auth status`, `az account show`, or repository-existence probes. Invoke the requested DX CLI command directly and let the CLI surface any failures.
5. Ask only for the missing inputs needed to run `init`, one question at a time. Do not ask about prerequisites.
6. Prefer explicit flags over interactive prompts. The current CLI has `--publish` but no `--no-publish`, so a fully prompt-free run currently requires the user to want immediate publication.
7. For agent-friendly automation, prefer `--output json`. In JSON mode, `init` emits progress events on stderr and the final result on stdout.

## Workflow

Follow the detailed [init workflow reference](./references/init-workflow.md).

## Quick Commands

```bash
# Inspect the live CLI surface first
pnpm dx spec
dx spec

# Run init interactively
pnpm dx init
dx init

# Run init with all metadata prefilled (the CLI still prompts for publish when --publish is omitted)
pnpm dx --output json init --name <name> --owner <owner> --description "<description>"
dx --output json init --name <name> --owner <owner> --description "<description>"

# Run init fully non-interactively with immediate publish
pnpm dx --output json init --name <name> --owner <owner> --description "<description>" --publish
dx --output json init --name <name> --owner <owner> --description "<description>" --publish
```

## Troubleshooting

| Problem                                                                       | Action                                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dx ...` fails because `apps/cli/dist` is missing in the source checkout | Run `pnpm nx run @pagopa/dx-cli:build`, then rerun the same `pnpm dx ...` command.                                         |
| `dx init` fails because Terraform, Corepack, or auth is missing               | Surface the CLI error as-is. Do not add your own preflight phase on retry unless the user explicitly asks for diagnostics. |
| The user asks for a `dx` command other than `init`                            | Stop and explain that this skill currently supports `init` only.                                                           |

## References

- [Init workflow](./references/init-workflow.md)

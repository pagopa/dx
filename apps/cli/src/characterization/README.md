# DX CLI characterization harness

This folder owns the `record` / `verify` characterization workflow for the two selected command flows:

1. `dx init` with GitHub publish enabled
2. `dx add environment` with initialization, Terraform backend provisioning, and authorization PR creation

## Boundary

The harness exercises the command workflow inside `@pagopa/dx-cli`, not the prompt TTY layer. Prompt answers are injected deterministically, while the meaningful command-side behavior stays real:

- real `terraform`
- real `git`
- real `corepack`
- real `npx`
- real `pnpm`

## Local dependencies

### `dx init`

- in-process GitHub release emulator for template version lookups
- in-process GitHub service emulator for repository existence checks and PR creation
- local filesystem bare git repository created by a real `terraform apply`

The generated `infra/repository` module is rewritten only inside the temporary characterization workspace so `terraform` provisions a local bare repository instead of calling the GitHub provider.

### `dx add environment`

- in-process Azure cloud-account repository emulator
- in-process Azure cloud-account service emulator
- in-process authorization PR emulator
- in-process GitHub service emulator for GitHub environment secrets

`az account show` / `az group list` do not have a credible local backend for this flow. The harness keeps the real `az` binary in the precheck surface through `az --version`, and documents the Azure login check as the one explicit fallback.

## Cassette layout

Each scenario stores:

- `request.json`
- `response.json`
- `side-effects.json`
- `topology.json`
- `normalization.json`

under `src/characterization/cassettes/<scenario>/`.

## Rerun commands

- `pnpm --filter @pagopa/dx-cli run test:characterization:record`
- `pnpm --filter @pagopa/dx-cli run test:characterization:verify`

# AI Agent Guide

How to work in this repository. `README.md` covers setup, folder structure and
the release process; this file carries what the code and the configs do not say
out loud.

## Toolchain

- **mise** owns every tool version: `mise.toml` pins `gh`, `terraform-docs`,
  `tflint` and `trivy`, while node and terraform come from `.node-version` and
  `.terraform-version`.
- **pnpm** workspaces: every folder under `apps/` and `packages/` is one.
  Internal dependencies use `workspace:^`; a version that more than one project
  needs belongs in the `catalog:` section of `pnpm-workspace.yaml`.
- **Nx** infers each project's targets: `@nx/js/typescript`, `@nx/eslint/plugin`
  and `@nx/vitest` for code, `@pagopa/nx-terraform` for `infra/**`,
  `@pagopa/nx-docker` for `Dockerfile` projects. No `package.json` script
  mirrors them, so `pnpm nx show projects` and `pnpm nx <target> --help` are
  the source of truth for what a project can do.
- **oxfmt** is the formatter behind `nx format:*`.

`pnpm install` authenticates a local, git-ignored `.npmrc`; `README.md` has
the command that writes it.

## Commands

```bash
mise install                                     # the pinned toolchain
pnpm nx affected -t build test lint typecheck    # definition of done
pnpm nx run-many -t build test lint typecheck    # every project
pnpm nx format:check                             # formatting, read-only
pnpm nx run-many -t fmt                          # terraform formatting
pnpm nx release plan                             # version plan
```

A change is done when `pnpm nx affected -t build test lint typecheck` and
`pnpm nx format:check` pass on every project it touched.

## What the layout hides

- `infra/repository` is the only Terraform root at bootstrap: it creates the
  GitHub repository and the shared infrastructure, applied once by the
  maintainers rather than by CI.
- `.github/workflows/validate.yaml` delegates to the DX reusable
  `validate-v2.yaml`, which formats, lints, scans and plans the affected
  projects: the local targets above reproduce what it runs.
- `.github/copilot/settings.json` enables the PagoPA DX plugins.
- `.github/workflows/copilot-setup-steps.yml` runs before the Copilot coding
  agent starts: it installs the mise toolchain, authenticates pnpm to GitHub
  Packages and installs the dependencies. The workflow token reads the public
  packages, so there is no secret to configure; a private dependency would need
  this repository granted under **Manage Actions access**, or a token stored as
  a secret.

## Conventions

Before a commit, a pull request or a branch, use the `github-conventions` skill
from the `project-management@pagopa-dx` plugin that
`.github/copilot/settings.json` enables.

Every user-facing change ships a version plan file: `pnpm nx release plan`
writes it under `.nx/version-plans/`.

## Further reading

- DX documentation: https://dx.pagopa.it/docs/

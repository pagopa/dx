---
id: dx-cli
title: Using the DX CLI
sidebar_position: 3
description: Documentation for @pagopa/dx-cli commands and usage.
---

The `@pagopa/dx-cli` is a command-line tool that helps teams implement PagoPA
DevEx guidelines consistently and evolve repositories safely.

## Installation

You can invoke the CLI directly via `npx` without installing globally:

```bash
npx @pagopa/dx-cli --help
```

When installed locally in a monorepo you can also run:

```bash
pnpm dx --help
```

> The binary name is `dx`.

---

## Usage

### `doctor` – Repository Validation

Validate your repository against DevEx guidelines. Typical checks include:

- Presence and correctness of pre-commit configuration.
- `turbo.json` configuration sanity.
- Required monorepo scripts in `package.json`.
- Workspace declaration and structure.

Run the command:

```bash
npx @pagopa/dx-cli doctor
```

Exit code: `0` if all checks pass, `1` if one or more checks fail.

Example output:

```text
✔ pre-commit configuration ok
✔ turbo configuration ok
✖ monorepo scripts missing: build, test
```

### `codemod` – Repository Migrations

Codemods are scripted migrations that modify repository files to align with
evolving platform standards. They aim to be safe, incremental, and repeatable.

#### List Available Codemods

```bash
npx @pagopa/dx-cli codemod list
```

You will get a brief list of migration identifiers. Use one of them with
`codemod apply`.

##### Current Codemods

| identifier           | description                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `use-pnpm`           | Migrate the project to use pnpm (lockfile import, workspace rewriting, workflow updates). |
| `use-azure-appsvc`   | Modernize legacy deploy workflows to the unified release-azure-appsvc reusable workflow.  |
| `update-code-review` | Update js_code_review workflow reference to latest commit with required permissions.      |

#### Apply a Codemod

```bash
npx @pagopa/dx-cli codemod apply <id>
```

Arguments:

- `<id>`: The codemod identifier from the list output.

:::warning[Safety & Best Practices]

- Always run codemods on a clean working tree (commit or stash your changes
  first).
- Review the diff after applying a codemod (`git diff`).
- Run `pnpm install` (if package manager changed) and project validation scripts
  afterward.

:::

---

## Feedback

Found an issue or need a new codemod? Open an issue in the
[pagopa/dx](https://github.com/pagopa/dx) repository describing the use case.
